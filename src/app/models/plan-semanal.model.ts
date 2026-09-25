import { diaSemana, sumarDias } from '../utils/fecha';

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

// Solo el id de la comida: el nombre se busca en "Mis Comidas", así editarla o borrarla
// se refleja en el plan. El plan es por día de la semana y se repite cada semana; lo que
// se confirma va aparte, por fecha, en el historial (ver historial.model.ts).
export interface ComidaDelDia {
  desayunoId?: string;
  cenaId?: string;
}

export type PlanSemanal = Record<DiaSemana, ComidaDelDia>;

export const DIAS_SEMANA: DiaSemana[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

export const DIAS_LABEL: Record<DiaSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

/** Día de la semana de una fecha YYYY-MM-DD. */
export function diaSemanaDe(fecha: string): DiaSemana {
  return DIAS_SEMANA[(diaSemana(fecha) + 6) % 7]; // diaSemana(): 0 = domingo
}

/** Los 7 días que muestra Semana, empezando hoy: cada uno con su fecha y su día de la semana. */
export function semanaDesde(hoy: string): { fecha: string; dia: DiaSemana }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(hoy, i);
    return { fecha, dia: diaSemanaDe(fecha) };
  });
}
