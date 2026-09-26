import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { ActionSheetController, IonButton, IonIcon } from '@ionic/angular';
import { RespaldoService } from '../services/respaldo.service';
import { AlertService } from '../services/alert.service';
import { DatosApp } from '../services/storage.service';

/** Botón del encabezado para exportar o importar un respaldo de todos los datos. */
@Component({
  selector: 'app-respaldo-boton',
  template: `
    <ion-button fill="clear" size="small" class="page-title-btn" aria-label="Respaldo" (click)="abrirOpciones()">
      <ion-icon name="archive-outline" slot="start"></ion-icon>
    </ion-button>
    <input #selectorArchivo type="file" accept=".json,application/json" hidden (change)="archivoElegido()" />
  `,
  imports: [IonButton, IonIcon],
})
export class RespaldoBotonComponent {
  @ViewChild('selectorArchivo') private selectorArchivo!: ElementRef<HTMLInputElement>;

  private respaldo = inject(RespaldoService);
  private alert = inject(AlertService);
  private actionSheetCtrl = inject(ActionSheetController);

  async abrirOpciones(): Promise<void> {
    // El archivo se prepara antes: iOS solo deja compartir o abrir el selector de archivos
    // durante el toque, sin esperas de por medio.
    const archivo = await this.respaldo.crearArchivo();
    const opciones = await this.actionSheetCtrl.create({
      header: 'Respaldo de tus datos',
      subHeader: 'Guarda una copia de comidas, mercado, nevera, plan e historial, o recupera una anterior',
      buttons: [
        { text: 'Exportar respaldo', handler: () => void this.exportar(archivo) },
        { text: 'Importar respaldo', handler: () => this.selectorArchivo.nativeElement.click() },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await opciones.present();
  }

  private async exportar(archivo: File): Promise<void> {
    try {
      await this.respaldo.compartir(archivo);
    } catch {
      await this.alert.aviso('No se pudo exportar', 'Inténtalo de nuevo.');
    }
  }

  async archivoElegido(): Promise<void> {
    const input = this.selectorArchivo.nativeElement;
    const archivo = input.files?.[0];
    input.value = ''; // para poder elegir el mismo archivo otra vez
    if (!archivo) return;

    let datos: DatosApp;
    try {
      datos = await this.respaldo.leer(archivo);
    } catch (error) {
      await this.alert.aviso('No se pudo importar', (error as Error).message);
      return;
    }

    const diasHistorial = new Set([...datos.comidasConfirmadas, ...datos.agua].map((r) => r.fecha)).size;
    const confirmar = await this.alert.confirm(
      '¿Importar respaldo?',
      `Se reemplazarán todos tus datos actuales por los del respaldo: ${datos.comidas.length} comidas, ` +
        `${datos.mercado.length} productos de mercado, ${datos.nevera.length} productos de nevera ` +
        `y ${diasHistorial} días de historial.`,
      { aceptar: 'Reemplazar', destructivo: true },
    );
    if (!confirmar) return;

    try {
      await this.respaldo.importar(datos);
    } catch {
      await this.alert.aviso('No se pudo importar', 'Tus datos no cambiaron. Inténtalo de nuevo.');
      return;
    }
    await this.alert.toast('Respaldo importado', { duration: 1200 });
    // Todas las pantallas vuelven a cargar con los datos importados
    document.location.reload();
  }
}
