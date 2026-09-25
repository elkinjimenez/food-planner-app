import { Comida } from '../models/comida.model';
import { ItemMercado } from '../models/item-mercado.model';
import { ProductoNevera } from '../models/producto-nevera.model';
import {
  confirmacionesDelPlanAnterior,
  enlazarNeveraConMercado,
  normalizarPlan,
  quitarComidaConfirmada,
  quitarComidaDelPlan,
} from './storage.service';

describe('normalizarPlan', () => {
  it('convierte el plan guardado con comidas completas (formato anterior) a solo ids', () => {
    const anterior = {
      lunes: { desayuno: { id: 'd1', nombre: 'Arepa', tipo: 'desayuno' }, desayunoConfirmado: true },
      martes: { cena: { id: 'c1', nombre: 'Huevos', tipo: 'cena' } },
    };
    const plan = normalizarPlan(anterior);
    expect(plan.lunes).toEqual({ desayunoId: 'd1' });
    expect(plan.martes).toEqual({ cenaId: 'c1' });
    expect(plan.domingo).toEqual({});
  });

  it('deja solo los ids: la confirmación ya no va en el plan sino en el historial', () => {
    const plan = normalizarPlan({ viernes: { desayunoId: 'd2', cenaId: 'c2', cenaConfirmado: true } });
    expect(plan.viernes).toEqual({ desayunoId: 'd2', cenaId: 'c2' });
  });

  it('sin plan guardado devuelve los 7 días vacíos', () => {
    expect(Object.keys(normalizarPlan(undefined))).toHaveLength(7);
  });
});

describe('confirmacionesDelPlanAnterior', () => {
  const comidas: Comida[] = [
    { id: 'd1', nombre: 'Arepa', tipo: 'desayuno' },
    { id: 'c1', nombre: 'Huevos', tipo: 'cena' },
  ];
  // Viernes: la semana en pantalla va del viernes 25 de septiembre al jueves 1 de octubre
  const HOY = '2026-09-25';

  it('pasa cada día confirmado a su fecha en la semana que empieza hoy', () => {
    const plan = {
      viernes: { desayunoId: 'd1', desayunoConfirmado: true, cenaId: 'c1' },
      lunes: { cenaId: 'c1', cenaConfirmado: true },
    };
    expect(confirmacionesDelPlanAnterior(plan, comidas, HOY)).toEqual([
      { fecha: '2026-09-25', desayuno: { id: 'd1', nombre: 'Arepa' } },
      { fecha: '2026-09-28', cena: { id: 'c1', nombre: 'Huevos' } },
    ]);
  });

  it('entiende el formato con la comida completa e ignora comidas que ya no existen', () => {
    const plan = {
      sabado: { desayuno: { id: 'd1', nombre: 'Arepa', tipo: 'desayuno' }, desayunoConfirmado: true },
      domingo: { cenaId: 'borrada', cenaConfirmado: true },
    };
    expect(confirmacionesDelPlanAnterior(plan, comidas, HOY)).toEqual([
      { fecha: '2026-09-26', desayuno: { id: 'd1', nombre: 'Arepa' } },
    ]);
  });

  it('sin plan o sin confirmaciones no crea registros', () => {
    expect(confirmacionesDelPlanAnterior(undefined, comidas, HOY)).toEqual([]);
    expect(confirmacionesDelPlanAnterior({ lunes: { desayunoId: 'd1' } }, comidas, HOY)).toEqual([]);
  });
});

describe('quitarComidaDelPlan', () => {
  it('quita la comida de todos los días', () => {
    const plan = normalizarPlan({
      lunes: { desayunoId: 'x', cenaId: 'y' },
      jueves: { cenaId: 'x' },
    });
    expect(quitarComidaDelPlan(plan, 'x')).toBe(true);
    expect(plan.lunes).toEqual({ cenaId: 'y' });
    expect(plan.jueves).toEqual({});
    expect(quitarComidaDelPlan(plan, 'x')).toBe(false);
  });
});

describe('quitarComidaConfirmada', () => {
  it('quita la comida de lo confirmado en una fecha', () => {
    const registro = {
      fecha: '2026-09-25',
      desayuno: { id: 'x', nombre: 'Arepa' },
      cena: { id: 'y', nombre: 'Huevos' },
    };
    expect(quitarComidaConfirmada(registro, 'x')).toBe(true);
    expect(registro).toEqual({ fecha: '2026-09-25', cena: { id: 'y', nombre: 'Huevos' } });
    expect(quitarComidaConfirmada(registro, 'x')).toBe(false);
  });
});

describe('enlazarNeveraConMercado', () => {
  const item = (id: string, nombre: string, comprado = true): ItemMercado => ({
    id,
    nombre,
    duracion: '1 semana',
    categoria: 'supermercado',
    comprado,
  });
  const producto = (id: string, nombre: string, itemMercadoId?: string): ProductoNevera => ({
    id,
    nombre,
    fechaVencimiento: '2026-10-01',
    itemMercadoId,
  });

  it('enlaza por nombre solo con ítems comprados y cada ítem una vez', () => {
    const mercado = [item('m1', 'Leche'), item('m2', 'Pan', false)];
    const nevera = [producto('p1', 'Leche'), producto('p2', 'Leche'), producto('p3', 'Pan')];
    expect(enlazarNeveraConMercado(nevera, mercado)).toEqual([{ ...nevera[0], itemMercadoId: 'm1' }]);
  });

  it('no toca productos ya enlazados ni reutiliza su ítem', () => {
    const mercado = [item('m1', 'Leche')];
    const nevera = [producto('p1', 'Leche', 'm1'), producto('p2', 'Leche')];
    expect(enlazarNeveraConMercado(nevera, mercado)).toEqual([]);
  });
});
