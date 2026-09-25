import { Component, HostListener, OnInit, signal, inject } from '@angular/core';
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
import { uuid } from '../../utils/uuid';
import { diasHasta } from '../../utils/fecha';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { EditarItemModal } from '../../shared/editar-item.modal';
import { FechaPipe } from '../../shared/fecha.pipe';

type EstadoVencimiento = 'verde' | 'amarillo' | 'rojo';

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
export class NeveraPage implements OnInit {
  private storage = inject(StorageService);
  private alert = inject(AlertService);
  private modalCtrl = inject(ModalController);
  private actionSheetCtrl = inject(ActionSheetController);

  productos = signal<ProductoNevera[]>([]);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

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
    const data = await this.storage.getNevera();
    // Ordenar por fecha de vencimiento ascendente
    data.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    this.productos.set(data);
  }

  estado(fecha: string): EstadoVencimiento {
    const dias = diasHasta(fecha);
    if (dias <= 1) return 'rojo';
    if (dias <= 5) return 'amarillo';
    return 'verde';
  }

  estadoLabel(fecha: string): string {
    const dias = diasHasta(fecha);
    if (dias < 0) return `Vencido hace ${Math.abs(dias)}d`;
    if (dias === 0) return 'Vence hoy';
    if (dias === 1) return 'Vence mañana';
    return `${dias} días`;
  }

  async agregar(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: EditarItemModal,
      componentProps: {
        config: {
          titulo: 'Agregar producto',
          icono: 'snow-outline',
          label1: 'Nombre',
          label2: 'Fecha vencimiento',
          value1: '',
          value2: '',
          input2Type: 'date' as const,
        },
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
      showBackdrop: false,
      cssClass: 'card-modal-dark',
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
          icono: 'snow-outline',
          label1: 'Nombre',
          label2: 'Fecha vencimiento',
          value1: producto.nombre,
          value2: producto.fechaVencimiento,
          input2Type: 'date' as const,
        },
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
      showBackdrop: false,
      cssClass: 'card-modal-dark',
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
    const confirm = await this.alert.confirm('¿Eliminar producto?', producto.nombre);
    if (!confirm) return;
    await this.storage.deleteProductoNevera(producto.id);
    await this.desmarcarEnMercado([producto]);
    await this.cargar();
  }

  async vaciarNevera(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: '¿Vaciar nevera?',
      subHeader: 'Se eliminarán todos los productos',
      cssClass: 'action-sheet-centered',
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

  /** Desmarca en Mercado los ítems de los que salieron estos productos. */
  private async desmarcarEnMercado(productos: ProductoNevera[]): Promise<void> {
    const ids = new Set(productos.map((p) => p.itemMercadoId));
    const mercado = await this.storage.getMercado();
    for (const item of mercado) {
      if (item.comprado && ids.has(item.id)) {
        item.comprado = false;
        await this.storage.saveItemMercado(item);
      }
    }
  }
}
