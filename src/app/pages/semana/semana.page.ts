import { Component, OnInit, signal } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  IonCard,
  IonFab,
  IonFabButton,
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

@Component({
  selector: 'app-semana',
  templateUrl: 'semana.page.html',
  styleUrls: ['semana.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
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
  dias = DIAS_SEMANA;
  diasLabel = DIAS_LABEL;

  constructor(
    private storage: StorageService,
    private alert: AlertService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    const [plan, comidas] = await Promise.all([this.storage.getPlan(), this.storage.getComidas()]);
    this.plan.set(plan);
    this.comidas.set(comidas);
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
    const seleccion = await this.alert.selectFromList(
      `Elegir ${tipo}`,
      opciones.map((o) => ({ text: o.nombre, value: o.id })),
    );
    if (!seleccion) return;
    const comida = opciones.find((c) => c.id === seleccion)!;
    const nuevoPlan = { ...this.plan() };
    nuevoPlan[dia] = { ...nuevoPlan[dia], [tipo]: comida };
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
