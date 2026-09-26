import { ChangeDetectorRef, Component, ElementRef, OnInit, signal, inject, viewChildren } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonFab,
  IonFabButton,
  IonCard,
  IonButton,
  ModalController,
  ActionSheetController,
} from '@ionic/angular';
import { Comida, TipoComida } from '../../models/comida.model';
import { uuid } from '../../utils/uuid';
import { deslizarFilas } from '../../utils/deslizar-filas';
import { StorageService, quitarComidaDelPlan } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { EditarItemModal } from '../../shared/editar-item.modal';

const OPCIONES_TIPO = [
  { valor: 'desayuno', texto: 'Desayuno' },
  { valor: 'cena', texto: 'Cena' },
];

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
  ],
})
export class ComidasPage implements OnInit {
  private storage = inject(StorageService);
  private alert = inject(AlertService);
  private modalCtrl = inject(ModalController);
  private actionSheetCtrl = inject(ActionSheetController);
  private cdr = inject(ChangeDetectorRef);

  desayunos = signal<Comida[]>([]);
  cenas = signal<Comida[]>([]);
  private filas = viewChildren('fila', { read: ElementRef<HTMLElement> });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

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

  async agregar(tipo: 'desayuno' | 'cena'): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: EditarItemModal,
      componentProps: {
        config: {
          // Título general: el tipo se puede cambiar en el selector
          titulo: 'Agregar comida',
          boton: 'Agregar',
          icono: 'restaurant-outline',
          label1: 'Nombre',
          label2: 'Ingredientes (opcional)',
          value1: '',
          value2: '',
          campo2Opcional: true,
          labelOpcion: 'Tipo',
          opciones: OPCIONES_TIPO,
          opcion: tipo,
        },
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ value1: string; value2: string; opcion: string } | null>();
    if (!data || !data.value1) return;
    const nueva: Comida = {
      id: uuid(),
      nombre: data.value1,
      ingredientes: data.value2 || undefined,
      tipo: data.opcion as TipoComida,
    };
    await this.storage.saveComida(nueva);
    await this.cargar();
  }

  async agregarActual(): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Tipo de comida',
      buttons: [
        {
          text: 'Desayuno',
          handler: () => this.agregar('desayuno'),
        },
        {
          text: 'Cena',
          handler: () => this.agregar('cena'),
        },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await actionSheet.present();
  }

  async editar(comida: Comida): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: EditarItemModal,
      componentProps: {
        config: {
          titulo: 'Editar comida',
          boton: 'Guardar',
          icono: 'restaurant-outline',
          label1: 'Nombre',
          label2: 'Ingredientes (opcional)',
          value1: comida.nombre,
          value2: comida.ingredientes ?? '',
          campo2Opcional: true,
          labelOpcion: 'Tipo',
          opciones: OPCIONES_TIPO,
          opcion: comida.tipo,
        },
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ value1: string; value2: string; opcion: string } | null>();
    if (!data || !data.value1) return;
    const cambioTipo = comida.tipo !== data.opcion;
    comida.nombre = data.value1;
    comida.ingredientes = data.value2 || undefined;
    comida.tipo = data.opcion as TipoComida;
    await this.storage.saveComida(comida);
    if (cambioTipo) {
      // En el plan estaba como el tipo anterior (p. ej. de desayuno): se deja ese día sin asignar
      const plan = await this.storage.getPlan();
      if (quitarComidaDelPlan(plan, comida.id)) await this.storage.putPlan(plan);
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
