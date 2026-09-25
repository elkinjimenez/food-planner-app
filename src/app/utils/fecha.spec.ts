import {
  casillasDelMes,
  diaSemana,
  diasHasta,
  fechaHoy,
  finDeMes,
  formatearFecha,
  inicioDeMes,
  nombreMes,
  sumarDias,
  sumarMeses,
} from './fecha';

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

    vi.setSystemTime(SABADO_26_PRIMER_MINUTO);
    expect(fechaHoy()).toBe('2026-09-26');
  });

  it('da el día de la semana de una fecha', () => {
    expect(diaSemana('2026-09-25')).toBe(5); // viernes
    expect(diaSemana('2026-09-27')).toBe(0); // domingo
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

describe('meses del calendario', () => {
  it('va al primer día del mes y suma meses cruzando años', () => {
    expect(inicioDeMes('2026-09-25')).toBe('2026-09-01');
    expect(sumarMeses('2026-12-15', 1)).toBe('2027-01-01');
    expect(sumarMeses('2026-01-31', -1)).toBe('2025-12-01');
  });

  it('da el último día del mes, también en febrero de año bisiesto', () => {
    expect(finDeMes('2026-09-10')).toBe('2026-09-30');
    expect(finDeMes('2028-02-01')).toBe('2028-02-29');
  });

  it('arma las casillas con semanas de lunes a domingo', () => {
    const septiembre = casillasDelMes('2026-09-25'); // el 1 de septiembre de 2026 es martes
    expect(septiembre.slice(0, 2)).toEqual([null, '2026-09-01']);
    expect(septiembre.filter((f) => f)).toHaveLength(30);
    expect(casillasDelMes('2026-06-10')[0]).toBe('2026-06-01'); // empieza en lunes: sin casillas vacías
  });

  it('muestra el nombre del mes con el año', () => {
    expect(nombreMes('2026-09-25')).toBe('Septiembre 2026');
  });
});
