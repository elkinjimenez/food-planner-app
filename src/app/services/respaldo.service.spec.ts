import { validarRespaldo } from './respaldo.service';

const datos = {
  comidas: [{ id: 'c1', nombre: 'Arepa', tipo: 'desayuno' }],
  mercado: [{ id: 'm1', nombre: 'Leche', duracion: '1 semana', categoria: 'supermercado', comprado: false }],
  nevera: [],
  plan: { lunes: { desayunoId: 'c1' } },
  agua: { fecha: '2026-09-25', vasos: 3 },
};
const respaldo = { app: 'food-planner', version: 1, exportado: '2026-09-25T15:00:00.000Z', datos };

describe('validarRespaldo', () => {
  it('acepta un respaldo válido y devuelve sus datos', () => {
    expect(validarRespaldo(respaldo)).toEqual(datos);
  });

  it('acepta un respaldo sin registro de agua', () => {
    expect(validarRespaldo({ ...respaldo, datos: { ...datos, agua: undefined } }).agua).toBeNull();
  });

  it('rechaza archivos que no son un respaldo de la app', () => {
    expect(() => validarRespaldo(null)).toThrow('no es un respaldo de Food Planner');
    expect(() => validarRespaldo({ app: 'otra-app', version: 1, datos })).toThrow('no es un respaldo de Food Planner');
  });

  it('rechaza respaldos de una versión más nueva de la app', () => {
    expect(() => validarRespaldo({ ...respaldo, version: 2 })).toThrow('versión más nueva');
  });

  it('rechaza respaldos incompletos o dañados', () => {
    expect(() => validarRespaldo({ ...respaldo, datos: { ...datos, comidas: 'x' } })).toThrow('incompleto o dañado');
    expect(() => validarRespaldo({ ...respaldo, datos: { ...datos, nevera: [{ nombre: 'sin id' }] } })).toThrow(
      'incompleto o dañado',
    );
    expect(() => validarRespaldo({ ...respaldo, datos: { ...datos, plan: null } })).toThrow('incompleto o dañado');
  });
});
