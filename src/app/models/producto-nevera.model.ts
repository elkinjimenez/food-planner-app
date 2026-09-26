export interface ProductoNevera {
  id: string;
  // Con itemMercadoId se muestra el nombre del ítem (buscado por id); este queda por si el ítem se borra
  nombre: string;
  fechaVencimiento: string; // ISO date string (YYYY-MM-DD)
  itemMercadoId?: string; // Ítem de Mercado del que salió al marcarlo como comprado
}
