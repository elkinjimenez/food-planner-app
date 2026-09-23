import { Injectable } from '@angular/core';
import { Comida } from '../models/comida.model';
import { ItemMercado } from '../models/item-mercado.model';
import { ProductoNevera } from '../models/producto-nevera.model';
import { PlanSemanal } from '../models/plan-semanal.model';
import { comidasSeed, mercadoSeed, neveraSeed, planSemanalVacio } from '../data/seed.data';

export interface RegistroAgua {
  fecha: string; // YYYY-MM-DD
  vasos: number;
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
      };
    });
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

  private async clearStore(store: StoreName): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
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

  // ===== Inicialización con datos seed =====
  async init(): Promise<void> {
    const comidas = await this.getAll<Comida>(STORE_COMIDAS);
    if (comidas.length === 0) {
      await this.putAll(STORE_COMIDAS, comidasSeed);
    }
    const mercado = await this.getAll<ItemMercado>(STORE_MERCADO);
    if (mercado.length === 0) {
      await this.putAll(STORE_MERCADO, mercadoSeed);
    }
    const nevera = await this.getAll<ProductoNevera>(STORE_NEVERA);
    if (nevera.length === 0) {
      await this.putAll(STORE_NEVERA, neveraSeed);
    }
    const plan = await this.getByKey<PlanSemanal>(STORE_PLAN, PLAN_KEY);
    if (!plan) {
      await this.putPlan(planSemanalVacio());
    }
    const agua = await this.getByKey<RegistroAgua>(STORE_AGUA, AGUA_KEY);
    if (!agua) {
      await this.putAgua({ fecha: fechaHoy(), vasos: 0 });
    }
  }

  // ===== Comidas =====
  getComidas(): Promise<Comida[]> {
    return this.getAll<Comida>(STORE_COMIDAS);
  }
  saveComida(comida: Comida): Promise<void> {
    return this.put(STORE_COMIDAS, comida);
  }
  deleteComida(id: string): Promise<void> {
    return this.delete(STORE_COMIDAS, id);
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
    const plan = await this.getByKey<PlanSemanal>(STORE_PLAN, PLAN_KEY);
    return plan ?? planSemanalVacio();
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
}

function fechaHoy(): string {
  return new Date().toISOString().split('T')[0];
}
