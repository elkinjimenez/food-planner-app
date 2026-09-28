import { Injectable, inject } from '@angular/core';
import { DatosApp, StorageService, confirmacionesDelPlanAnterior } from './storage.service';
import { RegistroAgua } from '../models/historial.model';
import { fechaHoy, formatearFecha } from '../utils/fecha';

const APP = 'food-planner';
// Subir la versión si cambia el formato de los datos; validarRespaldo() decide qué versiones acepta.
// v2: historial por fecha (comidasConfirmadas y el agua de cada día).
const VERSION_RESPALDO = 2;
// En el mensaje, el código (base64) va después de "FP:"
const PREFIJO_CODIGO = 'FP:';
const CODIGO = /FP:([A-Za-z0-9+/=\s]+)/;

/** Contenido de un respaldo: va comprimido en el código del mensaje. */
interface ContenidoRespaldo {
  app: typeof APP;
  version: number;
  exportado: string; // fecha y hora ISO
  datos: DatosApp;
}

@Injectable({ providedIn: 'root' })
export class RespaldoService {
  private storage = inject(StorageService);

  /**
   * Mensaje con todos los datos para compartir (p. ej. enviárselo a uno mismo por WhatsApp)
   * o copiar. Se prepara antes del toque en "Exportar": iOS solo deja compartir durante el toque.
   */
  async crearMensaje(): Promise<string> {
    const respaldo: ContenidoRespaldo = {
      app: APP,
      version: VERSION_RESPALDO,
      exportado: new Date().toISOString(),
      datos: await this.storage.exportarDatos(),
    };
    return [
      `📦 Respaldo de Food Planner · ${formatearFecha(fechaHoy())}`,
      'Para recuperar tus datos: en la app toca el botón de respaldo › "Importar respaldo" y pega este mensaje completo.',
      PREFIJO_CODIGO + (await comprimir(JSON.stringify(respaldo))),
    ].join('\n\n');
  }

  /**
   * Lee y valida un respaldo pegado: el mensaje completo, solo el código o el JSON de un respaldo
   * anterior en archivo. Si no sirve, lanza un Error con el mensaje para el usuario.
   */
  async leer(texto: string): Promise<DatosApp> {
    let json: unknown;
    try {
      const codigo = texto.match(CODIGO)?.[1];
      // Al copiar o reenviar el mensaje pueden colarse saltos de línea en el código
      json = JSON.parse(codigo ? await descomprimir(codigo.replace(/\s/g, '')) : texto);
    } catch {
      throw new Error('El texto no es un respaldo válido. Revisa que hayas copiado el mensaje completo.');
    }
    return validarRespaldo(json);
  }

  /** Reemplaza todos los datos actuales por los del respaldo. */
  importar(datos: DatosApp): Promise<void> {
    return this.storage.reemplazarDatos(datos);
  }
}

// El JSON comprimido y en base64 queda de una fracción del tamaño: cabe en un mensaje de WhatsApp
async function comprimir(texto: string): Promise<string> {
  const stream = new Blob([texto]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

async function descomprimir(codigo: string): Promise<string> {
  const bytes = Uint8Array.from(atob(codigo), (c) => c.charCodeAt(0));
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
}

// v1: el agua era solo la del día en curso y lo confirmado iba en el plan, sin fecha
type DatosV1 = Omit<DatosApp, 'comidasConfirmadas' | 'agua'> & { agua?: RegistroAgua | null };

/**
 * Comprueba que el JSON sea un respaldo de esta app y devuelve sus datos en el formato actual.
 * Lo confirmado en un respaldo v1 queda en las fechas de la semana que empieza `hoy`.
 */
export function validarRespaldo(json: unknown, hoy = fechaHoy()): DatosApp {
  const respaldo = json as Partial<ContenidoRespaldo> | null;
  if (!respaldo || respaldo.app !== APP || typeof respaldo.version !== 'number' || !respaldo.datos) {
    throw new Error('El texto no es un respaldo de Food Planner.');
  }
  if (respaldo.version > VERSION_RESPALDO) {
    throw new Error('El respaldo es de una versión más nueva de la app. Actualízala e inténtalo de nuevo.');
  }
  const incompleto = new Error('El respaldo está incompleto o dañado.');
  const { comidas, mercado, nevera, plan } = respaldo.datos;
  const listaCon = (llave: 'id' | 'fecha', lista: unknown) =>
    Array.isArray(lista) && lista.every((x) => typeof (x as Record<string, unknown> | null)?.[llave] === 'string');
  if (!listaCon('id', comidas) || !listaCon('id', mercado) || !listaCon('id', nevera) || typeof plan !== 'object' || !plan) {
    throw incompleto;
  }

  if (respaldo.version === 1) {
    const { agua } = respaldo.datos as unknown as DatosV1;
    return {
      comidas,
      mercado,
      nevera,
      plan,
      comidasConfirmadas: confirmacionesDelPlanAnterior(plan, comidas, hoy),
      agua: typeof agua?.fecha === 'string' ? [agua] : [],
    };
  }

  const { comidasConfirmadas, agua } = respaldo.datos;
  if (!listaCon('fecha', comidasConfirmadas) || !listaCon('fecha', agua)) {
    throw incompleto;
  }
  return { comidas, mercado, nevera, plan, comidasConfirmadas, agua };
}
