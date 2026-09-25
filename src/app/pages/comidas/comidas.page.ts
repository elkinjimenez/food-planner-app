import { Component, OnInit, signal, inject } from '@angular/core';
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
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';
import { EditarItemModal } from '../../shared/editar-item.modal';

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

  desayunos = signal<Comida[]>([]);
  cenas = signal<Comida[]>([]);

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    const data = await this.storage.getComidas();
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
          titulo: tipo === 'desayuno' ? 'Agregar desayuno' : 'Agregar cena',
          icono: tipo === 'desayuno' ? 'sunny-outline' : 'moon-outline',
          label1: 'Nombre',
          label2: 'Ingredientes (opcional)',
          value1: '',
          value2: '',
          campo2Opcional: true,
        },
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
      showBackdrop: false,
      cssClass: 'card-modal-dark',
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ value1: string; value2: string } | null>();
    if (!data || !data.value1) return;
    const nueva: Comida = {
      id: uuid(),
      nombre: data.value1,
      ingredientes: data.value2 || undefined,
      tipo,
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
          icono: 'restaurant-outline',
          label1: 'Nombre',
          label2: 'Ingredientes (opcional)',
          value1: comida.nombre,
          value2: comida.ingredientes ?? '',
          campo2Opcional: true,
        },
      },
      presentingElement: document.querySelector('ion-router-outlet') ?? undefined,
      showBackdrop: false,
      cssClass: 'card-modal-dark',
    });
    await modal.present();
    const { data } = await modal.onWillDismiss<{ value1: string; value2: string } | null>();
    if (!data || !data.value1) return;
    comida.nombre = data.value1;
    comida.ingredientes = data.value2 || undefined;
    await this.storage.saveComida(comida);
    await this.cargar();
  }

  async eliminar(comida: Comida): Promise<void> {
    const confirm = await this.alert.confirm('¿Eliminar comida?', comida.nombre);
    if (!confirm) return;
    await this.storage.deleteComida(comida.id);
    await this.cargar();
  }
}
