import { Component, computed, signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonCard,
  IonFab,
  IonFabButton,
  IonButton,
  IonRouterLink,
} from '@ionic/angular';
import { Comida, TIPOS_COMIDA, TipoComida } from '../../models/comida.model';
import {
  PlanSemanal,
  DiaSemana,
  DIAS_LABEL,
  ComidaDelDia,
  semanaDesde,
} from '../../models/plan-semanal.model';
import { ComidaConfirmada, RegistroComidas } from '../../models/historial.model';
import { ProductoNevera } from '../../models/producto-nevera.model';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { AjustesService } from '../../services/ajustes.service';
import { HoyService } from '../../services/hoy.service';
import { diaYMes, sumarDias } from '../../utils/fecha';
import { normalizarTexto } from '../../utils/texto';
import { sortearDias } from '../../utils/sorteo';
import { planSemanalVacio } from '../../data/seed.data';
import { SeleccionarComidaModal } from './seleccionar-comida.modal';
import { injectAbrirModal } from '../../shared/abrir-modal';

const TIPO_LABEL: Record<TipoComida, string> = { desayuno: 'Desayuno', cena: 'Cena' };
const TIPO_ICONO: Record<TipoComida, { icono: string; tono: string }> = {
  desayuno: { icono: 'sunny-outline', tono: 'tono-desayuno' },
  cena: { icono: 'moon-outline', tono: 'tono-cena' },
};

/** El desayuno o la cena de una tarjeta. */
interface ComidaVista {
  tipo: TipoComida;
  comida?: ComidaConfirmada;
  confirmado: boolean;
  falta: string[]; // ingredientes de Mercado que no están en la nevera
}

/** Una tarjeta de la semana: una fecha, con lo planificado y lo confirmado para ese día. */
interface DiaVista {
  fecha: string;
  dia: DiaSemana;
  numero: number; // día del mes
  corto: string; // Lun, Mar…
  titulo: string; // Hoy, Mañana o el día de la semana
  subtitulo: string; // la fecha
  esHoy: boolean;
  comidas: ComidaVista[];
  vacio: boolean;
  confirmado: boolean;
}

@Component({
  selector: 'app-semana',
  templateUrl: 'semana.page.html',
  styleUrls: ['semana.page.scss'],
  imports: [
    IonContent,
    IonIcon,
    IonCard,
    IonFab,
    IonFabButton,
    IonButton,
    RouterLink,
    IonRouterLink,
  ],
})
export class SemanaPage {
  private storage = inject(StorageService);
  private alert = inject(AlertService);
  private abrirModal = injectAbrirModal();
  private ajustes = inject(AjustesService);

  plan = signal<PlanSemanal>(planSemanalVacio());
  comidas = signal<Comida[]>([]);
  private nevera = signal<ProductoNevera[]>([]);
  private idsMercado = signal(new Set<string>());
  // Lo confirmado en las fechas que están en pantalla (historial), por fecha
  confirmadas = signal(new Map<string, RegistroComidas>());
  private hoyService = inject(HoyService);
  hoy = this.hoyService.hoy;
  // La semana empieza hoy y cada tarjeta es una fecha. El plan dice qué comida toca ese día
  // de la semana (y se repite cada semana); lo confirmado se guarda por fecha, así la
  // confirmación de este lunes queda en el historial y no pasa al lunes siguiente.
  // El plan guarda ids y las comidas se buscan en "Mis Comidas": si una se edita se ve el
  // nombre nuevo, y si se borra el día queda sin asignar.
  semana = computed<DiaVista[]>(() => {
    const plan = this.plan();
    const confirmadas = this.confirmadas();
    const porId = new Map(this.comidas().map((c) => [c.id, c]));
    // Un ingrediente está si hay en la nevera algo que salió de su producto de Mercado o, si se
    // agregó a mano en la nevera, que se llame igual. Los ingredientes sin enlazar no cuentan, ni
    // los de un producto que se borró de Mercado: ya no se pueden comprar desde la lista.
    const nevera = this.nevera();
    const idsMercado = this.idsMercado();
    const idsEnNevera = new Set(nevera.map((p) => p.itemMercadoId));
    const nombresEnNevera = new Set(nevera.map((p) => normalizarTexto(p.nombre)));
    // Sin lo que va entre paréntesis ("Aguacates (verdes)" → "Aguacates"): caben más en la línea
    const faltan = (comida?: ComidaConfirmada): string[] =>
      (porId.get(comida?.id ?? '')?.ingredientes ?? [])
        .filter(
          (i) =>
            !!i.itemMercadoId &&
            idsMercado.has(i.itemMercadoId) &&
            !idsEnNevera.has(i.itemMercadoId) &&
            !nombresEnNevera.has(normalizarTexto(i.nombre)),
        )
        .map((i) => i.nombre.replace(/\s*\(.*?\)/g, '').trim());
    return semanaDesde(this.hoy()).map(({ fecha, dia }, i) => {
      const registro = confirmadas.get(fecha);
      const comidas = TIPOS_COMIDA.map((tipo): ComidaVista => {
        // Lo confirmado para esa fecha manda sobre lo planificado
        const confirmada = registro?.[tipo];
        const id = plan[dia][`${tipo}Id` as const];
        const comida = confirmada ? (porId.get(confirmada.id) ?? confirmada) : id ? porId.get(id) : undefined;
        return { tipo, comida, confirmado: !!confirmada, falta: faltan(comida) };
      });
      const asignadas = comidas.filter((c) => c.comida);
      return {
        fecha,
        dia,
        numero: Number(fecha.slice(8)),
        corto: DIAS_LABEL[dia].slice(0, 3),
        titulo: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DIAS_LABEL[dia],
        subtitulo: i < 2 ? `${DIAS_LABEL[dia]}, ${diaYMes(fecha)}` : diaYMes(fecha),
        esHoy: i === 0,
        comidas,
        vacio: asignadas.length === 0,
        // Confirmado: tiene alguna comida y todas las que tiene están confirmadas
        confirmado: asignadas.length > 0 && asignadas.every((c) => c.confirmado),
      };
    });
  });
  diasLabel = DIAS_LABEL;
  tipoLabel = TIPO_LABEL;
  tipoIcono = TIPO_ICONO;

