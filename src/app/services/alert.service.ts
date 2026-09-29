import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

type TipoToast = 'ok' | 'pendiente' | 'eliminado' | 'agotado' | 'actualizacion' | 'error';

const ICONOS_TOAST: Record<TipoToast, string> = {
  ok: 'checkmark-circle',
  pendiente: 'time-outline',
  eliminado: 'trash-outline',
  agotado: 'remove-circle-outline',
  actualizacion: 'refresh-outline',
  error: 'alert-circle-outline',
};

interface OpcionesToast {
  tipo?: TipoToast;
  header?: string;
  deshacer?: boolean;
  boton?: string; // botón con otro texto (p. ej. "Actualizar")
  duration?: number; // 0: no se quita solo
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private toastActual?: HTMLIonToastElement;

  /** Con `destructivo` el botón de aceptar va en rojo (p. ej. si borra datos). Tocar fuera equivale a cancelar. */
  async confirm(
    header: string,
    message?: string,
    { aceptar = 'Aceptar', destructivo = false }: { aceptar?: string; destructivo?: boolean } = {},
  ): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: aceptar, role: destructivo ? 'destructive' : 'aceptar' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === (destructivo ? 'destructive' : 'aceptar');
  }

  /** Pide un número entero entre `min` y `max` (no se cierra con uno fuera de rango). Devuelve null si se cancela. */
  async pedirNumero(
    header: string,
    valor: number,
    { min, max, message }: { min: number; max: number; message?: string },
  ): Promise<number | null> {
    const esValido = (n: number) => Number.isInteger(n) && n >= min && n <= max;
    const alert = await this.alertCtrl.create({
      header,
      message,
      inputs: [{ name: 'valor', type: 'number', value: valor, min, max, attributes: { inputmode: 'numeric' } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Guardar', role: 'guardar', handler: ({ valor }) => esValido(Number(valor)) },
      ],
    });
    await alert.present();
    const { data, role } = await alert.onDidDismiss<{ values: { valor: string } }>();
    return role === 'guardar' && data ? Number(data.values.valor) : null;
  }

  /** Pide un texto largo, p. ej. para pegar algo copiado. Devuelve null si se cancela o queda vacío. */
  async pedirTexto(
    header: string,
    { message, placeholder, aceptar = 'Aceptar' }: { message?: string; placeholder?: string; aceptar?: string } = {},
  ): Promise<string | null> {
    const alert = await this.alertCtrl.create({
      header,
      message,
      // Sin corrector: con textos largos pegados (p. ej. un respaldo) se pone lento
      inputs: [{ name: 'texto', type: 'textarea', placeholder, attributes: { spellcheck: false, autocapitalize: 'off' } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: aceptar, role: 'aceptar' },
      ],
    });
    await alert.present();
    const { data, role } = await alert.onDidDismiss<{ values: { texto: string } }>();
    const texto = data?.values.texto.trim();
    return role === 'aceptar' && texto ? texto : null;
  }

  /** Mensaje informativo con un solo botón. */
  async aviso(header: string, message?: string): Promise<void> {
    const alert = await this.alertCtrl.create({ header, message, buttons: ['Entendido'] });
    await alert.present();
    await alert.onDidDismiss();
  }

  /**
   * Aviso abajo, sobre el tab bar, que se quita solo o deslizándolo hacia abajo.
   * Con `deshacer` lleva el botón "Deshacer" (o el texto de `boton`) y devuelve true si se tocó.
   * Uno nuevo cierra el anterior (si tenía "Deshacer", lo hecho se queda así).
   */
  async toast(
    message: string,
    {
      tipo = 'ok',
      header,
      deshacer = false,
      boton = deshacer ? 'Deshacer' : undefined,
      duration = boton ? 5000 : 1800,
    }: OpcionesToast = {},
  ): Promise<boolean> {
    await this.toastActual?.dismiss();
    // Fuera de las pestañas (Ajustes, Historial) el tab bar está oculto: anclado a él, Ionic
    // dejaría el aviso fuera de la pantalla. Ahí va abajo sin ancla.
    const tabBar = document.querySelector<HTMLElement>('ion-tab-bar');
    const toast = await this.toastCtrl.create({
      header,
      message,
      duration,
      icon: ICONOS_TOAST[tipo],
      buttons: boton ? [{ text: boton, role: 'boton' }] : [],
      position: 'bottom',
      positionAnchor: tabBar?.offsetParent ? tabBar : undefined,
      swipeGesture: 'vertical',
      cssClass: ['toast-glass', `toast-${tipo}`, ...(header ? ['toast-con-titulo'] : [])],
    });
    this.toastActual = toast;
    await toast.present();
    const { role } = await toast.onDidDismiss();
    if (this.toastActual === toast) this.toastActual = undefined;
    return role === 'boton';
  }
}
