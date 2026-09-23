export interface ItemMercado {
  id: string;
  nombre: string;
  duracion: string;
  categoria: 'supermercado' | 'fruver';
  comprado: boolean;
}

export type CategoriaMercado = ItemMercado['categoria'];
