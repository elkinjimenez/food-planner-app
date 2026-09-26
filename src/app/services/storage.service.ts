import { Injectable, inject } from '@angular/core';
import { Comida, TipoComida } from '../models/comida.model';
import { CategoriaMercado, ItemMercado } from '../models/item-mercado.model';
import { ProductoNevera } from '../models/producto-nevera.model';
import { ComidaDelDia, DIAS_SEMANA, DiaSemana, PlanSemanal, semanaDesde } from '../models/plan-semanal.model';
import { RegistroAgua, RegistroComidas } from '../models/historial.model';
import { comidasBase, mercadoBase, planSemanalVacio } from '../data/seed.data';
import { fechaHoy } from '../utils/fecha';
import { AppUpdateService } from './app-update.service';

/** Todos los datos de la app: lo que se exporta e importa en un respaldo. */
export interface DatosApp {
  comidas: Comida[];
  mercado: ItemMercado[];
  nevera: ProductoNevera[];
  plan: PlanSemanal;
  comidasConfirmadas: RegistroComidas[];
  agua: RegistroAgua[];
}

const DB_NAME = 'food-planner-db';
// v3: historial por fecha (comidas confirmadas y agua de cada día)
const DB_VERSION = 3;
const STORE_COMIDAS = 'comidas';
const STORE_MERCADO = 'mercado';
const STORE_NEVERA = 'nevera';
const STORE_PLAN = 'plan';
const STORE_CONFIRMADAS = 'comidasConfirmadas'; // un registro por fecha (llave: fecha)
const STORE_AGUA = 'agua'; // un registro por fecha (llave: fecha)
const PLAN_KEY = 'semana';
const LIMITE_APERTURA_MS = 3000;
// Hasta v2 solo se guardaba el agua del día en curso, siempre en esta llave
const AGUA_KEY_ANTERIOR = 'hoy';

type StoreName =
  | typeof STORE_COMIDAS
  | typeof STORE_MERCADO
  | typeof STORE_NEVERA
  | typeof STORE_PLAN
  | typeof STORE_CONFIRMADAS
  | typeof STORE_AGUA;

const TODOS_LOS_STORES: StoreName[] = [
  STORE_COMIDAS,
  STORE_MERCADO,
  STORE_NEVERA,
  STORE_PLAN,
  STORE_CONFIRMADAS,
  STORE_AGUA,
];

const TIPOS_COMIDA: TipoComida[] = ['desayuno', 'cena'];

