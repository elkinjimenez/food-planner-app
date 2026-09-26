import { ChangeDetectorRef, Component, ElementRef, HostListener, computed, signal, inject, viewChildren } from '@angular/core';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonLabel,
  IonBadge,
  IonFab,
  IonFabButton,
  IonCard,
  ModalController,
  ActionSheetController,
} from '@ionic/angular';
import { ProductoNevera } from '../../models/producto-nevera.model';
import { ItemMercado } from '../../models/item-mercado.model';
import { uuid } from '../../utils/uuid';
import { diasHasta } from '../../utils/fecha';
import { deslizarFilas } from '../../utils/deslizar-filas';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { EditarItemModal } from '../../shared/editar-item.modal';
import { FechaPipe } from '../../shared/fecha.pipe';

type EstadoVencimiento = 'verde' | 'amarillo' | 'rojo';

const COLOR_ESTADO: Record<EstadoVencimiento, string> = { verde: 'success', amarillo: 'warning', rojo: 'danger' };

interface ProductoConEstado {
  producto: ProductoNevera;
  estado: EstadoVencimiento;
  label: string;
  color: string;
}

function estado(dias: number): EstadoVencimiento {
  if (dias <= 1) return 'rojo';
  if (dias <= 5) return 'amarillo';
  return 'verde';
}

function estadoLabel(dias: number): string {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)}d`;
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `${dias} días`;
}

@Component({
  selector: 'app-nevera',
  templateUrl: 'nevera.page.html',
  styleUrls: ['nevera.page.scss'],
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonLabel,
    IonBadge,
    IonFab,
    IonFabButton,
    IonCard,
    FechaPipe,
  ],
})
export class NeveraPage {
  private storage = inject(StorageService);
  private alert = inject(AlertService);
  private modalCtrl = inject(ModalController);
  private actionSheetCtrl = inject(ActionSheetController);
  private cdr = inject(ChangeDetectorRef);

  productos = signal<ProductoNevera[]>([]);
  // El estado se calcula una vez por producto en cada carga, no en cada detección de cambios
  // (cargar() corre también al volver a la app, por si cambió el día)
  conEstado = computed<ProductoConEstado[]>(() =>
    this.productos().map((producto) => {
      const dias = diasHasta(producto.fechaVencimiento);
      const e = estado(dias);
      return { producto, estado: e, label: estadoLabel(dias), color: COLOR_ESTADO[e] };
    }),
  );
  private filas = viewChildren('fila', { read: ElementRef<HTMLElement> });

  // Ionic lo llama también al entrar la primera vez: no hace falta cargar en ngOnInit
  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  // En iOS la PWA se reanuda sin recargarse: al volver a la app el día pudo haber cambiado
  @HostListener('document:visibilitychange')
  async alVolverALaApp(): Promise<void> {
    if (document.visibilityState === 'visible') {
      await this.cargar();
    }
  }

  private async cargar(): Promise<void> {
    this.mostrar(await this.storage.getNevera());
  }

  /** Recarga la lista deslizando cada fila a su nuevo lugar en vez de saltar. */
  private async cargarDeslizando(): Promise<void> {
    const data = await this.storage.getNevera();
    deslizarFilas(this.filas(), () => {
      this.mostrar(data);
      this.cdr.detectChanges();
    });
  }

  private mostrar(data: ProductoNevera[]): void {
    // Ordenar por fecha de vencimiento ascendente
    data.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    this.productos.set(data);
  }

  async agregar(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: EditarItemModal,
      componentProps: {
        config: {
          titulo: 'Agregar producto',
          boton: 'Agregar',
          icono: 'snow-outline',
          label1: 'Nombre',
          label2: 'Fecha vencimiento',
          value1: '',
          value2: '',
          input2Type: 'date' as const,
        },
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ value1: string; value2: string } | null>();
    if (!data || !data.value1 || !data.value2) return;
    const nuevo: ProductoNevera = {
      id: uuid(),
      nombre: data.value1,
      fechaVencimiento: data.value2,
    };
    await this.storage.saveProductoNevera(nuevo);
    await this.cargar();
  }

  async editar(producto: ProductoNevera): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: EditarItemModal,
      componentProps: {
        config: {
          titulo: 'Editar producto',
          boton: 'Guardar',
          icono: 'snow-outline',
          label1: 'Nombre',
          label2: 'Fecha vencimiento',
          value1: producto.nombre,
          value2: producto.fechaVencimiento,
          input2Type: 'date' as const,
        },
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ value1: string; value2: string } | null>();
    if (!data || !data.value1) return;
    producto.nombre = data.value1;
    producto.fechaVencimiento = data.value2;
    await this.storage.saveProductoNevera(producto);
    await this.cargar();
  }

  async eliminar(producto: ProductoNevera): Promise<void> {
    await this.storage.deleteProductoNevera(producto.id);
    const desmarcados = await this.desmarcarEnMercado([producto]);
    await this.cargarDeslizando();
    const deshacer = await this.alert.toast(producto.nombre, { tipo: 'eliminado', header: 'Producto eliminado', deshacer: true });
    if (!deshacer) return;
    await this.storage.saveProductoNevera(producto);
    for (const item of desmarcados) {
      item.comprado = true;
      await this.storage.saveItemMercado(item);
    }
    await this.cargarDeslizando();
  }

  async vaciarNevera(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: '¿Vaciar nevera?',
      subHeader: 'Se eliminarán todos los productos',
      buttons: [
        {
          text: 'Sí, vaciar',
          role: 'destructive',
          handler: () => this.ejecutarVaciarNevera(),
        },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await actionSheet.present();
  }

  private async ejecutarVaciarNevera(): Promise<void> {
    // Eliminar todos los productos de nevera
    for (const producto of this.productos()) {
      await this.storage.deleteProductoNevera(producto.id);
    }
    await this.desmarcarEnMercado(this.productos());
    await this.cargar();
  }

  /** Desmarca en Mercado los ítems de los que salieron estos productos y los devuelve. */
  private async desmarcarEnMercado(productos: ProductoNevera[]): Promise<ItemMercado[]> {
    const ids = new Set(productos.map((p) => p.itemMercadoId));
    const mercado = await this.storage.getMercado();
    const desmarcados = mercado.filter((item) => item.comprado && ids.has(item.id));
    for (const item of desmarcados) {
      item.comprado = false;
      await this.storage.saveItemMercado(item);
    }
    return desmarcados;
  }
}
