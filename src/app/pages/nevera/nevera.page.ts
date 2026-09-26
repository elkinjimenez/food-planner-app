import { ChangeDetectorRef, Component, ElementRef, computed, signal, inject, viewChildren } from '@angular/core';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonLabel,
  IonBadge,
  IonFab,
  IonFabButton,
  IonCard,
  ActionSheetController,
} from '@ionic/angular';
import { ProductoNevera } from '../../models/producto-nevera.model';
import { ItemMercado } from '../../models/item-mercado.model';
import { uuid } from '../../utils/uuid';
import { diasHasta } from '../../utils/fecha';
import { deslizarFilas } from '../../utils/deslizar-filas';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { HoyService } from '../../services/hoy.service';
import { EditarItemConfig, injectAbrirEditor } from '../../shared/editar-item.modal';
import { FechaPipe } from '../../shared/fecha.pipe';

// Lo común del modal de agregar y editar
const EDITOR_NEVERA = {
  icono: 'snow-outline',
  label1: 'Nombre',
  label2: 'Fecha vencimiento',
  input2Type: 'date',
} satisfies Partial<EditarItemConfig>;

type EstadoVencimiento = 'verde' | 'amarillo' | 'rojo';

const COLOR_ESTADO: Record<EstadoVencimiento, string> = { verde: 'success', amarillo: 'warning', rojo: 'danger' };

interface ProductoConEstado {
  producto: ProductoNevera;
  nombre: string;
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
  private abrirEditor = injectAbrirEditor();
  private actionSheetCtrl = inject(ActionSheetController);
  private cdr = inject(ChangeDetectorRef);

  private hoy = inject(HoyService).hoy;
  productos = signal<ProductoNevera[]>([]);
  private mercadoPorId = signal(new Map<string, ItemMercado>());
  // El estado se calcula una vez por producto en cada carga, no en cada detección de cambios
  // (y otra vez si cambia el día)
  conEstado = computed<ProductoConEstado[]>(() => {
    const mercado = this.mercadoPorId();
    const hoy = this.hoy();
    return this.productos().map((producto) => {
      const dias = diasHasta(producto.fechaVencimiento, hoy);
      const e = estado(dias);
      // Si salió de Mercado, el nombre es el del ítem: editarlo allá se ve aquí
      const nombre = mercado.get(producto.itemMercadoId ?? '')?.nombre ?? producto.nombre;
      return { producto, nombre, estado: e, label: estadoLabel(dias), color: COLOR_ESTADO[e] };
    });
  });
  private filas = viewChildren('fila', { read: ElementRef<HTMLElement> });

  // Ionic lo llama también al entrar la primera vez: no hace falta cargar en ngOnInit
  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    this.mostrar(...(await this.leer()));
  }

  /** Recarga la lista deslizando cada fila a su nuevo lugar en vez de saltar. */
  private async cargarDeslizando(): Promise<void> {
    const datos = await this.leer();
    deslizarFilas(this.filas(), () => {
      this.mostrar(...datos);
      this.cdr.detectChanges();
    });
  }

  private leer(): Promise<[ProductoNevera[], ItemMercado[]]> {
    return Promise.all([this.storage.getNevera(), this.storage.getMercado()]);
  }

  private mostrar(data: ProductoNevera[], mercado: ItemMercado[]): void {
    // Ordenar por fecha de vencimiento ascendente
    data.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    this.mercadoPorId.set(new Map(mercado.map((i) => [i.id, i])));
    this.productos.set(data);
  }

  async agregar(): Promise<void> {
    const data = await this.abrirEditor({
      ...EDITOR_NEVERA,
      titulo: 'Agregar producto',
      boton: 'Agregar',
      value1: '',
      value2: '',
    });
    if (!data || !data.value2) return;
    const nuevo: ProductoNevera = {
      id: uuid(),
      nombre: data.value1,
      fechaVencimiento: data.value2,
    };
    await this.storage.saveProductoNevera(nuevo);
    await this.cargar();
  }

  async editar({ producto, nombre }: ProductoConEstado): Promise<void> {
    const data = await this.abrirEditor({
      ...EDITOR_NEVERA,
      titulo: 'Editar producto',
      boton: 'Guardar',
      value1: nombre,
      value2: producto.fechaVencimiento,
    });
    if (!data) return;
    // El nombre de lo que salió de Mercado es el del ítem: se cambia allá
    const item = this.mercadoPorId().get(producto.itemMercadoId ?? '');
    if (item && item.nombre !== data.value1) {
      await this.storage.saveItemMercado({ ...item, nombre: data.value1 });
    }
    await this.storage.saveProductoNevera({ ...producto, nombre: data.value1, fechaVencimiento: data.value2 });
    await this.cargar();
  }

  async eliminar({ producto, nombre }: ProductoConEstado): Promise<void> {
    const desmarcados = await this.storage.sacarDeNevera([producto]);
    await this.cargarDeslizando();
    const deshacer = await this.alert.toast(nombre, { tipo: 'eliminado', header: 'Producto eliminado', deshacer: true });
    if (!deshacer) return;
    await this.storage.marcarComprados(desmarcados, [producto]);
    await this.cargarDeslizando();
  }

  async vaciarNevera(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: '¿Vaciar nevera?',
      subHeader: 'Se eliminarán todos los productos',
      buttons: [
        { text: 'Sí, vaciar', role: 'destructive' },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await actionSheet.present();
    // Después de cerrarse y no en el handler: el action sheet espera al handler para cerrarse
    // y este espera al aviso de "Deshacer"
    const { role } = await actionSheet.onDidDismiss();
    if (role === 'destructive') await this.ejecutarVaciarNevera();
  }

  private async ejecutarVaciarNevera(): Promise<void> {
    const productos = this.productos();
    const desmarcados = await this.storage.sacarDeNevera(productos);
    await this.cargar();
    const total = productos.length === 1 ? '1 producto' : `${productos.length} productos`;
    const deshacer = await this.alert.toast(total, { tipo: 'eliminado', header: 'Nevera vaciada', deshacer: true });
    if (!deshacer) return;
    await this.storage.marcarComprados(desmarcados, productos);
    await this.cargar();
  }
}
