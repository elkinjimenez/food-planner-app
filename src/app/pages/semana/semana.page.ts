import { Component, OnInit, signal } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonCard,
  IonFab,
  IonFabButton,
  ModalController,
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
  ) {}

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
    nuevoPlan[dia] = { ...nuevoPlan[dia], [tipo]: data };
    this.plan.set(nuevoPlan);
    await this.storage.putPlan(nuevoPlan);
  }

  async generarSemanaAleatoria(): Promise<void> {
    const desayunos = this.comidas().filter((c) => c.tipo === 'desayuno');
    const cenas = this.comidas().filter((c) => c.tipo === 'cena');
    if (desayunos.length === 0 && cenas.length === 0) {
      await this.alert.confirm('No hay comidas', 'Agrega comidas en la pestaña Comidas.');
      return;
    }
    const nuevoPlan = this.planVacio();
    for (const dia of this.dias) {
      const comidaDia: ComidaDelDia = {};
      if (desayunos.length > 0) {
        comidaDia.desayuno = desayunos[Math.floor(Math.random() * desayunos.length)];
      }
      if (cenas.length > 0) {
        comidaDia.cena = cenas[Math.floor(Math.random() * cenas.length)];
      }
      nuevoPlan[dia] = comidaDia;
    }
    this.plan.set(nuevoPlan);
    await this.storage.putPlan(nuevoPlan);
  }
}
