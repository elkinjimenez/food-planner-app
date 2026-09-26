import { Pipe, PipeTransform } from '@angular/core';
import { Ingrediente } from '../models/comida.model';

/** Muestra los ingredientes separados por comas: {{ comida.ingredientes | ingredientes }} */
@Pipe({ name: 'ingredientes' })
export class IngredientesPipe implements PipeTransform {
  transform(ingredientes: Ingrediente[]): string {
    return ingredientes.map((i) => i.nombre).join(', ');
  }
}
