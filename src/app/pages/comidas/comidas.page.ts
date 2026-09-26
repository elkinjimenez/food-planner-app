import { ChangeDetectorRef, Component, ElementRef, Signal, signal, inject, viewChildren } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonFab,
  IonFabButton,
  IonCard,
  IonButton,
} from '@ionic/angular';
import { Comida, TipoComida } from '../../models/comida.model';
import { uuid } from '../../utils/uuid';
import { deslizarFilas } from '../../utils/deslizar-filas';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { EditarItemConfig, injectAbrirEditor } from '../../shared/editar-item.modal';
import { SeccionPlegableComponent } from '../../shared/seccion-plegable.component';

// Lo común del modal de agregar y editar
const EDITOR_COMIDA = {
  icono: 'restaurant-outline',
  label1: 'Nombre',
  label2: 'Ingredientes (opcional)',
  campo2Opcional: true,
  labelOpcion: 'Tipo',
  opciones: [
    { valor: 'desayuno', texto: 'Desayuno' },
    { valor: 'cena', texto: 'Cena' },
  ],
} satisfies Partial<EditarItemConfig>;

/** Datos de cada sección de la vista (Desayunos y Cenas): la plantilla las dibuja con un solo @for. */
interface SeccionComidas {
  tipo: TipoComida;
  titulo: string;
  icono: string;
  tono: string;
  vacio: string;
  restaurar: string;
  comidas: Signal<Comida[]>;
}

@Component({
  selector: 'app-comidas',
  templateUrl: 'comidas.page.html',
  styleUrls: ['comidas.page.scss'],
  imports: [
    IonContent,
    IonIcon,
    IonFab,
    IonFabButton,
    IonCard,
    IonButton,
    SeccionPlegableComponent,
  ],
})
export class ComidasPage {
  private storage = inject(StorageService);
  private alert = inject(AlertService);
  private abrirEditor = injectAbrirEditor();
  private cdr = inject(ChangeDetectorRef);

  desayunos = signal<Comida[]>([]);
  cenas = signal<Comida[]>([]);
  readonly secciones: SeccionComidas[] = [
    {
      tipo: 'desayuno',
      titulo: 'Desayunos',
      icono: 'sunny-outline',
      tono: 'tono-desayuno',
      vacio: 'No tienes desayunos',
      restaurar: 'Cargar desayunos base',
      comidas: this.desayunos,
    },
    {
      tipo: 'cena',
      titulo: 'Cenas',
      icono: 'moon-outline',
      tono: 'tono-cena',
      vacio: 'No tienes cenas',
      restaurar: 'Cargar cenas base',
      comidas: this.cenas,
    },
  ];
  private filas = viewChildren('fila', { read: ElementRef<HTMLElement> });

  // Ionic lo llama también al entrar la primera vez: no hace falta cargar en ngOnInit
  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    this.mostrar(await this.storage.getComidas());
  }

  /** Recarga la lista deslizando cada fila a su nuevo lugar en vez de saltar. */
  private async cargarDeslizando(): Promise<void> {
    const data = await this.storage.getComidas();
    deslizarFilas(this.filas(), () => {
      this.mostrar(data);
      this.cdr.detectChanges();
    });
  }

  private mostrar(data: Comida[]): void {
    this.desayunos.set(data.filter((c) => c.tipo === 'desayuno'));
    this.cenas.set(data.filter((c) => c.tipo === 'cena'));
  }

  async restaurarBase(tipo: TipoComida): Promise<void> {
    await this.storage.restaurarComidasBase(tipo);
    await this.cargar();
  }

  /** El tipo se elige en el mismo modal; empieza en desayuno. */
  async agregar(tipo: TipoComida = 'desayuno'): Promise<void> {
    // Título general: el tipo se puede cambiar en el selector
    const data = await this.abrirEditor({
      ...EDITOR_COMIDA,
      titulo: 'Agregar comida',
      boton: 'Agregar',
      value1: '',
      value2: '',
      opcion: tipo,
    });
    if (!data) return;
    const nueva: Comida = {
      id: uuid(),
      nombre: data.value1,
      ingredientes: data.value2 || undefined,
      tipo: data.opcion as TipoComida,
    };
    await this.storage.saveComida(nueva);
    await this.cargar();
  }

  async editar(comida: Comida): Promise<void> {
    const data = await this.abrirEditor({
      ...EDITOR_COMIDA,
      titulo: 'Editar comida',
      boton: 'Guardar',
      value1: comida.nombre,
      value2: comida.ingredientes ?? '',
      opcion: comida.tipo,
    });
    if (!data) return;
    const editada: Comida = {
      ...comida,
      nombre: data.value1,
      ingredientes: data.value2 || undefined,
      tipo: data.opcion as TipoComida,
    };
    await this.storage.saveComida(editada);
    if (editada.tipo !== comida.tipo) {
      // En el plan y en lo confirmado estaba como el tipo anterior (p. ej. de desayuno): se deja sin asignar
      await this.storage.quitarComidaDeLaSemana(comida.id);
    }
    await this.cargar();
  }

  async eliminar(comida: Comida): Promise<void> {
    const restaurar = await this.storage.deleteComida(comida.id);
    await this.cargarDeslizando();
    const deshacer = await this.alert.toast(comida.nombre, { tipo: 'eliminado', header: 'Comida eliminada', deshacer: true });
    if (!deshacer) return;
    await restaurar();
    await this.cargarDeslizando();
  }
}
