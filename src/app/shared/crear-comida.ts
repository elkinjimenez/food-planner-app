import { inject } from '@angular/core';
import { Comida, TipoComida } from '../models/comida.model';
import { StorageService } from '../services/storage.service';
import { uuid } from '../utils/uuid';
import { EditarItemConfig, injectAbrirEditor } from './editar-item.modal';

/** Lo común del modal de agregar y editar una comida. */
export const EDITOR_COMIDA = {
  icono: 'restaurant-outline',
  label1: 'Nombre',
  label2: 'Ingredientes (opcional)',
  input2Type: 'ingredientes',
  campo2Opcional: true,
  labelOpcion: 'Tipo',
  opciones: [
    { valor: 'desayuno', texto: 'Desayuno' },
    { valor: 'cena', texto: 'Cena' },
  ],
} satisfies Partial<EditarItemConfig>;

/**
 * Para un campo de la página o modal: devuelve crearComida(tipo), que abre el modal con ese tipo
 * elegido y guarda la comida (con lo que se creó en Mercado). Entrega la comida o null si se cancela.
 */
export function injectCrearComida(): (tipo: TipoComida) => Promise<Comida | null> {
  const storage = inject(StorageService);
  const abrirEditor = injectAbrirEditor();
  return async (tipo) => {
    const data = await abrirEditor({
      ...EDITOR_COMIDA,
      // Título general: el tipo se puede cambiar en el selector
      titulo: 'Agregar comida',
      boton: 'Agregar',
      value1: '',
      value2: '',
      ingredientes: [],
      mercado: await storage.getMercado(),
      opcion: tipo,
    });
    if (!data) return null;
    const nueva: Comida = {
      id: uuid(),
      nombre: data.value1,
      ingredientes: data.ingredientes,
      tipo: data.opcion as TipoComida,
    };
    await storage.saveComida(nueva, data.nuevosEnMercado);
    return nueva;
  };
}
