export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

// Solo el id de la comida: el nombre se busca en "Mis Comidas", así editarla o borrarla
// se refleja en el plan.
export interface ComidaDelDia {
  desayunoId?: string;
  cenaId?: string;
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
