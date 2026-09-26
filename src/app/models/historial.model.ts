// Historial por fecha (YYYY-MM-DD): lo que se confirmó comer y el agua de cada día.
// Se guarda un registro por fecha, así se puede ver cualquier día en el calendario.

/** Meta diaria de hidratación por defecto, en vasos de unos 250 ml. */
export const META_VASOS = 8;

/** Vasos de agua tomados en una fecha. */
export interface RegistroAgua {
  fecha: string; // YYYY-MM-DD
  vasos: number;
  // Meta de ese día: la vigente es la del último registro. Los guardados antes de poder
  // cambiarla no la tienen (era META_VASOS).
  meta?: number;
}

/**
 * Comida confirmada: "esa es mi elección del día" (la voy a preparar o ya la preparé).
 * Guarda también el nombre, por si después la comida se borra de "Mis Comidas".
 */
export interface ComidaConfirmada {
  id: string;
  nombre: string;
}

/** Comidas confirmadas en una fecha. */
export interface RegistroComidas {
  fecha: string; // YYYY-MM-DD
  desayuno?: ComidaConfirmada;
  cena?: ComidaConfirmada;
}
