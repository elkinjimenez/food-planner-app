import { Component, inject } from '@angular/core';
import { ActionSheetController, IonButton, IonIcon } from '@ionic/angular';
import { RespaldoService } from '../services/respaldo.service';
import { AlertService } from '../services/alert.service';
import { DatosApp } from '../services/storage.service';
import { injectCompartirTexto } from './compartir-texto';

/** Botón del encabezado para exportar o importar un respaldo de todos los datos. */
@Component({
  selector: 'app-respaldo-boton',
  template: `
    <ion-button fill="clear" size="small" class="page-title-btn" aria-label="Respaldo" (click)="abrirOpciones()">
      <ion-icon name="archive-outline" slot="icon-only"></ion-icon>
    </ion-button>
  `,
  imports: [IonButton, IonIcon],
})
export class RespaldoBotonComponent {
  private respaldo = inject(RespaldoService);
  private alert = inject(AlertService);
  private actionSheetCtrl = inject(ActionSheetController);
  private compartir = injectCompartirTexto();

  async abrirOpciones(): Promise<void> {
    // El mensaje se prepara antes: iOS solo deja compartir o copiar durante el toque, sin esperas de por medio
    let mensaje: string;
    try {
      mensaje = await this.respaldo.crearMensaje();
    } catch {
      await this.alert.aviso('No se pudo preparar el respaldo', 'Inténtalo de nuevo.');
      return;
    }
    const opciones = await this.actionSheetCtrl.create({
      header: 'Respaldo de tus datos',
      subHeader:
        'Exporta una copia de comidas, mercado, nevera, plan e historial como un mensaje (p. ej. envíatelo por ' +
        'WhatsApp o guárdalo en Notas). Para recuperarla, copia ese mensaje e impórtalo.',
      buttons: [
        {
          text: 'Exportar respaldo',
          handler: () =>
            void this.compartir(mensaje, { titulo: 'Exportar respaldo', copiar: 'Copiar respaldo', copiado: 'Respaldo copiado' }),
        },
        { text: 'Importar respaldo', handler: () => void this.importar() },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await opciones.present();
  }

  private async importar(): Promise<void> {
    const texto = await this.alert.pedirTexto('Importar respaldo', {
      message: 'Pega el mensaje del respaldo que exportaste.',
      placeholder: 'Pega aquí el respaldo',
      aceptar: 'Continuar',
    });
    if (!texto) return;

    let datos: DatosApp;
    try {
      datos = await this.respaldo.leer(texto);
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
