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

/** Día de la semana de hoy: 0 = domingo, 1 = lunes, …, 6 = sábado. */
export function diaSemanaHoy(): number {
  return new Date().getDay();
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

// Las fechas YYYY-MM-DD son días del calendario, no instantes: se operan como
// medianoche UTC para que sumar o restar días no dependa de la zona horaria.
function aFechaUtc(fecha: string): Date {
  return new Date(fecha + 'T00:00:00Z');
}
