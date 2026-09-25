import { Injectable } from '@angular/core';
import { Comida, TipoComida } from '../models/comida.model';
import { CategoriaMercado, ItemMercado } from '../models/item-mercado.model';
import { ProductoNevera } from '../models/producto-nevera.model';
import { ComidaDelDia, DIAS_SEMANA, DiaSemana, PlanSemanal } from '../models/plan-semanal.model';
import { comidasBase, mercadoBase, planSemanalVacio } from '../data/seed.data';
import { fechaHoy } from '../utils/fecha';

export interface RegistroAgua {
  fecha: string; // YYYY-MM-DD
  vasos: number;
}

/** Todos los datos de la app: lo que se exporta e importa en un respaldo. */
export interface DatosApp {
  comidas: Comida[];
  mercado: ItemMercado[];
  nevera: ProductoNevera[];
  plan: PlanSemanal;
  agua: RegistroAgua | null;
}

const DB_NAME = 'food-planner-db';
const DB_VERSION = 2;
const STORE_COMIDAS = 'comidas';
const STORE_MERCADO = 'mercado';
const STORE_NEVERA = 'nevera';
const STORE_PLAN = 'plan';
const STORE_AGUA = 'agua';
const PLAN_KEY = 'semana';
const AGUA_KEY = 'hoy';

type StoreName = typeof STORE_COMIDAS | typeof STORE_MERCADO | typeof STORE_NEVERA | typeof STORE_PLAN | typeof STORE_AGUA;

const TODOS_LOS_STORES: StoreName[] = [STORE_COMIDAS, STORE_MERCADO, STORE_NEVERA, STORE_PLAN, STORE_AGUA];

@Injectable({ providedIn: 'root' })
export class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  // ===== Inicialización =====
  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = this.openDb();
    }
    return this.dbPromise;
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_COMIDAS)) {
          db.createObjectStore(STORE_COMIDAS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_MERCADO)) {
          db.createObjectStore(STORE_MERCADO, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_NEVERA)) {
          db.createObjectStore(STORE_NEVERA, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_PLAN)) {
          db.createObjectStore(STORE_PLAN);
        }
        if (!db.objectStoreNames.contains(STORE_AGUA)) {
          db.createObjectStore(STORE_AGUA);
        }
        // Datos base solo al crear la base de datos (primera vez que se abre la app).
        // Si después una lista queda vacía, su pantalla ofrece restaurarla.
        if (event.oldVersion === 0) {
          const tx = request.transaction!;
          comidasBase().forEach((c) => tx.objectStore(STORE_COMIDAS).put(c));
          mercadoBase().forEach((i) => tx.objectStore(STORE_MERCADO).put(i));
        }
      };
    });
  }

  // Los productos que vinieron de Mercado antes de existir itemMercadoId se enlazaban por
  // nombre: aquí se enlazan por id (solo toca productos aún sin enlazar).
  async init(): Promise<void> {
    const [nevera, mercado] = await Promise.all([this.getNevera(), this.getMercado()]);
    const enlazados = enlazarNeveraConMercado(nevera, mercado);
    if (enlazados.length > 0) {
      await this.putAll(STORE_NEVERA, enlazados);
    }
  }

  // ===== Operaciones genéricas =====
  private async getAll<T>(store: StoreName): Promise<T[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  private async put<T>(store: StoreName, value: T): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async putWithKey<T>(store: StoreName, key: string, value: T): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async delete(store: StoreName, id: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async putAll<T>(store: StoreName, values: T[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const os = tx.objectStore(store);
      values.forEach((v) => os.put(v));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async getByKey<T>(store: StoreName, key: string): Promise<T | undefined> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  // ===== Comidas =====
  getComidas(): Promise<Comida[]> {
    return this.getAll<Comida>(STORE_COMIDAS);
  }
  saveComida(comida: Comida): Promise<void> {
    return this.put(STORE_COMIDAS, comida);
  }
  /** Borra la comida y la quita de los días del plan donde estaba asignada. */
  async deleteComida(id: string): Promise<void> {
    await this.delete(STORE_COMIDAS, id);
    const plan = await this.getPlan();
    if (quitarComidaDelPlan(plan, id)) {
      await this.putPlan(plan);
    }
  }
  /** Vuelve a cargar las comidas base de un tipo (se ofrece cuando la sección queda vacía). */
  restaurarComidasBase(tipo: TipoComida): Promise<void> {
    return this.putAll(STORE_COMIDAS, comidasBase(tipo));
  }

  // ===== Mercado =====
  getMercado(): Promise<ItemMercado[]> {
    return this.getAll<ItemMercado>(STORE_MERCADO);
  }
  saveItemMercado(item: ItemMercado): Promise<void> {
    return this.put(STORE_MERCADO, item);
  }
  deleteItemMercado(id: string): Promise<void> {
    return this.delete(STORE_MERCADO, id);
  }
  /** Vuelve a cargar la lista base de una categoría (se ofrece cuando la sección queda vacía). */
  restaurarMercadoBase(categoria: CategoriaMercado): Promise<void> {
    return this.putAll(STORE_MERCADO, mercadoBase(categoria));
  }

  // ===== Nevera =====
  getNevera(): Promise<ProductoNevera[]> {
    return this.getAll<ProductoNevera>(STORE_NEVERA);
  }
  saveProductoNevera(producto: ProductoNevera): Promise<void> {
    return this.put(STORE_NEVERA, producto);
  }
  deleteProductoNevera(id: string): Promise<void> {
    return this.delete(STORE_NEVERA, id);
  }

  // ===== Plan Semanal =====
  async getPlan(): Promise<PlanSemanal> {
    return normalizarPlan(await this.getByKey<unknown>(STORE_PLAN, PLAN_KEY));
  }
  putPlan(plan: PlanSemanal): Promise<void> {
    return this.putWithKey(STORE_PLAN, PLAN_KEY, plan);
  }

  // ===== Hidratación =====
  async getAgua(): Promise<RegistroAgua> {
    const hoy = fechaHoy();
    const reg = await this.getByKey<RegistroAgua>(STORE_AGUA, AGUA_KEY);
    if (!reg || reg.fecha !== hoy) {
      return { fecha: hoy, vasos: 0 };
    }
    return reg;
  }
  putAgua(registro: RegistroAgua): Promise<void> {
    return this.putWithKey(STORE_AGUA, AGUA_KEY, registro);
  }

  // ===== Respaldo =====
  async exportarDatos(): Promise<DatosApp> {
    const [comidas, mercado, nevera, plan, agua] = await Promise.all([
      this.getComidas(),
      this.getMercado(),
      this.getNevera(),
      this.getPlan(),
      this.getByKey<RegistroAgua>(STORE_AGUA, AGUA_KEY),
    ]);
    return { comidas, mercado, nevera, plan, agua: agua ?? null };
  }

  /** Reemplaza todos los datos en una sola transacción: si algo falla, no cambia nada. */
  async reemplazarDatos(datos: DatosApp): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TODOS_LOS_STORES, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      try {
        TODOS_LOS_STORES.forEach((store) => tx.objectStore(store).clear());
        datos.comidas.forEach((c) => tx.objectStore(STORE_COMIDAS).put(c));
        datos.mercado.forEach((i) => tx.objectStore(STORE_MERCADO).put(i));
        datos.nevera.forEach((p) => tx.objectStore(STORE_NEVERA).put(p));
        tx.objectStore(STORE_PLAN).put(normalizarPlan(datos.plan), PLAN_KEY);
        if (datos.agua) {
          tx.objectStore(STORE_AGUA).put(datos.agua, AGUA_KEY);
        }
      } catch (error) {
        tx.abort();
        reject(error);
      }
    });
  }
}

