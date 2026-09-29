import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import {
  Gesture,
  GestureController,
  IonBackButton,
  IonButton,
  IonCard,
  IonContent,
  IonIcon,
  IonLabel,
} from '@ionic/angular';
import { Comida, TIPOS_COMIDA, TipoComida } from '../../models/comida.model';
import { DIAS_LABEL, DIAS_SEMANA, diaSemanaDe } from '../../models/plan-semanal.model';
import { ComidaConfirmada, META_VASOS, RegistroAgua, RegistroComidas } from '../../models/historial.model';
import { StorageService } from '../../services/storage.service';
import { HoyService } from '../../services/hoy.service';
import { FechaPipe } from '../../shared/fecha.pipe';
import {
  casillasDelMes,
  finDeMes,
  diaYMes,
  inicioDeMes,
  nombreDelMes,
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

const DURACION_MES = 250; // ms que tarda el mes en salir o entrar al deslizar

@Component({
  selector: 'app-historial',
  templateUrl: 'historial.page.html',
  styleUrls: ['historial.page.scss'],
  imports: [IonContent, IonCard, IonButton, IonIcon, IonLabel, IonBackButton, FechaPipe],
})
export class HistorialPage implements OnInit, AfterViewInit, OnDestroy {
  private storage = inject(StorageService);
  private gestureCtrl = inject(GestureController);
  private calendario = viewChild.required('calendario', { read: ElementRef<HTMLElement> });
  private grid = viewChild.required<ElementRef<HTMLElement>>('grid');
  private deslizar?: Gesture;
  private animando = false;

  readonly diasSemana = DIAS_SEMANA.map((d) => DIAS_LABEL[d].slice(0, 3)); // Lun, Mar, Mié… como el selector de fecha

  hoy = inject(HoyService).hoy;
  mes = signal(inicioDeMes(this.hoy())); // primer día del mes en pantalla
  seleccionada = signal(this.hoy());
  private confirmadas = signal(new Map<string, RegistroComidas>());
  private agua = signal(new Map<string, RegistroAgua>());
  private comidas = signal(new Map<string, Comida>());

  titulo = computed(() => nombreMes(this.mes()));
  esMesPasado = computed(() => this.mes() < inicioDeMes(this.hoy()));
  // "este mes", "en agosto" o, si es de otro año, "en agosto de 2025"
  enMes = computed(() => {
    const mes = this.mes();
    if (mes === inicioDeMes(this.hoy())) return 'este mes';
    const anio = mes.slice(0, 4);
    return `en ${nombreDelMes(mes)}${anio === this.hoy().slice(0, 4) ? '' : ` de ${anio}`}`;
  });
  // Lo confirmado llega hasta el último día que muestra Semana, que puede caer el mes siguiente
  haySiguiente = computed(() => this.mes() < inicioDeMes(sumarDias(this.hoy(), 6)));
  casillas = computed(() => casillasDelMes(this.mes()).map((fecha) => (fecha ? this.dia(fecha) : null)));
  detalle = computed(() => this.dia(this.seleccionada()));
  detalleTitulo = computed(() => {
    const fecha = this.seleccionada();
    return `${DIAS_LABEL[diaSemanaDe(fecha)]}, ${diaYMes(fecha)}`;
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

  ngAfterViewInit(): void {
    // Deslizar el calendario a los lados cambia de mes. Desde el borde izquierdo gana el
    // gesto atrás de Ionic, que tiene más prioridad.
    this.deslizar = this.gestureCtrl.create({
      el: this.calendario().nativeElement,
      gestureName: 'deslizar-mes',
      direction: 'x',
      threshold: 15,
      disableScroll: true,
      canStart: () => !this.animando,
      // Hacia un mes que aún no se puede ver se resiste
      onMove: (d) => this.moverGrid(d.deltaX < 0 && !this.haySiguiente() ? d.deltaX / 4 : d.deltaX),
      onEnd: (d) => void this.soltarGrid(d.deltaX, d.velocityX),
    });
    this.deslizar.enable();
  }

  ngOnDestroy(): void {
    this.deslizar?.destroy();
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

  private async soltarGrid(dx: number, vx: number): Promise<void> {
    const meses = dx < 0 ? 1 : -1;
    const pasa =
      (meses < 0 || this.haySiguiente()) &&
      (Math.abs(dx) > 60 || (Math.abs(vx) > 0.3 && Math.sign(vx) === Math.sign(dx)));
    this.animando = true;
    if (pasa) {
      // El mes sale por un lado y el nuevo entra por el otro
      const ancho = this.calendario().nativeElement.clientWidth;
      this.moverGrid(-meses * ancho, true);
      await esperar(DURACION_MES);
      await this.cambiarMes(meses);
      this.moverGrid(meses * ancho);
      this.grid().nativeElement.getBoundingClientRect(); // aplica la posición antes de animar la entrada
    }
    this.moverGrid(0, true);
    await esperar(DURACION_MES);
    this.grid().nativeElement.style.removeProperty('transform');
    this.grid().nativeElement.style.removeProperty('transition');
    this.animando = false;
  }

  private moverGrid(x: number, animado = false): void {
    const grid = this.grid().nativeElement;
    grid.style.transition = animado ? `transform ${DURACION_MES}ms cubic-bezier(0.32, 0.72, 0, 1)` : 'none';
    grid.style.transform = `translateX(${x}px)`;
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

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
