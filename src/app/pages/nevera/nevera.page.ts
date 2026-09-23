import { Component, OnInit, signal } from '@angular/core';
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
} from '@ionic/angular';
import { ProductoNevera } from '../../models/producto-nevera.model';
import { uuid } from '../../utils/uuid';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { EditarItemModal } from '../../shared/editar-item.modal';

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
  ],
})
export class NeveraPage implements OnInit {
  productos = signal<ProductoNevera[]>([]);

  constructor(
    private storage: StorageService,
    private alert: AlertService,
    private modalCtrl: ModalController,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    const data = await this.storage.getNevera();
    // Ordenar por fecha de vencimiento ascendente
    data.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    this.productos.set(data);
  }

  diasRestantes(fecha: string): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fecha + 'T00:00:00');
    const diff = venc.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  estado(fecha: string): EstadoVencimiento {
    const dias = this.diasRestantes(fecha);
    if (dias <= 1) return 'rojo';
    if (dias <= 5) return 'amarillo';
    return 'verde';
  }

  estadoLabel(fecha: string): string {
    const dias = this.diasRestantes(fecha);
    if (dias < 0) return `Vencido hace ${Math.abs(dias)}d`;
    if (dias === 0) return 'Vence hoy';
    if (dias === 1) return 'Vence mañana';
    return `${dias} días`;
  }

  fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
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
    // Desmarcar en mercado el ítem que coincida por nombre
    const mercado = await this.storage.getMercado();
    const item = mercado.find((m) => m.nombre === producto.nombre && m.comprado);
    if (item) {
      item.comprado = false;
      await this.storage.saveItemMercado(item);
    }
    await this.cargar();
  }

  async vaciarNevera(): Promise<void> {
    const confirm = await this.alert.confirm('¿Vaciar nevera?', 'Se eliminarán todos los productos.');
    if (!confirm) return;
    // Eliminar todos los productos de nevera
    for (const producto of this.productos()) {
      await this.storage.deleteProductoNevera(producto.id);
    }
    // Desmarcar en mercado los ítems que coincidan
    const mercado = await this.storage.getMercado();
    for (const producto of this.productos()) {
      const item = mercado.find((m) => m.nombre === producto.nombre && m.comprado);
      if (item) {
        item.comprado = false;
        await this.storage.saveItemMercado(item);
      }
    }
    await this.cargar();
  }

  private fechaValida(fecha: string): boolean {
    if (!fecha) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(fecha)) return false;
    const d = new Date(fecha + 'T00:00:00');
    return !isNaN(d.getTime());
  }
}
