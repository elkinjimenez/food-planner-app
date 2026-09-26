import { Component, HostListener, OnInit, computed, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonCard,
  IonFab,
  IonFabButton,
  ModalController,
  IonButton,
  IonRouterLink,
} from '@ionic/angular';
import { Comida, TipoComida } from '../../models/comida.model';
import {
  PlanSemanal,
  DiaSemana,
  DIAS_LABEL,
  ComidaDelDia,
  semanaDesde,
} from '../../models/plan-semanal.model';
import { ComidaConfirmada, RegistroComidas } from '../../models/historial.model';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { AppUpdateService } from '../../services/app-update.service';
import { fechaHoy, sumarDias } from '../../utils/fecha';
import { sortearDias } from '../../utils/sorteo';
import { planSemanalVacio } from '../../data/seed.data';
import { SeleccionarComidaModal } from './seleccionar-comida.modal';
import { RespaldoBotonComponent } from '../../shared/respaldo-boton.component';

const TIPO_LABEL: Record<TipoComida, string> = { desayuno: 'Desayuno', cena: 'Cena' };

/** Una tarjeta de la semana: una fecha, con lo planificado y lo confirmado para ese día. */
interface DiaVista {
  fecha: string;
  dia: DiaSemana;
  numero: number; // día del mes
  esHoy: boolean;
  desayuno?: ComidaConfirmada;
  cena?: ComidaConfirmada;
  desayunoConfirmado: boolean;
  cenaConfirmado: boolean;
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
    RespaldoBotonComponent,
  ],
})
export class SemanaPage implements OnInit {
  private storage = inject(StorageService);
  private alert = inject(AlertService);
  private modalCtrl = inject(ModalController);
  private appUpdate = inject(AppUpdateService);

  plan = signal<PlanSemanal>(planSemanalVacio());
  comidas = signal<Comida[]>([]);
  // Lo confirmado en las fechas que están en pantalla (historial), por fecha
  confirmadas = signal(new Map<string, RegistroComidas>());
  hoy = signal(fechaHoy());
  // La semana empieza hoy y cada tarjeta es una fecha. El plan dice qué comida toca ese día
  // de la semana (y se repite cada semana); lo confirmado se guarda por fecha, así la
  // confirmación de este lunes queda en el historial y no pasa al lunes siguiente.
  // El plan guarda ids y las comidas se buscan en "Mis Comidas": si una se edita se ve el
  // nombre nuevo, y si se borra el día queda sin asignar.
  semana = computed<DiaVista[]>(() => {
    const plan = this.plan();
    const confirmadas = this.confirmadas();
    const porId = new Map(this.comidas().map((c) => [c.id, c]));
    return semanaDesde(this.hoy()).map(({ fecha, dia }, i) => {
      const registro = confirmadas.get(fecha);
      // Lo confirmado para esa fecha manda sobre lo planificado
      const comidaDe = (tipo: TipoComida): ComidaConfirmada | undefined => {
        const confirmada = registro?.[tipo];
        if (confirmada) return porId.get(confirmada.id) ?? confirmada;
        const id = plan[dia][`${tipo}Id` as const];
        return id ? porId.get(id) : undefined;
      };
      const desayuno = comidaDe('desayuno');
      const cena = comidaDe('cena');
      const desayunoConfirmado = !!registro?.desayuno;
      const cenaConfirmado = !!registro?.cena;
      return {
        fecha,
        dia,
        numero: Number(fecha.slice(8)),
        esHoy: i === 0,
        desayuno,
        cena,
        desayunoConfirmado,
        cenaConfirmado,
        // Confirmado: tiene alguna comida y todas las que tiene están confirmadas
        confirmado: (!!desayuno || !!cena) && (!desayuno || desayunoConfirmado) && (!cena || cenaConfirmado),
      };
    });
  });
  diasLabel = DIAS_LABEL;

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  // En iOS la PWA se reanuda sin recargarse: al volver a la app el día pudo haber cambiado
  @HostListener('document:visibilitychange')
  async alVolverALaApp(): Promise<void> {
    if (document.visibilityState === 'visible') {
      await this.cargar();
    }
  }

