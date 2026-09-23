import { Component, OnInit, signal } from '@angular/core';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonFab,
  IonFabButton,
  IonCard,
} from '@ionic/angular';
import { ProductoNevera } from '../../models/producto-nevera.model';
import { uuid } from '../../utils/uuid';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';

type EstadoVencimiento = 'verde' | 'amarillo' | 'rojo';

@Component({
  selector: 'app-nevera',
  templateUrl: 'nevera.page.html',
  styleUrls: ['nevera.page.scss'],
  imports: [
    IonContent,
    IonButton,
    IonIcon,
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
    const data = await this.alert.promptAgregarItem('Agregar producto', 'Nombre', 'Fecha vencimiento (YYYY-MM-DD)');
    if (!data) return;
    if (!this.fechaValida(data[1])) {
      await this.alert.confirm('Fecha inválida', 'Usa el formato YYYY-MM-DD.');
      return;
    }
    const nuevo: ProductoNevera = {
      id: uuid(),
      nombre: data[0],
      fechaVencimiento: data[1],
    };
    await this.storage.saveProductoNevera(nuevo);
    await this.cargar();
  }

  async editar(producto: ProductoNevera): Promise<void> {
    const data = await this.alert.promptEditarItem(
      'Editar producto',
      'Nombre',
      'Fecha vencimiento (YYYY-MM-DD)',
      producto.nombre,
      producto.fechaVencimiento,
    );
    if (!data) return;
    if (!this.fechaValida(data[1])) {
      await this.alert.confirm('Fecha inválida', 'Usa el formato YYYY-MM-DD.');
      return;
    }
    producto.nombre = data[0];
    producto.fechaVencimiento = data[1];
    await this.storage.saveProductoNevera(producto);
    await this.cargar();
  }

  async eliminar(producto: ProductoNevera): Promise<void> {
    const confirm = await this.alert.confirm('¿Eliminar producto?', producto.nombre);
    if (!confirm) return;
    await this.storage.deleteProductoNevera(producto.id);
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
