import { inject } from '@angular/core';
import { AlertService } from '../services/alert.service';

/** Para un campo de la página: devuelve una función que pide la meta diaria de agua (null si se cancela). */
export function injectPedirMetaVasos() {
  const alert = inject(AlertService);
  return (actual: number) =>
    alert.pedirNumero('Meta diaria', actual, { min: 1, max: 30, message: 'Vasos de unos 250 ml al día' });
}
