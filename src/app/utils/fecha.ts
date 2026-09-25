// Todas las fechas de la app se calculan con la hora local del teléfono: si cambias
// de país, el teléfono ajusta su zona horaria y la app la sigue.
// No usar new Date().toISOString() para sacar "hoy": devuelve la fecha en UTC, que
// en Colombia ya es el día siguiente desde las 7:00 p. m.

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** Fecha de hoy en la zona horaria del teléfono, en formato YYYY-MM-DD. */
export function fechaHoy(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Día de la semana de una fecha YYYY-MM-DD: 0 = domingo, 1 = lunes, …, 6 = sábado. */
export function diaSemana(fecha: string): number {
  return aFechaUtc(fecha).getUTCDay();
}

/** Suma (o resta, si es negativo) días a una fecha YYYY-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const d = aFechaUtc(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Días que faltan desde hoy hasta la fecha YYYY-MM-DD; negativo si ya pasó. */
export function diasHasta(fecha: string): number {
  return Math.round((aFechaUtc(fecha).getTime() - aFechaUtc(fechaHoy()).getTime()) / MS_POR_DIA);
}

// Formato único para mostrar fechas en toda la app: día/mes/año (DD/MM/AAAA).
// Lo usan los textos (formatearFecha / pipe `fecha`) y el selector de fecha (ion-datetime).
export const LOCALE_FECHAS = 'es-CO';
export const FORMATO_FECHA: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };

// timeZone UTC porque aFechaUtc() representa el día como medianoche UTC
const formatoTexto = new Intl.DateTimeFormat(LOCALE_FECHAS, { ...FORMATO_FECHA, timeZone: 'UTC' });

/** Muestra una fecha YYYY-MM-DD como DD/MM/AAAA. */
export function formatearFecha(fecha: string): string {
  const d = aFechaUtc(fecha);
  return isNaN(d.getTime()) ? fecha : formatoTexto.format(d);
}

// ===== Meses, para el calendario del historial =====
// Un mes se representa con la fecha de su primer día (YYYY-MM-01).

/** Primer día del mes de una fecha YYYY-MM-DD. */
export function inicioDeMes(fecha: string): string {
  return fecha.slice(0, 8) + '01';
}

/** Primer día del mes que queda `meses` meses después (o antes, si es negativo). */
export function sumarMeses(fecha: string, meses: number): string {
  const d = aFechaUtc(inicioDeMes(fecha));
  d.setUTCMonth(d.getUTCMonth() + meses);
  return d.toISOString().slice(0, 10);
}

/** Último día del mes de una fecha YYYY-MM-DD. */
export function finDeMes(fecha: string): string {
  return sumarDias(sumarMeses(fecha, 1), -1);
}

/**
 * Casillas del calendario de un mes, con semanas de lunes a domingo: las fechas del mes,
 * precedidas de null en las casillas vacías antes del día 1.
 */
export function casillasDelMes(fecha: string): (string | null)[] {
  const inicio = inicioDeMes(fecha);
  const fin = finDeMes(inicio);
  const casillas: (string | null)[] = Array((diaSemana(inicio) + 6) % 7).fill(null); // lunes = 0
  for (let f = inicio; f <= fin; f = sumarDias(f, 1)) {
    casillas.push(f);
  }
  return casillas;
}

const formatoMes = new Intl.DateTimeFormat(LOCALE_FECHAS, { month: 'long', timeZone: 'UTC' });

/** Nombre del mes con su año, p. ej. "Septiembre 2026". */
export function nombreMes(fecha: string): string {
  const mes = formatoMes.format(aFechaUtc(inicioDeMes(fecha)));
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${fecha.slice(0, 4)}`;
}

// Las fechas YYYY-MM-DD son días del calendario, no instantes: se operan como
// medianoche UTC para que sumar o restar días no dependa de la zona horaria.
function aFechaUtc(fecha: string): Date {
  return new Date(fecha + 'T00:00:00Z');
}