  constructor() {
    // Si cambia el día, la semana tiene otras fechas: se carga lo confirmado en ellas
    this.hoyService.cambioDeDia.pipe(takeUntilDestroyed()).subscribe(() => void this.cargar());
  }

  // Ionic lo llama también al entrar la primera vez: no hace falta cargar en ngOnInit
  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    const hoy = this.hoy();
    const [plan, comidas, confirmadas, hayPlanGuardado, nevera, mercado] = await Promise.all([
      this.storage.getPlan(),
      this.storage.getComidas(),
      this.storage.getComidasConfirmadas(hoy, sumarDias(hoy, 6)),
      this.storage.hayPlanGuardado(),
      this.storage.getNevera(),
      this.storage.getMercado(),
    ]);
    this.plan.set(plan);
    this.comidas.set(comidas);
    this.nevera.set(nevera);
    this.idsMercado.set(new Set(mercado.map((i) => i.id)));
    this.confirmadas.set(new Map(confirmadas.map((r) => [r.fecha, r])));

    // Solo la primera vez (aún no hay plan guardado) se genera una semana aleatoria:
    // si después se quitan todas las comidas, la semana se queda vacía
    if (!hayPlanGuardado && comidas.length > 0) {
      await this.generarSemanaAleatoria();
    }
  }

  /** Lleva a la tarjeta del día (desde la tira de arriba). */
  irADia(fecha: string): void {
    document.getElementById(`dia-${fecha}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Sin comidas de ese tipo el selector se abre igual: desde ahí se puede crear una. */
  async asignarComida(d: DiaVista, { tipo, comida: anterior, confirmado }: ComidaVista): Promise<void> {
    const { data, role } = await this.abrirModal<Comida | null>(SeleccionarComidaModal, {
      titulo: `${TIPO_LABEL[tipo]} · ${DIAS_LABEL[d.dia]}`,
      tipo,
      comidas: this.comidas().filter((c) => c.tipo === tipo),
      seleccionadaId: anterior?.id ?? null,
    });
    if (role === 'quitar') {
      await this.quitarComida(d, tipo, anterior);
      return;
    }
    if (!data) return;
    // Recién creada en el selector: aún no está en la lista de la semana, y sus ingredientes
    // están en Mercado (se eligieron de ahí o se crearon con ella)
    if (!this.comidas().some((c) => c.id === data.id)) {
      this.comidas.update((comidas) => [...comidas, data]);
      this.idsMercado.update((ids) => new Set([...ids, ...data.ingredientes.flatMap((i) => i.itemMercadoId ?? [])]));
    }

    const restaurar = this.estadoActual(d, tipo);
    await this.guardarPlan(d.dia, tipo, data.id);

    // Si ese día tenía otra comida confirmada, la nueva queda pendiente de confirmar
    if (confirmado && anterior?.id !== data.id) {
      await this.guardarConfirmacion(d.fecha, tipo, undefined);
    }

    // Solo al cambiar una comida por otra: asignar un espacio vacío se deshace con "Quitar"
    if (!anterior || anterior.id === data.id) return;
    const deshacer = await this.alert.toast(data.nombre, {
      header: `${TIPO_LABEL[tipo]} ${tipo === 'desayuno' ? 'cambiado' : 'cambiada'}`,
      deshacer: true,
    });
    if (deshacer) await restaurar();
  }

  /** Deja el desayuno o la cena de ese día sin asignar (y sin confirmar), con opción de deshacer. */
  private async quitarComida(d: DiaVista, tipo: TipoComida, comida: ComidaConfirmada | undefined): Promise<void> {
    if (!comida) return;
    const restaurar = this.estadoActual(d, tipo);
    await this.guardarPlan(d.dia, tipo, undefined);
    if (this.confirmadas().get(d.fecha)?.[tipo]) await this.guardarConfirmacion(d.fecha, tipo, undefined);

    const deshacer = await this.alert.toast(comida.nombre, {
      tipo: 'eliminado',
      header: `${TIPO_LABEL[tipo]} ${tipo === 'desayuno' ? 'quitado' : 'quitada'}`,
      deshacer: true,
    });
    if (deshacer) await restaurar();
  }

  /**
   * Guarda cómo está ahora el desayuno o la cena de ese día (lo planificado y lo confirmado) y
   * devuelve una función que lo deja otra vez así: es el "Deshacer" de cambiar y quitar.
   */
  private estadoActual(d: DiaVista, tipo: TipoComida): () => Promise<void> {
    const planAntes = this.plan()[d.dia][`${tipo}Id` as const];
    const confirmadaAntes = this.confirmadas().get(d.fecha)?.[tipo];
    return async () => {
      await this.guardarPlan(d.dia, tipo, planAntes);
      await this.guardarConfirmacion(d.fecha, tipo, confirmadaAntes);
    };
  }

  /** Asigna (con el id) o deja sin asignar (sin él) el desayuno o la cena de un día de la semana. */
  private async guardarPlan(dia: DiaSemana, tipo: TipoComida, id: string | undefined): Promise<void> {
    const comidaDia: ComidaDelDia = { ...this.plan()[dia] };
    if (id) {
      comidaDia[`${tipo}Id` as const] = id;
    } else {
      delete comidaDia[`${tipo}Id` as const];
    }
    const nuevoPlan = { ...this.plan(), [dia]: comidaDia };
    this.plan.set(nuevoPlan);
    await this.storage.putPlan(nuevoPlan);
  }

  async toggleConfirmar(d: DiaVista, { tipo, comida, confirmado: estaba }: ComidaVista): Promise<void> {
    if (!comida) return;
    const confirmado = !estaba;
    const antes = this.confirmadas().get(d.fecha)?.[tipo];
    await this.guardarConfirmacion(d.fecha, tipo, confirmado ? { id: comida.id, nombre: comida.nombre } : undefined);

    const deshacer = await this.alert.toast(
      confirmado
        ? `${TIPO_LABEL[tipo]} ${tipo === 'desayuno' ? 'confirmado' : 'confirmada'}`
        : `${TIPO_LABEL[tipo]} aún pendiente`,
      { tipo: confirmado ? 'ok' : 'pendiente', deshacer: true },
    );
    if (deshacer) await this.guardarConfirmacion(d.fecha, tipo, antes);
  }

  /** Confirma (con la comida) o deja pendiente (sin ella) el desayuno o la cena de una fecha. */
  private async guardarConfirmacion(fecha: string, tipo: TipoComida, comida: ComidaConfirmada | undefined): Promise<void> {
    const registro: RegistroComidas = { ...this.confirmadas().get(fecha), fecha };
    if (comida) {
      registro[tipo] = comida;
    } else {
      delete registro[tipo];
    }
    this.confirmadas.set(new Map(this.confirmadas()).set(fecha, registro));
    await this.storage.saveComidasConfirmadas(registro);
  }

  /** Botón de sortear: genera la semana al azar con opción de volver al plan anterior. */
  async sortearSemana(): Promise<void> {
    this.ajustes.vibrar();
    const planAntes = this.plan();
    if (!(await this.generarSemanaAleatoria())) return;
    const deshacer = await this.alert.toast('Semana generada al azar', { deshacer: true });
    if (!deshacer) return;
    this.plan.set(planAntes);
    await this.storage.putPlan(planAntes);
  }

  /** Devuelve false si no había comidas para generarla. */
  private async generarSemanaAleatoria(): Promise<boolean> {
    const desayunos = this.comidas().filter((c) => c.tipo === 'desayuno');
    const cenas = this.comidas().filter((c) => c.tipo === 'cena');
    if (desayunos.length === 0 && cenas.length === 0) {
      await this.alert.aviso('No hay comidas', 'Agrega comidas en la pestaña Comidas.');
      return false;
    }
    const semana = this.semana();
    // Lo ya confirmado se mantiene
    const confirmadas = (tipo: TipoComida) =>
      semana.map((d) => d.comidas.find((c) => c.tipo === tipo && c.confirmado)?.comida?.id);
    const desayunoIds = sortearDias(desayunos.map((c) => c.id), confirmadas('desayuno'));
    const cenaIds = sortearDias(cenas.map((c) => c.id), confirmadas('cena'));
    const nuevoPlan = planSemanalVacio();
    semana.forEach((d, i) => {
      const comidaDia: ComidaDelDia = {};
      if (desayunoIds[i]) comidaDia.desayunoId = desayunoIds[i];
      if (cenaIds[i]) comidaDia.cenaId = cenaIds[i];
      nuevoPlan[d.dia] = comidaDia;
    });
    this.plan.set(nuevoPlan);
    await this.storage.putPlan(nuevoPlan);
    return true;
  }
}
