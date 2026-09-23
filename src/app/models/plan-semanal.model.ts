import { Comida } from './comida.model';

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface ComidaDelDia {
  desayuno?: Comida;
  cena?: Comida;
  desayunoConfirmado?: boolean;
  cenaConfirmado?: boolean;
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
