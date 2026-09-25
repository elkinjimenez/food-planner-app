import { diaSemanaDe, semanaDesde } from './plan-semanal.model';

describe('días del plan semanal', () => {
  it('da el día de la semana de una fecha', () => {
    expect(diaSemanaDe('2026-09-25')).toBe('viernes');
    expect(diaSemanaDe('2026-09-27')).toBe('domingo');
    expect(diaSemanaDe('2026-09-28')).toBe('lunes');
  });

  it('arma los 7 días de Semana desde hoy, cada uno con su fecha', () => {
    const semana = semanaDesde('2026-09-25');
    expect(semana).toHaveLength(7);
    expect(semana[0]).toEqual({ fecha: '2026-09-25', dia: 'viernes' });
    expect(semana[6]).toEqual({ fecha: '2026-10-01', dia: 'jueves' });
  });
});
