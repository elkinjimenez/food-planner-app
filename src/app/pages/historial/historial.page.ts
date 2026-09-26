import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { IonBackButton, IonButton, IonCard, IonContent, IonIcon, IonLabel } from '@ionic/angular';
import { Comida, TipoComida } from '../../models/comida.model';
import { DIAS_LABEL, DIAS_SEMANA, diaSemanaDe } from '../../models/plan-semanal.model';
import { ComidaConfirmada, META_VASOS, RegistroAgua, RegistroComidas } from '../../models/historial.model';
import { StorageService } from '../../services/storage.service';
import { HoyService } from '../../services/hoy.service';
import { FechaPipe } from '../../shared/fecha.pipe';
import {
  casillasDelMes,
  finDeMes,
  formatearFecha,
  inicioDeMes,
  nombreMes,
  sumarDias,
  sumarMeses,
} from '../../utils/fecha';

/** Lo que se muestra de un día en el calendario y en su detalle. */
interface DiaHistorial {
  fecha: string;
  numero: number; // día del mes
  desayuno?: string; // nombre de la comida confirmada
  cena?: string;
  vasos: number;
  meta: number; // la meta de agua de ese día
}

interface ComidaFrecuente {
  id: string;
  nombre: string;
  tipo: TipoComida;
  veces: number;
}

const TIPOS_COMIDA: TipoComida[] = ['desayuno', 'cena'];

@Component({
  selector: 'app-historial',
  templateUrl: 'historial.page.html',
  styleUrls: ['historial.page.scss'],
  imports: [IonContent, IonCard, IonButton, IonIcon, IonLabel, IonBackButton, FechaPipe],
})
export class HistorialPage implements OnInit {
  private storage = inject(StorageService);

  readonly diasSemana = DIAS_SEMANA.map((d) => DIAS_LABEL[d].slice(0, 2)); // Lu, Ma, Mi…

  hoy = inject(HoyService).hoy;
  mes = signal(inicioDeMes(this.hoy())); // primer día del mes en pantalla
  seleccionada = signal(this.hoy());
  private confirmadas = signal(new Map<string, RegistroComidas>());
  private agua = signal(new Map<string, RegistroAgua>());
  private comidas = signal(new Map<string, Comida>());

  titulo = computed(() => nombreMes(this.mes()));
  // Lo confirmado llega hasta el último día que muestra Semana, que puede caer el mes siguiente
  haySiguiente = computed(() => this.mes() < inicioDeMes(sumarDias(this.hoy(), 6)));
  casillas = computed(() => casillasDelMes(this.mes()).map((fecha) => (fecha ? this.dia(fecha) : null)));
  detalle = computed(() => this.dia(this.seleccionada()));
  detalleTitulo = computed(() => {
    const fecha = this.seleccionada();
    return `${DIAS_LABEL[diaSemanaDe(fecha)]} ${formatearFecha(fecha)}`;
  });
  resumen = computed(() => {
    const dias = this.casillas().filter((d): d is DiaHistorial => !!d && d.fecha <= this.hoy());
    return {
      desayunos: dias.filter((d) => d.desayuno).length,
      cenas: dias.filter((d) => d.cena).length,
      metaAgua: dias.filter((d) => d.vasos >= d.meta).length,
    };
  });
  // Las 5 comidas confirmadas más veces en el mes (hasta hoy, como el resumen)
  masFrecuentes = computed<ComidaFrecuente[]>(() => {
    const conteo = new Map<string, ComidaFrecuente>();
    for (const registro of this.confirmadas().values()) {
      if (registro.fecha > this.hoy()) continue;
      for (const tipo of TIPOS_COMIDA) {
        const comida = registro[tipo];
        if (!comida) continue;
        const frecuente = conteo.get(comida.id) ?? { id: comida.id, nombre: this.nombre(comida), tipo, veces: 0 };
        frecuente.veces++;
        conteo.set(comida.id, frecuente);
      }
    }
    return [...conteo.values()].sort((a, b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre)).slice(0, 5);
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cambiarMes(meses: number): Promise<void> {
    const mes = sumarMeses(this.mes(), meses);
    const hoy = this.hoy();
    this.mes.set(mes);
    // Queda elegido hoy si está en ese mes; si no, el día del mes más cercano a hoy
    this.seleccionada.set(mes === inicioDeMes(hoy) ? hoy : mes < hoy ? finDeMes(mes) : mes);
    await this.cargar();
  }

  /** Vuelve al mes actual con hoy elegido. */
  async irAHoy(): Promise<void> {
    const mes = inicioDeMes(this.hoy());
    const cambiaMes = mes !== this.mes();
    this.mes.set(mes);
    this.seleccionada.set(this.hoy());
    if (cambiaMes) await this.cargar();
  }

  private async cargar(): Promise<void> {
    const desde = this.mes();
    const hasta = finDeMes(desde);
    const [confirmadas, agua, comidas] = await Promise.all([
      this.storage.getComidasConfirmadas(desde, hasta),
      this.storage.getAguaEntre(desde, hasta),
      this.storage.getComidas(),
    ]);
    if (desde !== this.mes()) return; // se cambió de mes mientras cargaba
    this.confirmadas.set(new Map(confirmadas.map((r) => [r.fecha, r])));
    this.agua.set(new Map(agua.map((r) => [r.fecha, r])));
    this.comidas.set(new Map(comidas.map((c) => [c.id, c])));
  }

  private dia(fecha: string): DiaHistorial {
    const registro = this.confirmadas().get(fecha);
    const agua = this.agua().get(fecha);
    return {
      fecha,
      numero: Number(fecha.slice(8)),
      desayuno: registro?.desayuno && this.nombre(registro.desayuno),
      cena: registro?.cena && this.nombre(registro.cena),
      vasos: agua?.vasos ?? 0,
      meta: agua?.meta ?? META_VASOS,
    };
  }

  /** El nombre actual si la comida sigue en "Mis Comidas"; si se borró, el que tenía ese día. */
  private nombre(comida: ComidaConfirmada): string {
    return this.comidas().get(comida.id)?.nombre ?? comida.nombre;
  }
}
