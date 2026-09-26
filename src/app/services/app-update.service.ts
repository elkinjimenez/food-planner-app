import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  private swUpdate = inject(SwUpdate);

  private buscando = false;

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    // Si el Service Worker descarga una versión nueva, se activa y se recarga
    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.aplicar();
      }
    });

    // Si la caché quedó en un estado inválido, recargar desde la red
    this.swUpdate.unrecoverable.subscribe(() => document.location.reload());

    this.buscarActualizacion();

    // En iOS la PWA no se reinicia al "cerrarla": queda suspendida y al volver
    // solo se reanuda, sin pasar por ngOnInit. Por eso se busca también al volver.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.buscarActualizacion();
      }
    });
  }

  /** Busca una versión nueva y, si existe, la activa y recarga. Si no, solo recarga. */
  async actualizarYRecargar(): Promise<void> {
    if (this.swUpdate.isEnabled) {
      try {
        if (await this.swUpdate.checkForUpdate()) {
          await this.aplicar();
          return;
        }
      } catch (err) {
        console.error('Error buscando actualización:', err);
      }
    }
    document.location.reload();
  }

  /**
   * Pasa esta ventana a la versión más nueva y recarga, solo si existe una. Si el Service Worker
   * la encuentra, VERSION_READY la aplica; si ya la tenía descargada, checkForUpdate() devuelve
   * false aunque esta ventana siga en una anterior, y activateUpdate() la pasa a la nueva.
   */
  async pasarAVersionNueva(): Promise<void> {
    if (!this.swUpdate.isEnabled) return;
    try {
      if (!(await this.swUpdate.checkForUpdate()) && (await this.swUpdate.activateUpdate())) {
        document.location.reload();
      }
    } catch (err) {
      console.error('Error buscando actualización:', err);
    }
  }

  private async buscarActualizacion(): Promise<void> {
    if (this.buscando) return;
    this.buscando = true;
    try {
      await this.swUpdate.checkForUpdate();
    } catch (err) {
      console.error('Error buscando actualización:', err);
    } finally {
      this.buscando = false;
    }
  }

  private async aplicar(): Promise<void> {
    await this.swUpdate.activateUpdate();
    document.location.reload();
  }
}
