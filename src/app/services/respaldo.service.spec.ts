import { validarRespaldo } from './respaldo.service';

const comidas = [{ id: 'c1', nombre: 'Arepa', tipo: 'desayuno' }];
const mercado = [{ id: 'm1', nombre: 'Leche', duracion: '1 semana', categoria: 'supermercado', comprado: false }];
const datos = {
  comidas,
  mercado,
  nevera: [],
  plan: { lunes: { desayunoId: 'c1' } },
  comidasConfirmadas: [{ fecha: '2026-09-24', desayuno: { id: 'c1', nombre: 'Arepa' } }],
  agua: [
    { fecha: '2026-09-24', vasos: 8 },
    { fecha: '2026-09-25', vasos: 3 },
  ],
};
const respaldo = { app: 'food-planner', version: 2, exportado: '2026-09-25T15:00:00.000Z', datos };

describe('validarRespaldo', () => {
  it('acepta un respaldo válido y devuelve sus datos', () => {
    expect(validarRespaldo(respaldo)).toEqual(datos);
  });

  it('convierte un respaldo v1: el agua de ese día y lo confirmado en el plan pasan al historial', () => {
    const datosV1 = {
      comidas,
      mercado,
      nevera: [],
      plan: { viernes: { desayunoId: 'c1', desayunoConfirmado: true } },
      agua: { fecha: '2026-09-25', vasos: 3 },
    };
    const v1 = { app: 'food-planner', version: 1, exportado: '2026-09-25T15:00:00.000Z', datos: datosV1 };

    // Importado un viernes: lo confirmado el viernes queda en esa fecha
    expect(validarRespaldo(v1, '2026-09-25')).toEqual({
      comidas,
      mercado,
      nevera: [],
      plan: datosV1.plan,
      comidasConfirmadas: [{ fecha: '2026-09-25', desayuno: { id: 'c1', nombre: 'Arepa' } }],
      agua: [{ fecha: '2026-09-25', vasos: 3 }],
    });
    expect(validarRespaldo({ ...v1, datos: { ...datosV1, agua: null } }, '2026-09-25').agua).toEqual([]);
  });

  it('rechaza archivos que no son un respaldo de la app', () => {
    expect(() => validarRespaldo(null)).toThrow('no es un respaldo de Food Planner');
    expect(() => validarRespaldo({ app: 'otra-app', version: 2, datos })).toThrow('no es un respaldo de Food Planner');
  });

  it('rechaza respaldos de una versión más nueva de la app', () => {
    expect(() => validarRespaldo({ ...respaldo, version: 3 })).toThrow('versión más nueva');
  });

  it('rechaza respaldos incompletos o dañados', () => {
    const conDatos = (cambios: object) => ({ ...respaldo, datos: { ...datos, ...cambios } });
    expect(() => validarRespaldo(conDatos({ comidas: 'x' }))).toThrow('incompleto o dañado');
    expect(() => validarRespaldo(conDatos({ nevera: [{ nombre: 'sin id' }] }))).toThrow('incompleto o dañado');
    expect(() => validarRespaldo(conDatos({ plan: null }))).toThrow('incompleto o dañado');
    expect(() => validarRespaldo(conDatos({ agua: [{ vasos: 2 }] }))).toThrow('incompleto o dañado');
    expect(() => validarRespaldo(conDatos({ comidasConfirmadas: undefined }))).toThrow('incompleto o dañado');
  });
});
