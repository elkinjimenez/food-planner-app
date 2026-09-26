import { ChangeDetectorRef, Component, ElementRef, Signal, computed, signal, inject, viewChildren } from '@angular/core';
import {
  IonContent,
  IonCheckbox,
  IonButton,
  IonIcon,
  IonLabel,
  IonFab,
  IonFabButton,
  IonCard,
  ActionSheetController,
} from '@ionic/angular';
import { CategoriaMercado, ItemMercado } from '../../models/item-mercado.model';
import { ProductoNevera } from '../../models/producto-nevera.model';
import { uuid } from '../../utils/uuid';
import { DURACIONES, parsearDuracionADias, calcularFechaVencimiento } from '../../utils/duracion';
import { deslizarFilas } from '../../utils/deslizar-filas';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { EditarItemConfig, injectAbrirEditor } from '../../shared/editar-item.modal';
import { SeccionPlegableComponent } from '../../shared/seccion-plegable.component';

// Lo común del modal de agregar y editar
const EDITOR_MERCADO = {
  icono: 'cart-outline',
  label1: 'Nombre',
  label2: 'Duración aprox.',
  sugerencias2: DURACIONES,
  labelOpcion: 'Categoría',
  opciones: [
    { valor: 'supermercado', texto: 'Supermercado' },
    { valor: 'fruver', texto: 'Fruver' },
  ],
} satisfies Partial<EditarItemConfig>;

/** Datos de cada sección de la vista (Supermercado y Fruver): la plantilla las dibuja con un solo @for. */
interface SeccionMercado {
  categoria: CategoriaMercado;
  titulo: string;
  icono: string;
  tono: string;
  vacio: string;
  items: Signal<ItemMercado[]>;
  cantidad: Signal<string>; // comprados/total
}

@Component({
  selector: 'app-mercado',
  templateUrl: 'mercado.page.html',
  styleUrls: ['mercado.page.scss'],
  imports: [
    IonContent,
    IonCheckbox,
    IonButton,
    IonIcon,
    IonLabel,
    IonFab,
    IonFabButton,
    IonCard,
    SeccionPlegableComponent,
  ],
})
export class MercadoPage {
  private storage = inject(StorageService);
  private alert = inject(AlertService);
  private abrirEditor = injectAbrirEditor();
  private actionSheetCtrl = inject(ActionSheetController);
  private cdr = inject(ChangeDetectorRef);

  // En el orden de la pantalla (los comprados al final): solo se reordena al cargar
  items = signal<ItemMercado[]>([]);
  hayComprados = computed(() => this.items().some((i) => i.comprado));
  hayPendientes = computed(() => this.items().some((i) => !i.comprado));
  readonly secciones: SeccionMercado[] = [
    this.seccion({
      categoria: 'supermercado',
      titulo: 'Supermercado',
      icono: 'cart-outline',
      tono: 'tono-supermercado',
      vacio: 'Tu lista de supermercado está vacía',
    }),
    this.seccion({
      categoria: 'fruver',
      titulo: 'Fruver',
      icono: 'leaf-outline',
      tono: 'tono-fruver',
      vacio: 'Tu lista de fruver está vacía',
    }),
  ];
  private filas = viewChildren('fila', { read: ElementRef<HTMLElement> });

  private seccion(datos: Omit<SeccionMercado, 'items' | 'cantidad'>): SeccionMercado {
    const items = computed(() => this.items().filter((i) => i.categoria === datos.categoria));
    const cantidad = computed(() => `${items().filter((i) => i.comprado).length}/${items().length}`);
    return { ...datos, items, cantidad };
  }