/** Fechas entre `desde` y `hasta` (incluidas); sin `hasta`, de `desde` en adelante. */
function rangoDeFechas(desde: string, hasta?: string): IDBKeyRange {
  return hasta ? IDBKeyRange.bound(desde, hasta) : IDBKeyRange.lowerBound(desde);
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private appUpdate = inject(AppUpdateService);

  private dbPromise: Promise<IDBDatabase> | null = null;
  private buscoVersionNueva = false;

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
      // En iOS la apertura a veces no responde nunca: pasado el límite se da por fallida
      // (conReintento abre otra conexión)
      let vencida = false;
      const limite = setTimeout(() => {
        vencida = true;
        reject(new Error('IndexedDB no respondió'));
      }, LIMITE_APERTURA_MS);
      request.onerror = () => {
        clearTimeout(limite);
        // La base ya la actualizó una versión más nueva de la app y esta ventana corre una
        // anterior, que no puede abrirla: se busca la nueva (una sola vez, para no recargar en bucle)
        if (request.error?.name === 'VersionError' && !this.buscoVersionNueva) {
          this.buscoVersionNueva = true;
          this.appUpdate.pasarAVersionNueva();
        }
        reject(request.error);
      };
      request.onsuccess = () => {
        clearTimeout(limite);
        const db = request.result;
        // Respondió tarde, cuando ya se estaba abriendo otra conexión
        if (vencida) {
          db.close();
          return;
        }
        // Otra pestaña abrió una versión más nueva de la app que actualiza la base de datos:
        // se cierra esta conexión para no bloquearla y se recarga con la versión nueva.
        db.onversionchange = () => {
          db.close();
          location.reload();
        };
        db.onclose = () => {
          this.dbPromise = null;
        };
        resolve(db);
      };
      request.onupgradeneeded = (event) => {
        const db = request.result;
        const tx = request.transaction!;
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
        if (!db.objectStoreNames.contains(STORE_CONFIRMADAS)) {
          db.createObjectStore(STORE_CONFIRMADAS, { keyPath: 'fecha' });
        }
        if (!db.objectStoreNames.contains(STORE_AGUA)) {
          db.createObjectStore(STORE_AGUA);
        }
        if (event.oldVersion === 0) {
          // Datos base solo al crear la base de datos (primera vez que se abre la app).
          // Si después una lista queda vacía, su pantalla ofrece restaurarla.
          comidasBase().forEach((c) => tx.objectStore(STORE_COMIDAS).put(c));
          mercadoBase().forEach((i) => tx.objectStore(STORE_MERCADO).put(i));
        } else if (event.oldVersion < 3) {
          migrarAHistorialPorFecha(tx);
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
  /**
   * iOS cierra la conexión cuando la PWA queda suspendida y al volver todas las operaciones
   * fallan: si una falla, se abre una conexión nueva y se reintenta una vez.
   */
  private async conReintento<T>(operacion: (db: IDBDatabase) => Promise<T>): Promise<T> {
    try {
      return await operacion(await this.getDb());
    } catch {
      this.dbPromise = null;
      return operacion(await this.getDb());
    }
  }

  private getAll<T>(store: StoreName, rango?: IDBKeyRange): Promise<T[]> {
    return this.conReintento(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(store, 'readonly');
          const req = tx.objectStore(store).getAll(rango);
          req.onsuccess = () => resolve(req.result as T[]);
          req.onerror = () => reject(req.error);
        }),
    );
  }

  private put<T>(store: StoreName, value: T): Promise<void> {
    return this.conReintento(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(store, 'readwrite');
          tx.objectStore(store).put(value);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }),
    );
  }

  private putWithKey<T>(store: StoreName, key: string, value: T): Promise<void> {
    return this.conReintento(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(store, 'readwrite');
          tx.objectStore(store).put(value, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }),
    );
  }

  private delete(store: StoreName, id: string): Promise<void> {
    return this.conReintento(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(store, 'readwrite');
          tx.objectStore(store).delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }),
    );
  }

  private putAll<T>(store: StoreName, values: T[]): Promise<void> {
    return this.conReintento(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(store, 'readwrite');
          const os = tx.objectStore(store);
          values.forEach((v) => os.put(v));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        }),
    );
  }

  private getByKey<T>(store: StoreName, key: string): Promise<T | undefined> {
    return this.conReintento(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(store, 'readonly');
          const req = tx.objectStore(store).get(key);
          req.onsuccess = () => resolve(req.result as T | undefined);
          req.onerror = () => reject(req.error);
        }),
    );
  }

  // ===== Comidas =====
  getComidas(): Promise<Comida[]> {
    return this.getAll<Comida>(STORE_COMIDAS);
  }
  saveComida(comida: Comida): Promise<void> {
    return this.put(STORE_COMIDAS, comida);
  }
  /**
   * Borra la comida y la quita del plan y de lo confirmado de hoy en adelante.
   * Lo confirmado en días pasados se queda en el historial, con su nombre.
   * Devuelve una función que deshace el borrado (sin pisar lo que se haya puesto en su lugar).
   */
  async deleteComida(id: string): Promise<() => Promise<void>> {
    const comida = await this.getByKey<Comida>(STORE_COMIDAS, id);
    await this.delete(STORE_COMIDAS, id);
    const plan = await this.getPlan();
    const planAntes = structuredClone(plan);
    if (quitarComidaDelPlan(plan, id)) {
      await this.putPlan(plan);
    }
    const confirmadasAntes: RegistroComidas[] = [];
    for (const registro of await this.getComidasConfirmadas(fechaHoy())) {
      const antes = structuredClone(registro);
      if (quitarComidaConfirmada(registro, id)) {
        confirmadasAntes.push(antes);
        await this.saveComidasConfirmadas(registro);
      }
    }

    return async () => {
      if (comida) await this.saveComida(comida);
      const plan = await this.getPlan();
      let cambio = false;
      for (const dia of DIAS_SEMANA) {
        for (const tipo of TIPOS_COMIDA) {
          const campo = `${tipo}Id` as const;
          if (planAntes[dia][campo] === id && !plan[dia][campo]) {
            plan[dia][campo] = id;
            cambio = true;
          }
        }
      }
      if (cambio) await this.putPlan(plan);
      for (const antes of confirmadasAntes) {
        const [registro = { fecha: antes.fecha }] = await this.getComidasConfirmadas(antes.fecha, antes.fecha);
        for (const tipo of TIPOS_COMIDA) {
          if (antes[tipo]?.id === id && !registro[tipo]) registro[tipo] = antes[tipo];
        }
        await this.saveComidasConfirmadas(registro);
      }
    };
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

  // ===== Comidas confirmadas (historial por fecha) =====
  /** Lo confirmado entre dos fechas (incluidas); sin `hasta`, de `desde` en adelante. */
  getComidasConfirmadas(desde: string, hasta?: string): Promise<RegistroComidas[]> {
    return this.getAll<RegistroComidas>(STORE_CONFIRMADAS, rangoDeFechas(desde, hasta));
  }
  /** Guarda lo confirmado en una fecha; si ya no queda nada confirmado, borra el registro. */
  saveComidasConfirmadas(registro: RegistroComidas): Promise<void> {
    return registro.desayuno || registro.cena
      ? this.put(STORE_CONFIRMADAS, registro)
      : this.delete(STORE_CONFIRMADAS, registro.fecha);
  }

  // ===== Hidratación (historial por fecha) =====
  async getAgua(fecha: string): Promise<RegistroAgua> {
    return (await this.getByKey<RegistroAgua>(STORE_AGUA, fecha)) ?? { fecha, vasos: 0 };
  }
  putAgua(registro: RegistroAgua): Promise<void> {
    return this.putWithKey(STORE_AGUA, registro.fecha, registro);
  }
  /** El agua de cada día entre dos fechas (incluidas); los días sin registro no vienen. */
  getAguaEntre(desde: string, hasta: string): Promise<RegistroAgua[]> {
    return this.getAll<RegistroAgua>(STORE_AGUA, rangoDeFechas(desde, hasta));
  }

  // ===== Respaldo =====
  async exportarDatos(): Promise<DatosApp> {
    const [comidas, mercado, nevera, plan, comidasConfirmadas, agua] = await Promise.all([
      this.getComidas(),
      this.getMercado(),
      this.getNevera(),
      this.getPlan(),
      this.getAll<RegistroComidas>(STORE_CONFIRMADAS),
      this.getAll<RegistroAgua>(STORE_AGUA),
    ]);
    return { comidas, mercado, nevera, plan, comidasConfirmadas, agua };
  }

  /** Reemplaza todos los datos en una sola transacción: si algo falla, no cambia nada. */
  reemplazarDatos(datos: DatosApp): Promise<void> {
    return this.conReintento(
      (db) =>
        new Promise((resolve, reject) => {
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
            datos.comidasConfirmadas.forEach((r) => tx.objectStore(STORE_CONFIRMADAS).put(r));
            datos.agua.forEach((r) => tx.objectStore(STORE_AGUA).put(r, r.fecha));
          } catch (error) {
            tx.abort();
            reject(error);
          }
        }),
    );
  }
}

