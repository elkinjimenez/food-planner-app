import type { ElementRef } from '@angular/core';

/**
 * Aplica un cambio a una lista deslizando cada fila de su lugar anterior al nuevo en vez de
 * saltar (FLIP): mide las filas, llama a `actualizar` (que debe dejar el DOM al día, p. ej. con
 * detectChanges) y anima cada fila que se movió desde donde estaba.
 * No usa startViewTransition: esa transición pinta las filas encima del tab bar flotante y del
 * botón + mientras dura, y se traga los toques.
 */
export function deslizarFilas(filas: readonly ElementRef<HTMLElement>[], actualizar: () => void): void {
  const elementos = filas.map((f) => f.nativeElement);
  // Medir y actualizar en el mismo tick, sin await de por medio, para que un scroll no descuadre
  const antes = elementos.map((fila) => fila.getBoundingClientRect().top);
  actualizar();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const despues = elementos.map((fila) => fila.getBoundingClientRect().top);
  elementos.forEach((fila, i) => {
    const dy = antes[i] - despues[i];
    // Una fila eliminada ya salió del DOM: no hay nada que deslizar
    if (dy === 0 || !fila.isConnected) return;
    // La que más se desplaza (p. ej. la que se marcó en Mercado) pasa por encima de las que solo se corren un puesto
    const zIndex = Math.round(Math.abs(dy));
    fila.animate(
      [
        { transform: `translateY(${dy}px)`, zIndex },
        { transform: 'none', zIndex },
      ],
      { duration: 300, easing: 'ease-in-out' },
    );
  });
}