  // Ionic lo llama también al entrar la primera vez: no hace falta cargar en ngOnInit
  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    this.mostrar(await this.storage.getMercado());
  }

  private mostrar(data: ItemMercado[]): void {
    this.items.set(data.sort((a, b) => Number(a.comprado) - Number(b.comprado)));
  }

  /**
   * Comparte lo que falta por comprar, por categoría, como texto (p. ej. por WhatsApp).
   * En computador lo copia. Sin await antes de compartir o copiar: iOS solo lo permite durante el toque.
   */
  async compartirLista(): Promise<void> {
    const texto = this.textoLista();
    if (matchMedia('(pointer: coarse)').matches && navigator.share) {
      try {
        await navigator.share({ text: texto });
        return;
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') return; // cerró el menú de compartir
        // iOS a veces lo rechaza (p. ej. si un compartir anterior quedó "en curso")
        console.warn('No se abrió el menú de compartir:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(texto);
        await this.alert.toast('Lista copiada');
        return;
      } catch (error) {
        console.warn('No se pudo copiar la lista:', error);
      }
    }
    // Tras un intento fallido el toque ya no sirve para compartir ni copiar: se ofrece en un
    // menú, donde cada opción es un toque nuevo
    const opciones = await this.actionSheetCtrl.create({
      header: 'Compartir lista',
      buttons: [
        { text: 'Enviar por WhatsApp', handler: () => void (location.href = `whatsapp://send?text=${encodeURIComponent(texto)}`) },
        { text: 'Copiar lista', handler: () => void this.copiar(texto) },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await opciones.present();
  }

  private textoLista(): string {
    const categorias = this.secciones
      .map((s) => ({ titulo: s.titulo, pendientes: s.items().filter((i) => !i.comprado) }))
      .filter((s) => s.pendientes.length > 0)
      .map((s) => [`*${s.titulo}*`, ...s.pendientes.map((i) => `• ${i.nombre}`)].join('\n'));
    return ['🛒 Lista de mercado', ...categorias].join('\n\n');
  }

  private async copiar(texto: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(texto);
      await this.alert.toast('Lista copiada');
    } catch {
      await this.alert.aviso('No se pudo copiar', 'Inténtalo de nuevo.');
    }
  }

  /**
   * Marca o desmarca en una sola transacción: con toques muy seguidos cada uno corre
   * completo y en orden.
   */
  async toggleComprado(item: ItemMercado, comprado: boolean): Promise<void> {
    const actualizado: ItemMercado = { ...item, comprado };
    // Se marca en su lugar: cargarDeslizando() lo lleva después a su nuevo puesto
    this.items.update((items) => items.map((i) => (i.id === item.id ? actualizado : i)));

    if (comprado) {
      // Al marcar como comprado, agregar a nevera con fecha de vencimiento calculada
      const dias = parsearDuracionADias(item.duracion);
      const producto: ProductoNevera = {
        id: uuid(),
        nombre: item.nombre,
        fechaVencimiento: calcularFechaVencimiento(dias),
        itemMercadoId: item.id,
      };
      await this.storage.marcarComprados([actualizado], [producto]);
    } else {
      // Al desmarcar, quitar de la nevera lo que salió de este ítem
      await this.storage.desmarcarComprados([actualizado]);
    }

    setTimeout(() => this.cargarDeslizando(), 400);
  }

  /** Recarga la lista deslizando cada fila a su nuevo lugar en vez de saltar. */
  private async cargarDeslizando(): Promise<void> {
    const data = await this.storage.getMercado();
    deslizarFilas(this.filas(), () => {
      this.mostrar(data);
      this.cdr.detectChanges();
    });
  }

  async desmarcarTodo(): Promise<void> {
    const ids = new Set(this.items().filter((i) => i.comprado).map((i) => i.id));
    const nevera = await this.storage.getNevera();
    const enNevera = nevera.filter((p) => p.itemMercadoId && ids.has(p.itemMercadoId)).length;
    const carrito = ids.size === 1 ? 'Se desmarcará 1 producto' : `Se desmarcarán ${ids.size} productos`;
    const detalle =
      enNevera === 0
        ? ''
        : enNevera >= ids.size
          ? ` y ${ids.size === 1 ? 'se sacará' : 'se sacarán'} de la Nevera`
          : ` y ${enNevera} de ellos ${enNevera === 1 ? 'se sacará' : 'se sacarán'} de la Nevera`;
    const actionSheet = await this.actionSheetCtrl.create({
      header: '¿Desmarcar todo?',
      subHeader: `${carrito}${detalle}`,
      buttons: [
        { text: 'Sí, desmarcar', role: 'destructive' },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await actionSheet.present();
    // Después de cerrarse y no en el handler: el action sheet espera al handler para cerrarse
    // y este espera al aviso de "Deshacer"
    const { role } = await actionSheet.onDidDismiss();
    if (role === 'destructive') await this.ejecutarDesmarcarTodo();
  }

  private async ejecutarDesmarcarTodo(): Promise<void> {
    const comprados = this.items().filter((i) => i.comprado);
    const sacados = await this.storage.desmarcarComprados(comprados);
    await this.cargarDeslizando();
    const productos = comprados.length === 1 ? '1 producto' : `${comprados.length} productos`;
    const deshacer = await this.alert.toast(productos, { tipo: 'pendiente', header: 'Lista desmarcada', deshacer: true });
    if (!deshacer) return;
    await this.storage.marcarComprados(comprados, sacados);
    await this.cargarDeslizando();
  }

  async restaurarBase(categoria: CategoriaMercado): Promise<void> {
    await this.storage.restaurarMercadoBase(categoria);
    await this.cargar();
  }

  /** La categoría se elige en el mismo modal; empieza en supermercado. */
  async agregar(categoria: CategoriaMercado = 'supermercado'): Promise<void> {
    const data = await this.abrirEditor({
      ...EDITOR_MERCADO,
      titulo: 'Agregar producto',
      boton: 'Agregar',
      value1: '',
      value2: '',
      opcion: categoria,
    });
    if (!data) return;
    const nuevo: ItemMercado = {
      id: uuid(),
      nombre: data.value1,
      duracion: data.value2 || '',
      categoria: data.opcion as CategoriaMercado,
      comprado: false,
    };
    await this.storage.saveItemMercado(nuevo);
    await this.cargar();
  }

  async editar(item: ItemMercado): Promise<void> {
    const data = await this.abrirEditor({
      ...EDITOR_MERCADO,
      titulo: 'Editar producto',
      boton: 'Guardar',
      value1: item.nombre,
      value2: item.duracion,
      opcion: item.categoria,
    });
    if (!data) return;
    await this.storage.saveItemMercado({
      ...item,
      nombre: data.value1,
      duracion: data.value2 || '',
      categoria: data.opcion as CategoriaMercado,
    });
    await this.cargar();
  }

  async eliminar(item: ItemMercado): Promise<void> {
    await this.storage.deleteItemMercado(item);
    await this.cargarDeslizando();
    const deshacer = await this.alert.toast(item.nombre, { tipo: 'eliminado', header: 'Producto eliminado', deshacer: true });
    if (!deshacer) return;
    await this.storage.saveItemMercado(item);
    await this.cargarDeslizando();
  }
}
