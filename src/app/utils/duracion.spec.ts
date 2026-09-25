import { parsearDuracionADias } from './duracion';

describe('parsearDuracionADias', () => {
  it('entiende semanas, días, meses y años', () => {
    expect(parsearDuracionADias('3 semanas en nevera')).toBe(21);
    expect(parsearDuracionADias('5 días abierta')).toBe(5);
    expect(parsearDuracionADias('2 meses en despensa')).toBe(60);
    expect(parsearDuracionADias('años')).toBe(365);
  });

  it('en un rango toma el mayor', () => {
    expect(parsearDuracionADias('1-2 semanas en nevera')).toBe(14);
    expect(parsearDuracionADias('6-12 meses en despensa')).toBe(360);
    expect(parsearDuracionADias('3-4 meses sin abrir / 5 días abierta')).toBe(120);
  });

  it('sin unidad asume días', () => {
    expect(parsearDuracionADias('10')).toBe(10);
  });

  it('usa 30 días cuando no se puede calcular', () => {
    expect(parsearDuracionADias('')).toBe(30);
    expect(parsearDuracionADias('según empaque')).toBe(30);
    expect(parsearDuracionADias('pronto')).toBe(30);
  });
});
