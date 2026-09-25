import { fechaHoy, sumarDias } from './fecha';

/** Atajos de duración que ofrece Mercado; todos los entiende parsearDuracionADias. */
export const DURACIONES = ['3 días', '1 semana', '2 semanas', '1 mes', '3 meses', '6 meses', '1 año'];

/**
 * Parsea un texto de duración aproximada y devuelve los días estimados de vencimiento.
 * Ejemplos que soporta:
 * - "3 semanas en nevera" → 21
 * - "1-2 semanas en nevera" → 14 (toma el mayor)
 * - "5 días abierta" → 5
 * - "6-12 meses en despensa" → 360
 * - "años" → 365
 * - "según empaque" → 30 (default conservador)
 */
export function parsearDuracionADias(duracion: string): number {
  const texto = duracion.toLowerCase().trim();

  if (!texto || texto.includes('según')) return 30;
  if (texto.includes('año')) return 365;

  let dias = 0;

  // Buscar patrones de rangos: "1-2", "3-5", "6-12"
  const rangoMatch = texto.match(/(\d+)\s*-\s*(\d+)/);
  // Buscar número simple
  const numMatch = texto.match(/(\d+)/);

  let numero: number;
  if (rangoMatch) {
    numero = parseInt(rangoMatch[2], 10); // tomar el mayor del rango
  } else if (numMatch) {
    numero = parseInt(numMatch[1], 10);
  } else {
    return 30;
  }

  // Determinar unidad
  if (texto.includes('mes') || texto.includes('meses')) {
    dias = numero * 30;
  } else if (texto.includes('semana')) {
    dias = numero * 7;
  } else if (texto.includes('día') || texto.includes('dias') || texto.includes('días')) {
    dias = numero;
  } else {
    // Si hay número pero no unidad, asumir días
    dias = numero;
  }

  // Si el texto tiene "/" (ej: "3-4 meses sin abrir / 5 días abierta")
  // tomar la primera opción (sin abrir) que suele ser la mayor
  return dias > 0 ? dias : 30;
}

/**
 * Calcula la fecha de vencimiento (YYYY-MM-DD) sumando días a hoy.
 */
export function calcularFechaVencimiento(dias: number): string {
  return sumarDias(fechaHoy(), dias);
}
