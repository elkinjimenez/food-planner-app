export interface ProductoNevera {
  id: string;
  nombre: string;
  fechaVencimiento: string; // ISO date string (YYYY-MM-DD)
  itemMercadoId?: string; // Ítem de Mercado del que salió al marcarlo como comprado
}
