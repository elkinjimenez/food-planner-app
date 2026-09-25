import { ElementRef } from '@angular/core';
import { deslizarFilas } from './deslizar-filas';

/** Filas en el DOM con una posición vertical que el test controla (jsdom no calcula layout). */
function crearFilas(tops: number[]) {
  const posicion = new Map<HTMLElement, number>();
  const elementos = tops.map((top) => {
    const el = document.createElement('div');
    posicion.set(el, top);
    // Como en el navegador: fuera del DOM la posición es 0
    el.getBoundingClientRect = () => ({ top: el.isConnected ? posicion.get(el) : 0 }) as DOMRect;
    el.animate = vi.fn();
    document.body.appendChild(el);
    return el;
  });
  const mover = (el: HTMLElement, top: number) => posicion.set(el, top);
  return { elementos, filas: elementos.map((el) => new ElementRef(el)), mover };
}

describe('deslizarFilas', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('anima cada fila que se movió desde su lugar anterior, y la que más se mueve va encima', () => {
    const { elementos, filas, mover } = crearFilas([0, 100, 200]);
    const [marcada, segunda, tercera] = elementos;

    deslizarFilas(filas, () => {
      // La primera fila pasa al final y las otras suben un puesto
      mover(marcada, 200);
      mover(segunda, 0);
      mover(tercera, 100);
    });

    expect(marcada.animate).toHaveBeenCalledWith(
      [
        { transform: 'translateY(-200px)', zIndex: 200 },
        { transform: 'none', zIndex: 200 },
      ],
      { duration: 300, easing: 'ease-in-out' },
    );
    expect(segunda.animate).toHaveBeenCalledWith(
      [
        { transform: 'translateY(100px)', zIndex: 100 },
        { transform: 'none', zIndex: 100 },
      ],
      { duration: 300, easing: 'ease-in-out' },
    );
  });

  it('al eliminar una fila desliza las de abajo y no anima la eliminada ni las de arriba', () => {
    const { elementos, filas, mover } = crearFilas([0, 100, 200]);
    const [arriba, eliminada, abajo] = elementos;

    deslizarFilas(filas, () => {
      eliminada.remove();
      mover(abajo, 100);
    });

    expect(arriba.animate).not.toHaveBeenCalled();
    expect(eliminada.animate).not.toHaveBeenCalled();
    expect(abajo.animate).toHaveBeenCalledWith(
      [
        { transform: 'translateY(100px)', zIndex: 100 },
        { transform: 'none', zIndex: 100 },
      ],
      { duration: 300, easing: 'ease-in-out' },
    );
  });

  it('con "reducir movimiento" aplica el cambio sin animar', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const { elementos, filas, mover } = crearFilas([0, 100]);
    const actualizar = vi.fn(() => mover(elementos[1], 0));

    deslizarFilas(filas, actualizar);

    expect(actualizar).toHaveBeenCalledOnce();
    expect(elementos[1].animate).not.toHaveBeenCalled();
  });
});
