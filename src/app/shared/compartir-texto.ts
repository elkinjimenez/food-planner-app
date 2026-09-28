import { inject } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import { AlertService } from '../services/alert.service';

interface TextosCompartir {
  titulo: string; // del menú si no se pudo compartir, p. ej. "Compartir lista"
  copiar: string; // botón de ese menú, p. ej. "Copiar lista"
  copiado: string; // aviso al copiar, p. ej. "Lista copiada"
}

/**
 * Para un campo de la página: devuelve una función que comparte un texto (p. ej. por WhatsApp)
 * desde el teléfono o lo copia en computador. Sin await antes de llamarla: iOS solo deja
 * compartir o copiar durante el toque.
 */
export function injectCompartirTexto() {
  const alert = inject(AlertService);
  const actionSheetCtrl = inject(ActionSheetController);

  const copiar = async (texto: string, copiado: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      await alert.toast(copiado);
    } catch {
      await alert.aviso('No se pudo copiar', 'Inténtalo de nuevo.');
    }
  };

  return async (texto: string, { titulo, copiar: textoCopiar, copiado }: TextosCompartir) => {
    if (matchMedia('(pointer: coarse)').matches && navigator.share) {
      try {
        await navigator.share({ text: texto });
        return;
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return; // cerró el menú de compartir
        // iOS a veces lo rechaza (p. ej. si un compartir anterior quedó "en curso")
        console.warn('No se abrió el menú de compartir:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(texto);
        await alert.toast(copiado);
        return;
      } catch (error) {
        console.warn('No se pudo copiar:', error);
      }
    }
    // Tras un intento fallido el toque ya no sirve para compartir ni copiar: se ofrece en un
    // menú, donde cada opción es un toque nuevo
    const opciones = await actionSheetCtrl.create({
      header: titulo,
      buttons: [
        { text: 'Enviar por WhatsApp', handler: () => void (location.href = `whatsapp://send?text=${encodeURIComponent(texto)}`) },
        { text: textoCopiar, handler: () => void copiar(texto, copiado) },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await opciones.present();
  };
}
