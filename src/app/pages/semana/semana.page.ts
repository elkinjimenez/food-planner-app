import { Component, HostListener, OnInit, computed, signal, inject } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonCard,
  IonFab,
  IonFabButton,
  ModalController,
  ToastController,
  IonButton,
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
import { diaSemanaHoy } from '../../utils/fecha';
import { planSemanalVacio } from '../../data/seed.data';
import { SeleccionarComidaModal } from './seleccionar-comida.modal';
import { RespaldoBotonComponent } from '../../shared/respaldo-boton.component';

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
  hoy = signal<DiaSemana>(this.calcularHoy());
  // La semana se muestra empezando por el día de hoy
  dias = computed(() => {
    const indice = DIAS_SEMANA.indexOf(this.hoy());
    return [...DIAS_SEMANA.slice(indice), ...DIAS_SEMANA.slice(0, indice)];
  });
  // Lo que muestra cada tarjeta. El plan guarda ids y las comidas se buscan en "Mis Comidas":
  // si una se edita se ve el nombre nuevo, y si se borra el día queda sin asignar.
  semana = computed(() => {
    const plan = this.plan();
    const porId = new Map(this.comidas().map((c) => [c.id, c]));
    return this.dias().map((dia) => {
      const desayuno = plan[dia].desayunoId ? porId.get(plan[dia].desayunoId) : undefined;
      const cena = plan[dia].cenaId ? porId.get(plan[dia].cenaId) : undefined;
      const desayunoConfirmado = !!desayuno && !!plan[dia].desayunoConfirmado;
      const cenaConfirmado = !!cena && !!plan[dia].cenaConfirmado;
      return {
        dia,
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
    this.hoy.set(this.calcularHoy());
    await this.cargar();
  }

  // En iOS la PWA se reanuda sin recargarse: al volver a la app el día pudo haber cambiado
  @HostListener('document:visibilitychange')
  alVolverALaApp(): void {
    if (document.visibilityState === 'visible') {
      this.hoy.set(this.calcularHoy());
    }
  }

  private async cargar(): Promise<void> {
    const [plan, comidas] = await Promise.all([this.storage.getPlan(), this.storage.getComidas()]);
    this.plan.set(plan);
    this.comidas.set(comidas);

    // Si no hay nada planificado y hay comidas disponibles, generar semana aleatoria
    const tieneAlgo = this.semana().some((d) => d.desayuno || d.cena);
    if (!tieneAlgo && comidas.length > 0) {
      await this.generarSemanaAleatoria();
    }
  }

  diaNumero(dia: DiaSemana): number {
    return DIAS_SEMANA.indexOf(dia) + 1;
  }

  private calcularHoy(): DiaSemana {
    const d = diaSemanaHoy(); // 0=domingo, 1=lunes, ..., 6=sabado
    return DIAS_SEMANA[d === 0 ? 6 : d - 1];
  }

  async asignarComida(dia: DiaSemana, tipo: 'desayuno' | 'cena'): Promise<void> {
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
        seleccionadaId: this.plan()[dia][tipo === 'desayuno' ? 'desayunoId' : 'cenaId'] ?? null,
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
      showBackdrop: false,
      cssClass: 'card-modal-dark',
    });
    await modal.present();

    const { data } = await modal.onWillDismiss<Comida | null>();
    if (!data) return;

    const nuevoPlan = { ...this.plan() };
    const keyId = tipo === 'desayuno' ? 'desayunoId' : 'cenaId';
    const keyConfirmado = tipo === 'desayuno' ? 'desayunoConfirmado' : 'cenaConfirmado';
    nuevoPlan[dia] = { ...nuevoPlan[dia], [keyId]: data.id, [keyConfirmado]: false };
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
        comidaDia.desayunoConfirmado = true;
      } else if (desayunos.length > 0) {
        comidaDia.desayunoId = desayunos[Math.floor(Math.random() * desayunos.length)].id;
      }

      // Mantener cena si ya está confirmada
      if (d.cenaConfirmado) {
        comidaDia.cenaId = d.cena!.id;
        comidaDia.cenaConfirmado = true;
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
