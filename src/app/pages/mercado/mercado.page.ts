import { Component, OnInit, signal } from '@angular/core';
import {
  IonContent,
  IonCheckbox,
  IonButton,
  IonIcon,
  IonLabel,
  IonFab,
  IonFabButton,
  IonCard,
} from '@ionic/angular';
import { ItemMercado } from '../../models/item-mercado.model';
import { ProductoNevera } from '../../models/producto-nevera.model';
import { uuid } from '../../utils/uuid';
import { parsearDuracionADias, calcularFechaVencimiento } from '../../utils/duracion';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';

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
  items = signal<ItemMercado[]>([]);
  supermercado = signal<ItemMercado[]>([]);
  fruver = signal<ItemMercado[]>([]);

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
    const data = await this.storage.getMercado();
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
      };
      await this.storage.saveProductoNevera(producto);
    } else {
      // Al desmarcar, eliminar de nevera si existe un producto con el mismo nombre
      const nevera = await this.storage.getNevera();
      const existente = nevera.find((p) => p.nombre === item.nombre);
      if (existente) {
        await this.storage.deleteProductoNevera(existente.id);
      }
    }

    setTimeout(() => this.cargar(), 1500);
  }

  async desmarcarTodo(): Promise<void> {
    const nevera = await this.storage.getNevera();
    for (const item of this.items()) {
      if (item.comprado) {
        const existente = nevera.find((p) => p.nombre === item.nombre);
        if (existente) {
          await this.storage.deleteProductoNevera(existente.id);
        }
      }
      item.comprado = false;
      await this.storage.saveItemMercado(item);
    }
    await this.cargar();
  }

  async agregar(categoria: 'supermercado' | 'fruver'): Promise<void> {
    const data = await this.alert.promptAgregarItem('Agregar ítem', 'Nombre', 'Duración aprox.');
    if (!data) return;
    const nuevo: ItemMercado = {
      id: uuid(),
      nombre: data[0],
      duracion: data[1] || '',
      categoria,
      comprado: false,
    };
    await this.storage.saveItemMercado(nuevo);
    await this.cargar();
  }

  async agregarActual(): Promise<void> {
    const cat = await this.alert.selectFromList('Categoría', [
      { text: 'Supermercado', value: 'supermercado' },
      { text: 'Fruver', value: 'fruver' },
    ]);
    if (!cat) return;
    await this.agregar(cat as 'supermercado' | 'fruver');
  }

  async editar(item: ItemMercado): Promise<void> {
    const data = await this.alert.promptEditarItem(
      'Editar ítem',
      'Nombre',
      'Duración aprox.',
      item.nombre,
      item.duracion,
    );
    if (!data) return;
    item.nombre = data[0];
    item.duracion = data[1] || '';
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