  private async cargar(): Promise<void> {
    const hoy = fechaHoy();
    const [plan, comidas, confirmadas, hayPlanGuardado] = await Promise.all([
      this.storage.getPlan(),
      this.storage.getComidas(),
      this.storage.getComidasConfirmadas(hoy, sumarDias(hoy, 6)),
      this.storage.hayPlanGuardado(),
    ]);
    this.hoy.set(hoy);
    this.plan.set(plan);
    this.comidas.set(comidas);
    this.confirmadas.set(new Map(confirmadas.map((r) => [r.fecha, r])));

    // Solo la primera vez (aún no hay plan guardado) se genera una semana aleatoria:
    // si después se quitan todas las comidas, la semana se queda vacía
    if (!hayPlanGuardado && comidas.length > 0) {
      await this.generarSemanaAleatoria();
    }
  }

  async asignarComida(d: DiaVista, tipo: TipoComida): Promise<void> {
    const opciones = this.comidas().filter((c) => c.tipo === tipo);
    if (opciones.length === 0) {
      await this.alert.aviso('No hay comidas', `Agrega ${tipo}s en la pestaña Comidas.`);
      return;
    }

    const modal = await this.modalCtrl.create({
      component: SeleccionarComidaModal,
      componentProps: {
        titulo: `${TIPO_LABEL[tipo]} · ${DIAS_LABEL[d.dia]}`,
        comidas: opciones,
        seleccionadaId: d[tipo]?.id ?? null,
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss<Comida | null>();
    if (role === 'quitar') {
      await this.quitarComida(d, tipo);
      return;
    }
    if (!data) return;

    await this.guardarPlan(d.dia, tipo, data.id);

    // Si ese día tenía otra comida confirmada, la nueva queda pendiente de confirmar
    const confirmado = tipo === 'desayuno' ? d.desayunoConfirmado : d.cenaConfirmado;
    if (confirmado && d[tipo]?.id !== data.id) {
      await this.guardarConfirmacion(d.fecha, tipo, undefined);
    }
  }

  /** Deja el desayuno o la cena de ese día sin asignar (y sin confirmar), con opción de deshacer. */
  private async quitarComida(d: DiaVista, tipo: TipoComida): Promise<void> {
    const comida = d[tipo];
    if (!comida) return;
    const planAntes = this.plan()[d.dia][`${tipo}Id` as const];
    const confirmadaAntes = this.confirmadas().get(d.fecha)?.[tipo];
    await this.guardarPlan(d.dia, tipo, undefined);
    if (confirmadaAntes) await this.guardarConfirmacion(d.fecha, tipo, undefined);

    const deshacer = await this.alert.toast(comida.nombre, {
      tipo: 'eliminado',
      header: `${TIPO_LABEL[tipo]} ${tipo === 'desayuno' ? 'quitado' : 'quitada'}`,
      deshacer: true,
    });
    if (!deshacer) return;
    await this.guardarPlan(d.dia, tipo, planAntes);
    if (confirmadaAntes) await this.guardarConfirmacion(d.fecha, tipo, confirmadaAntes);
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

  async toggleConfirmar(d: DiaVista, tipo: TipoComida): Promise<void> {
    const comida = d[tipo];
    if (!comida) return;
    const confirmado = !(tipo === 'desayuno' ? d.desayunoConfirmado : d.cenaConfirmado);
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
    const desayunoIds = sortearDias(
      desayunos.map((c) => c.id),
      semana.map((d) => (d.desayunoConfirmado ? d.desayuno!.id : undefined)),
    );
    const cenaIds = sortearDias(
      cenas.map((c) => c.id),
      semana.map((d) => (d.cenaConfirmado ? d.cena!.id : undefined)),
    );
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

  async refresh(): Promise<void> {
    await this.appUpdate.actualizarYRecargar();
  }
}
