import { ItemMercado } from '../models/item-mercado.model';
import { ProductoNevera } from '../models/producto-nevera.model';
import { enlazarNeveraConMercado, normalizarPlan, quitarComidaDelPlan } from './storage.service';

describe('normalizarPlan', () => {
  it('convierte el plan guardado con comidas completas (formato anterior) a solo ids', () => {
    const anterior = {
      lunes: { desayuno: { id: 'd1', nombre: 'Arepa', tipo: 'desayuno' }, desayunoConfirmado: true },
      martes: { cena: { id: 'c1', nombre: 'Huevos', tipo: 'cena' } },
    };
    const plan = normalizarPlan(anterior);
    expect(plan.lunes).toEqual({ desayunoId: 'd1', desayunoConfirmado: true });
    expect(plan.martes).toEqual({ cenaId: 'c1' });
    expect(plan.domingo).toEqual({});
  });

  it('deja igual un plan que ya usa ids', () => {
    const plan = normalizarPlan({ viernes: { desayunoId: 'd2', cenaId: 'c2', cenaConfirmado: true } });
    expect(plan.viernes).toEqual({ desayunoId: 'd2', cenaId: 'c2', cenaConfirmado: true });
  });

  it('sin plan guardado devuelve los 7 días vacíos', () => {
    expect(Object.keys(normalizarPlan(undefined))).toHaveLength(7);
  });
});

describe('quitarComidaDelPlan', () => {
  it('quita la comida y su confirmación de todos los días', () => {
    const plan = normalizarPlan({
      lunes: { desayunoId: 'x', desayunoConfirmado: true, cenaId: 'y' },
      jueves: { cenaId: 'x', cenaConfirmado: true },
    });
    expect(quitarComidaDelPlan(plan, 'x')).toBe(true);
    expect(plan.lunes).toEqual({ cenaId: 'y' });
    expect(plan.jueves).toEqual({});
    expect(quitarComidaDelPlan(plan, 'x')).toBe(false);
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
