import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { AlertService } from './alert.service';
import { ErrorDeDatos } from './storage.service';

/**
 * Las pantallas muestran los cambios antes de guardarlos: si IndexedDB falla, se avisa y se
 * ofrece recargar para ver lo que de verdad quedó guardado. Los demás errores solo van a consola.
 */
@Injectable()
export class ManejadorErrores extends ErrorHandler {
  // Se pide al avisar y no al crearse: el ErrorHandler se crea antes que el resto de la app
  private injector = inject(Injector);
  private avisando = false;

  override handleError(error: unknown): void {
    super.handleError(error);
    if (error instanceof ErrorDeDatos && !this.avisando) void this.avisar();
  }

  /** Un solo aviso a la vez: una carga que falla suele fallar en varias lecturas seguidas. */
  private async avisar(): Promise<void> {
    this.avisando = true;
    try {
      const recargar = await this.injector.get(AlertService).toast('Recarga para ver lo guardado', {
        tipo: 'error',
        header: 'Error con tus datos',
        boton: 'Recargar',
        duration: 0,
      });
      if (recargar) document.location.reload();
    } finally {
      this.avisando = false;
    }
  }
}
