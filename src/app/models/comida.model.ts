export interface Ingrediente {
  // Con itemMercadoId se muestra el nombre del ítem (buscado por id); este queda por si el ítem se borra
  nombre: string;
  itemMercadoId?: string; // Producto de Mercado; los ingredientes de antes (texto) no lo tienen
}

export interface Comida {
  id: string;
  nombre: string;
  ingredientes: Ingrediente[];
  tipo: 'desayuno' | 'cena';
}

export type TipoComida = Comida['tipo'];

export const TIPOS_COMIDA: TipoComida[] = ['desayuno', 'cena'];
