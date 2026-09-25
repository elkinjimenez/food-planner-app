import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

type TipoToast = 'ok' | 'pendiente' | 'eliminado';

const ICONOS_TOAST: Record<TipoToast, string> = {
  ok: 'checkmark-circle',
  pendiente: 'time-outline',
  eliminado: 'trash-outline',
};

interface OpcionesToast {
  tipo?: TipoToast;
  header?: string;
  deshacer?: boolean;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private toastActual?: HTMLIonToastElement;


  async confirm(header: string, message?: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(false) },
          { text: 'Aceptar', handler: () => resolve(true) },
        ],
      });
      await alert.present();
    });
  }

  /** Mensaje informativo con un solo botón. */
  async aviso(header: string, message?: string): Promise<void> {
    const alert = await this.alertCtrl.create({ header, message, buttons: ['Entendido'] });
    await alert.present();
    await alert.onDidDismiss();
  }

  /**
   * Aviso abajo, sobre el tab bar, que se quita solo o deslizándolo hacia abajo.
   * Con `deshacer` lleva el botón "Deshacer" y devuelve true si se tocó.
   * Uno nuevo cierra el anterior (si tenía "Deshacer", lo hecho se queda así).
   */
  async toast(
    message: string,
    { tipo = 'ok', header, deshacer = false, duration = deshacer ? 5000 : 1800 }: OpcionesToast = {},
  ): Promise<boolean> {
    await this.toastActual?.dismiss();
    const toast = await this.toastCtrl.create({
      header,
      message,
      duration,
      icon: ICONOS_TOAST[tipo],
      buttons: deshacer ? [{ text: 'Deshacer', role: 'deshacer' }] : [],
      position: 'bottom',
      positionAnchor: document.querySelector<HTMLElement>('ion-tab-bar') ?? undefined,
      swipeGesture: 'vertical',
      cssClass: ['toast-glass', `toast-${tipo}`, ...(header ? ['toast-con-titulo'] : [])],
    });
    this.toastActual = toast;
    await toast.present();
    const { role } = await toast.onDidDismiss();
    if (this.toastActual === toast) this.toastActual = undefined;
    return role === 'deshacer';
  }
}
