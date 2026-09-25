import { Injectable, inject } from '@angular/core';
import { DatosApp, StorageService } from './storage.service';
import { fechaHoy } from '../utils/fecha';

const APP = 'food-planner';
// Subir la versión si cambia el formato de los datos; validarRespaldo() decide qué versiones acepta.
const VERSION_RESPALDO = 1;

/** Contenido del archivo .json de respaldo. */
interface ArchivoRespaldo {
  app: typeof APP;
  version: number;
  exportado: string; // fecha y hora ISO
  datos: DatosApp;
}

@Injectable({ providedIn: 'root' })
export class RespaldoService {
  private storage = inject(StorageService);

  /** Arma el archivo con todos los datos. Se prepara antes del toque en "Exportar" (ver compartir). */
  async crearArchivo(): Promise<File> {
    const respaldo: ArchivoRespaldo = {
      app: APP,
      version: VERSION_RESPALDO,
      exportado: new Date().toISOString(),
      datos: await this.storage.exportarDatos(),
    };
    return new File([JSON.stringify(respaldo, null, 2)], `food-planner-respaldo-${fechaHoy()}.json`, {
      type: 'application/json',
    });
  }

  /**
   * En el teléfono abre el menú de compartir (en iPhone: "Guardar en Archivos"); en computador
   * descarga el archivo. Llamarlo directo en el toque: iOS solo permite compartir durante el gesto.
   */
  async compartir(archivo: File): Promise<void> {
    const esTactil = matchMedia('(pointer: coarse)').matches;
    if (esTactil && navigator.canShare?.({ files: [archivo] })) {
      try {
        await navigator.share({ files: [archivo], title: 'Respaldo de Food Planner' });
        return;
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return; // cerró el menú de compartir
        // Chrome/Edge en Windows (p. ej. con la vista de celular) dicen que pueden compartir
        // el .json pero luego lo rechazan con NotAllowedError: en ese caso se descarga.
        console.warn('No se pudo compartir el respaldo; se descarga en su lugar.', error);
      }
    }
    this.descargar(archivo);
  }

  private descargar(archivo: File): void {
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = archivo.name;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Lee y valida un archivo de respaldo. Si no sirve, lanza un Error con el mensaje para el usuario. */
  async leer(archivo: File): Promise<DatosApp> {
    let json: unknown;
    try {
      json = JSON.parse(await archivo.text());
    } catch {
      throw new Error('El archivo no es un respaldo válido.');
    }
    return validarRespaldo(json);
  }

  /** Reemplaza todos los datos actuales por los del respaldo. */
  importar(datos: DatosApp): Promise<void> {
    return this.storage.reemplazarDatos(datos);
  }
}

/** Comprueba que el JSON sea un respaldo de esta app y devuelve sus datos. */
export function validarRespaldo(json: unknown): DatosApp {
  const respaldo = json as Partial<ArchivoRespaldo> | null;
  if (!respaldo || respaldo.app !== APP || typeof respaldo.version !== 'number' || !respaldo.datos) {
    throw new Error('El archivo no es un respaldo de Food Planner.');
  }
  if (respaldo.version > VERSION_RESPALDO) {
    throw new Error('El respaldo es de una versión más nueva de la app. Actualízala e inténtalo de nuevo.');
  }
  const { comidas, mercado, nevera, plan, agua } = respaldo.datos;
  const listaConIds = (lista: unknown) =>
    Array.isArray(lista) && lista.every((x) => typeof (x as { id?: unknown })?.id === 'string');
  if (!listaConIds(comidas) || !listaConIds(mercado) || !listaConIds(nevera) || typeof plan !== 'object' || !plan) {
    throw new Error('El respaldo está incompleto o dañado.');
  }
  return { comidas, mercado, nevera, plan, agua: agua ?? null };
}
