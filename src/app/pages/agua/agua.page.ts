import { Component, HostListener, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonLabel,
  IonRouterLink,
} from '@ionic/angular';
import { StorageService } from '../../services/storage.service';
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
export class AguaPage implements OnInit {
  private storage = inject(StorageService);

  registro = signal<RegistroAgua>({ fecha: '', vasos: 0 });
  meta = META_VASOS;
  progreso = computed(() => Math.min(this.registro().vasos / this.meta, 1));
  cumplido = computed(() => this.registro().vasos >= this.meta);
  // Los 6 días anteriores; hoy sale de `registro`, así la gráfica sigue cada vaso
  private anteriores = signal<RegistroAgua[]>([]);
  ultimosDias = computed<BarraDia[]>(() => {
    const hoy = this.registro();
    if (!hoy.fecha) return [];
    return [...this.anteriores(), hoy].map((r) => ({
      ...r,
      letra: LETRAS_DIA[diaSemana(r.fecha)],
      alto: Math.min(r.vasos / this.meta, 1),
      esHoy: r === hoy,
    }));
  });

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
    // Cada día tiene su propio registro: los días anteriores quedan en el historial
    const hoy = fechaHoy();
    const desde = sumarDias(hoy, -6);
    const [reg, anteriores] = await Promise.all([
      this.storage.getAgua(hoy),
      this.storage.getAguaEntre(desde, sumarDias(hoy, -1)),
    ]);
    const vasos = new Map(anteriores.map((r) => [r.fecha, r.vasos]));
    this.anteriores.set(
      Array.from({ length: 6 }, (_, i) => {
        const fecha = sumarDias(desde, i);
        return { fecha, vasos: vasos.get(fecha) ?? 0 };
      }),
    );
    this.registro.set(reg);
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
    await this.guardar({ fecha: fechaHoy(), vasos: 0 });
  }

  // Si la app quedó abierta de un día para otro, el registro en pantalla es de ayer:
  // se empieza de cero con la fecha de hoy para no guardar los vasos en el día anterior.
  private registroDeHoy(): RegistroAgua {
    const reg = this.registro();
    return reg.fecha === fechaHoy() ? reg : { fecha: fechaHoy(), vasos: 0 };
  }

  private async guardar(reg: RegistroAgua): Promise<void> {
    this.registro.set(reg);
    await this.storage.putAgua(reg);
  }
}
