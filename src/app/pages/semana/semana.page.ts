import { Component, OnInit, signal } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonCard,
  IonFab,
  IonFabButton,
  ModalController,
  ToastController,
  IonButton,
  IonLabel,
} from '@ionic/angular';
import { Comida } from '../../models/comida.model';
import {
  PlanSemanal,
  DiaSemana,
  DIAS_SEMANA,
  DIAS_LABEL,
  ComidaDelDia,
} from '../../models/plan-semanal.model';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { AppUpdateService } from '../../services/app-update.service';
import { SeleccionarComidaModal } from './seleccionar-comida.modal';

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
  ],
})
export class SemanaPage implements OnInit {
  plan = signal<PlanSemanal>(this.planVacio());
  comidas = signal<Comida[]>([]);
  dias = this.ordenarDesdeHoy();
  diasLabel = DIAS_LABEL;

  constructor(
    private storage: StorageService,
    private alert: AlertService,
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private appUpdate: AppUpdateService,
  ) { }

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    const [plan, comidas] = await Promise.all([this.storage.getPlan(), this.storage.getComidas()]);
    this.plan.set(plan);
    this.comidas.set(comidas);

    // Si no hay nada planificado y hay comidas disponibles, generar semana aleatoria
    const tieneAlgo = this.dias.some((d) => plan[d]?.desayuno || plan[d]?.cena);
    if (!tieneAlgo && comidas.length > 0) {
      await this.generarSemanaAleatoria();
    }
  }

  private ordenarDesdeHoy(): DiaSemana[] {
    const hoy = new Date().getDay(); // 0=domingo, 1=lunes, ..., 6=sabado
    const indice = hoy === 0 ? 6 : hoy - 1; // mapear a 0=lunes, ..., 6=domingo
    return [...DIAS_SEMANA.slice(indice), ...DIAS_SEMANA.slice(0, indice)];
  }

  diaNumero(dia: DiaSemana): number {
    return DIAS_SEMANA.indexOf(dia) + 1;
  }

  hoy(): DiaSemana {
    const d = new Date().getDay(); // 0=domingo, 1=lunes, ..., 6=sabado
    return DIAS_SEMANA[d === 0 ? 6 : d - 1];
  }

  private planVacio(): PlanSemanal {
    return {
      lunes: {},
      martes: {},
      miercoles: {},
      jueves: {},
      viernes: {},
      sabado: {},
      domingo: {},
    };
  }

  async asignarComida(dia: DiaSemana, tipo: 'desayuno' | 'cena'): Promise<void> {
    const opciones = this.comidas().filter((c) => c.tipo === tipo);
    if (opciones.length === 0) {
      await this.alert.confirm('No hay comidas', `Agrega ${tipo}s en la pestaña Comidas.`);
      return;
    }

    const modal = await this.modalCtrl.create({
      component: SeleccionarComidaModal,
      componentProps: {
        titulo: `Elegir ${tipo}`,
        comidas: opciones,
        seleccionadaId: this.plan()[dia][tipo]?.id ?? null,
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
      showBackdrop: false,
      cssClass: 'card-modal-dark',
    });
    await modal.present();

    const { data } = await modal.onWillDismiss<Comida | null>();
    if (!data) return;

    const nuevoPlan = { ...this.plan() };
    const keyConfirmado = tipo === 'desayuno' ? 'desayunoConfirmado' : 'cenaConfirmado';
    nuevoPlan[dia] = { ...nuevoPlan[dia], [tipo]: data, [keyConfirmado]: false };
    this.plan.set(nuevoPlan);
    await this.storage.putPlan(nuevoPlan);
  }

  async toggleConfirmar(dia: DiaSemana, tipo: 'desayuno' | 'cena'): Promise<void> {
    const keyConfirmado = tipo === 'desayuno' ? 'desayunoConfirmado' : 'cenaConfirmado';
    const nuevoPlan = { ...this.plan() };
    nuevoPlan[dia] = { ...nuevoPlan[dia], [keyConfirmado]: !nuevoPlan[dia][keyConfirmado] };
    this.plan.set(nuevoPlan);
    await this.storage.putPlan(nuevoPlan);

    const confirmado = nuevoPlan[dia][keyConfirmado];
    const comida = nuevoPlan[dia][tipo];
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

  diaConfirmado(dia: DiaSemana): boolean {
    const p = this.plan()[dia];
    const tieneComidas = !!p.desayuno || !!p.cena;
    const desayunoOk = !p.desayuno || !!p.desayunoConfirmado;
    const cenaOk = !p.cena || !!p.cenaConfirmado;
    return tieneComidas && desayunoOk && cenaOk;
  }

  async generarSemanaAleatoria(): Promise<void> {
    const desayunos = this.comidas().filter((c) => c.tipo === 'desayuno');
    const cenas = this.comidas().filter((c) => c.tipo === 'cena');
    if (desayunos.length === 0 && cenas.length === 0) {
      await this.alert.confirm('No hay comidas', 'Agrega comidas en la pestaña Comidas.');
      return;
    }
    const planActual = this.plan();
    const nuevoPlan = this.planVacio();
    for (const dia of this.dias) {
      const comidaDia: ComidaDelDia = {};

      // Mantener desayuno si ya está confirmado
      if (planActual[dia].desayunoConfirmado && planActual[dia].desayuno) {
        comidaDia.desayuno = planActual[dia].desayuno;
        comidaDia.desayunoConfirmado = true;
      } else if (desayunos.length > 0) {
        comidaDia.desayuno = desayunos[Math.floor(Math.random() * desayunos.length)];
      }

      // Mantener cena si ya está confirmada
      if (planActual[dia].cenaConfirmado && planActual[dia].cena) {
        comidaDia.cena = planActual[dia].cena;
        comidaDia.cenaConfirmado = true;
      } else if (cenas.length > 0) {
        comidaDia.cena = cenas[Math.floor(Math.random() * cenas.length)];
      }

      nuevoPlan[dia] = comidaDia;
    }
    this.plan.set(nuevoPlan);
    await this.storage.putPlan(nuevoPlan);
  }

  async refresh(): Promise<void> {
    await this.appUpdate.actualizarYRecargar();
  }
}
