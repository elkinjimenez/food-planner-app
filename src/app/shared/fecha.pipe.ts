import { Pipe, PipeTransform } from '@angular/core';
import { formatearFecha } from '../utils/fecha';

/** Muestra una fecha YYYY-MM-DD como DD/MM/AAAA: {{ producto.fechaVencimiento | fecha }} */
@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(fecha: string): string {
    return formatearFecha(fecha);
  }
}
