import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
import { fechaHoy } from '../utils/fecha';

/**
 * La fecha de hoy para las pantallas. Cambia a medianoche y al volver a la app: en iOS la PWA
 * se reanuda sin recargarse y, mientras estuvo suspendida, el día pudo haber cambiado.
 */
@Injectable({ providedIn: 'root' })
export class HoyService {
  private readonly fecha = signal(fechaHoy());
  readonly hoy = this.fecha.asReadonly();
  /** Emite la fecha nueva cada vez que cambia el día (no al inicio). */
  readonly cambioDeDia = toObservable(this.hoy).pipe(skip(1));

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.actualizar();
    });
    this.programarMedianoche();
  }

  private actualizar(): void {
    this.fecha.set(fechaHoy());
  }

  private programarMedianoche(): void {
    const ahora = new Date();
    const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
    setTimeout(() => {
      this.actualizar();
      this.programarMedianoche();
    }, manana.getTime() - ahora.getTime() + 1000);
  }
}
