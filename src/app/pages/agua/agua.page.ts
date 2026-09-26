import { Component, signal, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonLabel,
  IonRouterLink,
} from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { HoyService } from '../../services/hoy.service';
import { META_VASOS, RegistroAgua } from '../../models/historial.model';
import { diaSemana, fechaHoy, sumarDias } from '../../utils/fecha';

const LETRAS_DIA = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // por diaSemana(): 0 = domingo

interface BarraDia {
  fecha: string;
  vasos: number;
  letra: string;
  alto: number; // 0 a 1: la barra llena es la meta
  esHoy: boolean;
}

@Component({
  selector: 'app-agua',
  templateUrl: 'agua.page.html',
  styleUrls: ['agua.page.scss'],
  imports: [IonContent, IonButton, IonIcon, IonLabel, RouterLink, IonRouterLink],
})
export class AguaPage {
  private storage = inject(StorageService);
  private alert = inject(AlertService);
  private hoyService = inject(HoyService);

  registro = signal<RegistroAgua>({ fecha: '', vasos: 0 });
  meta = signal(META_VASOS);
  progreso = computed(() => Math.min(this.registro().vasos / this.meta(), 1));
  cumplido = computed(() => this.registro().vasos >= this.meta());
  // Los 6 días anteriores; hoy sale de `registro`, así la gráfica sigue cada vaso
  private anteriores = signal<RegistroAgua[]>([]);
  ultimosDias = computed<BarraDia[]>(() => {
    const hoy = this.registro();
    if (!hoy.fecha) return [];
    return [...this.anteriores(), hoy].map((r) => ({
      ...r,
      letra: LETRAS_DIA[diaSemana(r.fecha)],
      // Cada día con la meta que tenía
      alto: Math.min(r.vasos / (r === hoy ? this.meta() : (r.meta ?? META_VASOS)), 1),
      esHoy: r === hoy,
    }));
  });

  constructor() {
    // Si cambia el día, el registro en pantalla es de ayer: se carga el de hoy
    this.hoyService.cambioDeDia.pipe(takeUntilDestroyed()).subscribe(() => void this.cargar());
  }

  // Ionic lo llama también al entrar la primera vez: no hace falta cargar en ngOnInit
  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    // Cada día tiene su propio registro: los días anteriores quedan en el historial
    const hoy = this.hoyService.hoy();
    const desde = sumarDias(hoy, -6);
    const [reg, anteriores, meta] = await Promise.all([
      this.storage.getAgua(hoy),
      this.storage.getAguaEntre(desde, sumarDias(hoy, -1)),
      this.storage.getMetaVasos(),
    ]);
    const porFecha = new Map(anteriores.map((r) => [r.fecha, r]));
    this.anteriores.set(
      Array.from({ length: 6 }, (_, i) => {
        const fecha = sumarDias(desde, i);
        return porFecha.get(fecha) ?? { fecha, vasos: 0 };
      }),
    );
    this.meta.set(meta);
    this.registro.set(reg);
  }

  async cambiarMeta(): Promise<void> {
    const meta = await this.alert.pedirNumero('Meta diaria', this.meta(), {
      min: 1,
      max: 30,
      message: 'Vasos de unos 250 ml al día',
    });
    if (meta === null || meta === this.meta()) return;
    this.meta.set(meta);
    // Se guarda en el registro de hoy: así queda como la vigente y como la de hoy en el historial
    await this.guardar(this.registroDeHoy());
  }

  async sumarVaso(): Promise<void> {
    const hoy = this.registroDeHoy();
    await this.guardar({ ...hoy, vasos: hoy.vasos + 1 });
  }

  async restarVaso(): Promise<void> {
    const hoy = this.registroDeHoy();
    await this.guardar({ ...hoy, vasos: Math.max(hoy.vasos - 1, 0) });
  }

  async reiniciar(): Promise<void> {
    const antes = this.registroDeHoy();
    if (antes.vasos === 0) return;
    await this.guardar({ ...antes, vasos: 0 });
    const deshacer = await this.alert.toast(`${antes.vasos} ${antes.vasos === 1 ? 'vaso' : 'vasos'} de hoy`, {
      tipo: 'eliminado',
      header: 'Agua reiniciada',
      deshacer: true,
    });
    // Se suman los vasos que se hayan agregado mientras estaba el aviso
    if (deshacer) await this.guardar({ ...antes, vasos: antes.vasos + this.registroDeHoy().vasos });
  }

  // Si la app quedó abierta de un día para otro, el registro en pantalla es de ayer:
  // se empieza de cero con la fecha de hoy para no guardar los vasos en el día anterior.
  private registroDeHoy(): RegistroAgua {
    const reg = this.registro();
    return reg.fecha === fechaHoy() ? reg : { fecha: fechaHoy(), vasos: 0 };
  }

  /** Guarda el registro con la meta vigente. */
  private async guardar(reg: RegistroAgua): Promise<void> {
    const conMeta = { ...reg, meta: this.meta() };
    this.registro.set(conMeta);
    await this.storage.putAgua(conMeta);
  }
}
