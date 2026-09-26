import { Type, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';

/**
 * Para un campo de la página: devuelve una función que abre un componente como modal y
 * espera a que se cierre. Con la página como presentingElement, en iOS se abre como tarjeta.
 */
export function injectAbrirModal() {
  const modalCtrl = inject(ModalController);
  return async <T>(component: Type<unknown>, componentProps: Record<string, unknown>) => {
    const modal = await modalCtrl.create({
      component,
      componentProps,
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
    });
    await modal.present();
    return modal.onWillDismiss<T>();
  };
}
