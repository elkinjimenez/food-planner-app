import { Component, HostListener, OnInit, computed, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonCard,
  IonFab,
  IonFabButton,
  ModalController,
  ToastController,
  IonButton,
  IonRouterLink,
} from '@ionic/angular';
import { Comida, TipoComida } from '../../models/comida.model';
import {
  PlanSemanal,
  DiaSemana,
  DIAS_SEMANA,
  DIAS_LABEL,
  ComidaDelDia,
  semanaDesde,
} from '../../models/plan-semanal.model';
import { ComidaConfirmada, RegistroComidas } from '../../models/historial.model';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { AppUpdateService } from '../../services/app-update.service';
import { fechaHoy, sumarDias } from '../../utils/fecha';
import { planSemanalVacio } from '../../data/seed.data';
import { SeleccionarComidaModal } from './seleccionar-comida.modal';
import { RespaldoBotonComponent } from '../../shared/respaldo-boton.component';

/** Una tarjeta de la semana: una fecha, con lo planificado y lo confirmado para ese día. */
interface DiaVista {
  fecha: string;
  dia: DiaSemana;
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
  private toastCtrl = inject(ToastController);
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
    const [plan, comidas, confirmadas] = await Promise.all([
      this.storage.getPlan(),
      this.storage.getComidas(),
      this.storage.getComidasConfirmadas(hoy, sumarDias(hoy, 6)),
    ]);
    this.hoy.set(hoy);
    this.plan.set(plan);
    this.comidas.set(comidas);
    this.confirmadas.set(new Map(confirmadas.map((r) => [r.fecha, r])));

    // Si no hay nada planificado y hay comidas disponibles, generar semana aleatoria
    const tieneAlgo = this.semana().some((d) => d.desayuno || d.cena);
    if (!tieneAlgo && comidas.length > 0) {
      await this.generarSemanaAleatoria();
    }
  }

  diaNumero(dia: DiaSemana): number {
    return DIAS_SEMANA.indexOf(dia) + 1;
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
        titulo: `Elegir ${tipo}`,
        comidas: opciones,
        seleccionadaId: d[tipo]?.id ?? null,
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
      showBackdrop: false,
      cssClass: 'card-modal-dark',
    });
    await modal.present();

    const { data } = await modal.onWillDismiss<Comida | null>();
    if (!data) return;

    const nuevoPlan = { ...this.plan() };
    nuevoPlan[d.dia] = { ...nuevoPlan[d.dia], [`${tipo}Id` as const]: data.id };
    this.plan.set(nuevoPlan);
    await this.storage.putPlan(nuevoPlan);

    // Si ese día tenía otra comida confirmada, la nueva queda pendiente de confirmar
    const confirmado = tipo === 'desayuno' ? d.desayunoConfirmado : d.cenaConfirmado;
    if (confirmado && d[tipo]?.id !== data.id) {
      await this.guardarConfirmacion(d.fecha, tipo, undefined);
    }
  }

  async toggleConfirmar(d: DiaVista, tipo: TipoComida): Promise<void> {
    const comida = d[tipo];
    if (!comida) return;
    const confirmado = !(tipo === 'desayuno' ? d.desayunoConfirmado : d.cenaConfirmado);
    await this.guardarConfirmacion(d.fecha, tipo, confirmado ? { id: comida.id, nombre: comida.nombre } : undefined);

    const toast = await this.toastCtrl.create({
      message: confirmado
        ? `${tipo.charAt(0).toUpperCase()}${tipo.slice(1)} ${tipo == 'desayuno' ? 'confirmado' : 'confirmada'}`
        : `${tipo.charAt(0).toUpperCase()}${tipo.slice(1)} aún pendiente`,
      duration: 1800,
      position: 'top',
      icon: confirmado ? 'checkmark-circle' : 'time-outline',
      cssClass: ['toast-confirmacion', confirmado ? 'toast-ok' : 'toast-pendiente'],
    });
    await toast.present();
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

  async generarSemanaAleatoria(): Promise<void> {
    const desayunos = this.comidas().filter((c) => c.tipo === 'desayuno');
    const cenas = this.comidas().filter((c) => c.tipo === 'cena');
    if (desayunos.length === 0 && cenas.length === 0) {
      await this.alert.aviso('No hay comidas', 'Agrega comidas en la pestaña Comidas.');
      return;
    }
    const nuevoPlan = planSemanalVacio();
    for (const d of this.semana()) {
      const comidaDia: ComidaDelDia = {};

      // Mantener desayuno si ya está confirmado
      if (d.desayunoConfirmado) {
        comidaDia.desayunoId = d.desayuno!.id;
      } else if (desayunos.length > 0) {
        comidaDia.desayunoId = desayunos[Math.floor(Math.random() * desayunos.length)].id;
      }

      // Mantener cena si ya está confirmada
      if (d.cenaConfirmado) {
        comidaDia.cenaId = d.cena!.id;
      } else if (cenas.length > 0) {
        comidaDia.cenaId = cenas[Math.floor(Math.random() * cenas.length)].id;
      }

      nuevoPlan[d.dia] = comidaDia;
    }
    this.plan.set(nuevoPlan);
    await this.storage.putPlan(nuevoPlan);
  }

  async refresh(): Promise<void> {
    await this.appUpdate.actualizarYRecargar();
  }
}
