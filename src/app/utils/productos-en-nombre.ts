import { normalizarTexto } from './texto';

const PALABRAS_VACIAS = new Set(['con', 'los', 'las', 'del', 'para', 'sin', 'por']);

/**
 * Las palabras que cuentan de un nombre: sin lo que va entre paréntesis, sin tildes y sin
 * plural ("Arepas precocidas (Valle o Zenú)" → arepa, precocida).
 */
function palabras(texto: string): string[] {
  return normalizarTexto(texto.replace(/\(.*?\)/g, ' '))
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3 && !PALABRAS_VACIAS.has(p))
    .map((p) => p.replace(/s$/, '').replace(/e$/, '')); // tomates → tomat, tomate → tomat
}

/**
 * Los productos que aparecen en el nombre de una comida ("Arepa + queso derretido" → Arepas
 * precocidas, Queso campesino). Cuenta si coincide la primera palabra del producto (el alimento)
 * o, si no, al menos la mitad de sus palabras ("Semillas de chía" por "chía"), salvo que esas ya
 * sean el alimento de otro producto ("tomate" es de "Tomate", no de "Salsa de tomate").
 * Primero los que más se parecen.
 */
export function productosEnNombre<T extends { nombre: string }>(nombre: string, productos: T[]): T[] {
  const enNombre = new Set(palabras(nombre));
  if (enNombre.size === 0) return [];
  const candidatos = productos.map((producto) => {
    const propias = palabras(producto.nombre);
    return {
      producto,
      propias,
      coinciden: propias.filter((p) => enNombre.has(p)),
      primera: enNombre.has(propias[0]),
    };
  });
  const alimentos = new Set(candidatos.filter((c) => c.primera).map((c) => c.propias[0]));
  return candidatos
    .filter(
      (c) =>
        c.primera ||
        (c.coinciden.length * 2 >= c.propias.length && c.coinciden.some((p) => !alimentos.has(p))),
    )
    .map((c) => ({ producto: c.producto, puntaje: Number(c.primera) + c.coinciden.length / c.propias.length }))
    .sort((a, b) => b.puntaje - a.puntaje)
    .map((c) => c.producto);
}