/**
 * v3: el historial pasa a guardarse por fecha. Hasta v2 el agua ocupaba una sola llave
 * ('hoy') y la confirmación era una marca en el plan, por día de la semana y sin fecha.
 * Corre dentro de la actualización de la base de datos: termina antes de cualquier lectura.
 */
function migrarAHistorialPorFecha(tx: IDBTransaction): void {
  const agua = tx.objectStore(STORE_AGUA);
  const reqAgua = agua.get(AGUA_KEY_ANTERIOR);
  reqAgua.onsuccess = () => {
    const registro = reqAgua.result as RegistroAgua | undefined;
    if (registro?.fecha) {
      agua.put(registro, registro.fecha);
    }
    agua.delete(AGUA_KEY_ANTERIOR);
  };

  const plan = tx.objectStore(STORE_PLAN);
  const reqPlan = plan.get(PLAN_KEY);
  const reqComidas = tx.objectStore(STORE_COMIDAS).getAll();
  // Las peticiones de una transacción terminan en orden: aquí el plan ya se leyó
  reqComidas.onsuccess = () => {
    if (!reqPlan.result) return;
    const confirmadas = confirmacionesDelPlanAnterior(reqPlan.result, reqComidas.result as Comida[], fechaHoy());
    confirmadas.forEach((r) => tx.objectStore(STORE_CONFIRMADAS).put(r));
    plan.put(normalizarPlan(reqPlan.result), PLAN_KEY);
  };
}