// Planes guardados antes de manejar ids tenían la comida completa ({ desayuno: Comida }).
type ComidaDelDiaGuardada = ComidaDelDia & { desayuno?: { id?: string }; cena?: { id?: string } };

/** Lleva un plan guardado (formato actual o anterior) a solo ids, con los 7 días. */
export function normalizarPlan(guardado: unknown): PlanSemanal {
  const plan = planSemanalVacio();
  const origen = (guardado ?? {}) as Partial<Record<DiaSemana, ComidaDelDiaGuardada>>;
  for (const dia of DIAS_SEMANA) {
    const d = origen[dia];
    if (!d) continue;
    const desayunoId = d.desayunoId ?? d.desayuno?.id;
    const cenaId = d.cenaId ?? d.cena?.id;
    if (desayunoId) {
      plan[dia].desayunoId = desayunoId;
      if (d.desayunoConfirmado) plan[dia].desayunoConfirmado = true;
    }
    if (cenaId) {
      plan[dia].cenaId = cenaId;
      if (d.cenaConfirmado) plan[dia].cenaConfirmado = true;
    }
  }
  return plan;
}

/** Quita una comida de todos los días del plan. Devuelve true si cambió algo. */
export function quitarComidaDelPlan(plan: PlanSemanal, comidaId: string): boolean {
  let cambio = false;
  for (const dia of DIAS_SEMANA) {
    const d = plan[dia];
    if (d.desayunoId === comidaId) {
      delete d.desayunoId;
      delete d.desayunoConfirmado;
      cambio = true;
    }
    if (d.cenaId === comidaId) {
      delete d.cenaId;
      delete d.cenaConfirmado;
      cambio = true;
    }
  }
  return cambio;
}

/**
 * Enlaza por nombre los productos de la nevera sin itemMercadoId con un ítem de Mercado
 * comprado (cada ítem a lo sumo una vez). Devuelve los productos que quedaron enlazados.
 */
export function enlazarNeveraConMercado(nevera: ProductoNevera[], mercado: ItemMercado[]): ProductoNevera[] {
  const usados = new Set(nevera.map((p) => p.itemMercadoId).filter((id) => !!id));
  const enlazados: ProductoNevera[] = [];
  for (const producto of nevera) {
    if (producto.itemMercadoId) continue;
    const item = mercado.find((m) => m.comprado && m.nombre === producto.nombre && !usados.has(m.id));
    if (item) {
      usados.add(item.id);
      enlazados.push({ ...producto, itemMercadoId: item.id });
    }
  }
  return enlazados;
}
