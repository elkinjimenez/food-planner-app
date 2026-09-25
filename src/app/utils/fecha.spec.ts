import { diaSemanaHoy, diasHasta, fechaHoy, formatearFecha, sumarDias } from './fecha';

// Las horas se arman en la zona local de quien corre las pruebas (new Date(año, mes, …)),
// así las pruebas valen en cualquier zona horaria. Los meses van de 0 a 11.
const VIERNES_25_ULTIMO_MINUTO = new Date(2026, 8, 25, 23, 59);
const SABADO_26_PRIMER_MINUTO = new Date(2026, 8, 26, 0, 1);

describe('fecha (hora local del teléfono)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('usa el día local aunque en UTC ya sea otro día', () => {
    vi.useFakeTimers();

    vi.setSystemTime(VIERNES_25_ULTIMO_MINUTO);
    expect(fechaHoy()).toBe('2026-09-25');
    expect(diaSemanaHoy()).toBe(5); // viernes

    vi.setSystemTime(SABADO_26_PRIMER_MINUTO);
    expect(fechaHoy()).toBe('2026-09-26');
    expect(diaSemanaHoy()).toBe(6); // sábado
  });

  it('cuenta los días que faltan desde hoy', () => {
    vi.useFakeTimers();
    vi.setSystemTime(VIERNES_25_ULTIMO_MINUTO);

    expect(diasHasta('2026-09-25')).toBe(0);
    expect(diasHasta('2026-09-26')).toBe(1);
    expect(diasHasta('2026-09-24')).toBe(-1);
  });

  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-09-25', 7)).toBe('2026-10-02');
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('muestra las fechas como día/mes/año', () => {
    expect(formatearFecha('2026-10-02')).toBe('02/10/2026');
    expect(formatearFecha('2027-01-15')).toBe('15/01/2027');
  });
});
