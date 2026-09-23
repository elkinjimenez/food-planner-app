export interface Comida {
  id: string;
  nombre: string;
  ingredientes?: string;
  tipo: 'desayuno' | 'cena';
}

export type TipoComida = Comida['tipo'];
