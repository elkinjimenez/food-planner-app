import { ChangeDetectorRef, Component, ElementRef, OnInit, signal, inject, viewChildren } from '@angular/core';
import {
  IonContent,
  IonCheckbox,
  IonButton,
  IonIcon,
  IonLabel,
  IonFab,
  IonFabButton,
  IonCard,
  ModalController,
  ActionSheetController,
} from '@ionic/angular';
import { CategoriaMercado, ItemMercado } from '../../models/item-mercado.model';
import { ProductoNevera } from '../../models/producto-nevera.model';
import { uuid } from '../../utils/uuid';
import { DURACIONES, parsearDuracionADias, calcularFechaVencimiento } from '../../utils/duracion';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { EditarItemModal } from '../../shared/editar-item.modal';

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
  ],
})
export class MercadoPage implements OnInit {
  private storage = inject(StorageService);
  private alert = inject(AlertService);
  private modalCtrl = inject(ModalController);
  private actionSheetCtrl = inject(ActionSheetController);
  private cdr = inject(ChangeDetectorRef);

  items = signal<ItemMercado[]>([]);
  supermercado = signal<ItemMercado[]>([]);
  fruver = signal<ItemMercado[]>([]);
  private filas = viewChildren('fila', { read: ElementRef<HTMLElement> });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    this.mostrar(await this.storage.getMercado());
  }

  private mostrar(data: ItemMercado[]): void {
    this.items.set(data);
    this.supermercado.set(
      data.filter((i) => i.categoria === 'supermercado').sort((a, b) => Number(a.comprado) - Number(b.comprado)),
    );
    this.fruver.set(
      data.filter((i) => i.categoria === 'fruver').sort((a, b) => Number(a.comprado) - Number(b.comprado)),
    );
  }

  async toggleComprado(item: ItemMercado): Promise<void> {
    item.comprado = !item.comprado;
    await this.storage.saveItemMercado(item);

    if (item.comprado) {
      // Al marcar como comprado, agregar a nevera con fecha de vencimiento calculada
      const dias = parsearDuracionADias(item.duracion);
      const producto: ProductoNevera = {
        id: uuid(),
        nombre: item.nombre,
        fechaVencimiento: calcularFechaVencimiento(dias),
        itemMercadoId: item.id,
      };
      await this.storage.saveProductoNevera(producto);
    } else {
      // Al desmarcar, quitar de la nevera lo que salió de este ítem
      const nevera = await this.storage.getNevera();
      for (const producto of nevera.filter((p) => p.itemMercadoId === item.id)) {
        await this.storage.deleteProductoNevera(producto.id);
      }
    }

    setTimeout(() => this.reordenar(), 400);
  }

  /**
   * Recarga la lista deslizando cada fila a su nuevo lugar en vez de saltar (FLIP): se mide
   * cada fila, se actualiza el DOM y la fila se anima desde donde estaba hasta donde quedó.
   * No usa startViewTransition: esa transición pinta las filas encima del tab bar flotante
   * y del botón + mientras dura.
   */
  private async reordenar(): Promise<void> {
    const data = await this.storage.getMercado();
    // Medir y actualizar en el mismo tick, sin await de por medio, para que un scroll no descuadre
    const filas = this.filas().map((f) => f.nativeElement);
    const antes = filas.map((fila) => fila.getBoundingClientRect().top);
    this.mostrar(data);
    this.cdr.detectChanges();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const despues = filas.map((fila) => fila.getBoundingClientRect().top);
    filas.forEach((fila, i) => {
      const dy = antes[i] - despues[i];
      if (dy === 0) return;
      // La que más se desplaza (la que se marcó) pasa por encima de las que solo se corren un puesto
      const zIndex = Math.round(Math.abs(dy));
      fila.animate(
        [
          { transform: `translateY(${dy}px)`, zIndex },
          { transform: 'none', zIndex },
        ],
        { duration: 300, easing: 'ease-in-out' },
      );
    });
  }

  async desmarcarTodo(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: '¿Desmarcar todo?',
      subHeader: 'Se quitarán todos los ítems del carrito',
      cssClass: 'action-sheet-centered',
      buttons: [
        {
          text: 'Sí, desmarcar',
          role: 'destructive',
          handler: () => this.ejecutarDesmarcarTodo(),
        },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await actionSheet.present();
  }

  private async ejecutarDesmarcarTodo(): Promise<void> {
    const comprados = this.items().filter((i) => i.comprado);
    const ids = new Set(comprados.map((i) => i.id));
    // Quitar de la nevera lo que salió de los ítems comprados
    const nevera = await this.storage.getNevera();
    for (const producto of nevera) {
      if (producto.itemMercadoId && ids.has(producto.itemMercadoId)) {
        await this.storage.deleteProductoNevera(producto.id);
      }
    }
    for (const item of comprados) {
      item.comprado = false;
      await this.storage.saveItemMercado(item);
    }
    await this.cargar();
  }

  async restaurarBase(categoria: CategoriaMercado): Promise<void> {
    await this.storage.restaurarMercadoBase(categoria);
    await this.cargar();
  }

  async agregar(categoria: 'supermercado' | 'fruver'): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: EditarItemModal,
      componentProps: {
        config: {
          titulo: 'Agregar ítem',
          boton: 'Agregar',
          icono: 'cart-outline',
          label1: 'Nombre',
          label2: 'Duración aprox.',
          sugerencias2: DURACIONES,
          value1: '',
          value2: '',
        },
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
      showBackdrop: false,
      cssClass: 'card-modal-dark',
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ value1: string; value2: string } | null>();
    if (!data || !data.value1) return;
    const nuevo: ItemMercado = {
      id: uuid(),
      nombre: data.value1,
      duracion: data.value2 || '',
      categoria,
      comprado: false,
    };
    await this.storage.saveItemMercado(nuevo);
    await this.cargar();
  }

  async agregarActual(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Categoría',
      cssClass: 'action-sheet-centered',
      buttons: [
        {
          text: 'Supermercado',
          handler: () => this.agregar('supermercado'),
        },
        {
          text: 'Fruver',
          handler: () => this.agregar('fruver'),
        },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await actionSheet.present();
  }

  async editar(item: ItemMercado): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: EditarItemModal,
      componentProps: {
        config: {
          titulo: 'Editar ítem',
          boton: 'Guardar',
          icono: 'cart-outline',
          label1: 'Nombre',
          label2: 'Duración aprox.',
          sugerencias2: DURACIONES,
          value1: item.nombre,
          value2: item.duracion,
        },
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
      showBackdrop: false,
      cssClass: 'card-modal-dark',
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ value1: string; value2: string } | null>();
    if (!data || !data.value1) return;
    item.nombre = data.value1;
    item.duracion = data.value2 || '';
    await this.storage.saveItemMercado(item);
    await this.cargar();
  }

  async eliminar(item: ItemMercado): Promise<void> {
    const confirm = await this.alert.confirm('¿Eliminar ítem?', item.nombre);
    if (!confirm) return;
    await this.storage.deleteItemMercado(item.id);
    await this.cargar();
  }
}