// Plan como pudo quedar guardado: con la comida completa ({ desayuno: Comida }, antes de
// manejar ids) y con la confirmación como marca del día de la semana (hasta v2).
type ComidaDelDiaGuardada = ComidaDelDia & {
  desayuno?: { id?: string };
  cena?: { id?: string };
  desayunoConfirmado?: boolean;
  cenaConfirmado?: boolean;
};
type PlanGuardado = Partial<Record<DiaSemana, ComidaDelDiaGuardada>>;

function idGuardado(dia: ComidaDelDiaGuardada | undefined, tipo: TipoComida): string | undefined {
  return dia?.[`${tipo}Id` as const] ?? dia?.[tipo]?.id;
}

/** Lleva un plan guardado (formato actual o anterior) a solo ids, con los 7 días. */
export function normalizarPlan(guardado: unknown): PlanSemanal {
  const origen = (guardado ?? {}) as PlanGuardado;
  const plan = planSemanalVacio();
  for (const dia of DIAS_SEMANA) {
    const desayunoId = idGuardado(origen[dia], 'desayuno');
    const cenaId = idGuardado(origen[dia], 'cena');
    if (desayunoId) plan[dia].desayunoId = desayunoId;
    if (cenaId) plan[dia].cenaId = cenaId;
  }
  return plan;
}

/**
 * Pasa al historial la confirmación de un plan guardado hasta v2 (marca por día de la semana,
 * sin fecha): cada día confirmado toma la fecha que tiene en la semana que se ve hoy (Semana
 * empieza hoy), así lo confirmado se sigue viendo igual. Como antes, solo cuenta si la comida
 * aún existe.
 */
export function confirmacionesDelPlanAnterior(guardado: unknown, comidas: Comida[], hoy: string): RegistroComidas[] {
  const origen = (guardado ?? {}) as PlanGuardado;
  const porId = new Map(comidas.map((c) => [c.id, c]));
  const registros: RegistroComidas[] = [];
  for (const { fecha, dia } of semanaDesde(hoy)) {
    const registro: RegistroComidas = { fecha };
    for (const tipo of TIPOS_COMIDA) {
      const comida = porId.get(idGuardado(origen[dia], tipo) ?? '');
      if (comida && origen[dia]?.[`${tipo}Confirmado` as const]) {
        registro[tipo] = { id: comida.id, nombre: comida.nombre };
      }
    }
    if (registro.desayuno || registro.cena) {
      registros.push(registro);
    }
  }
  return registros;
}

/** Quita una comida de todos los días del plan. Devuelve true si cambió algo. */
export function quitarComidaDelPlan(plan: PlanSemanal, comidaId: string): boolean {
  let cambio = false;
  for (const dia of DIAS_SEMANA) {
    const d = plan[dia];
    if (d.desayunoId === comidaId) {
      delete d.desayunoId;
      cambio = true;
    }
    if (d.cenaId === comidaId) {
      delete d.cenaId;
      cambio = true;
    }
  }
  return cambio;
}

/** Quita una comida de lo confirmado en una fecha. Devuelve true si cambió algo. */
export function quitarComidaConfirmada(registro: RegistroComidas, comidaId: string): boolean {
  let cambio = false;
  for (const tipo of TIPOS_COMIDA) {
    if (registro[tipo]?.id === comidaId) {
      delete registro[tipo];
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
