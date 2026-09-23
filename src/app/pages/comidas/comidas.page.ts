import { Component, OnInit, signal } from '@angular/core';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonCard,
} from '@ionic/angular';
import { Comida } from '../../models/comida.model';
import { uuid } from '../../utils/uuid';
import { StorageService } from '../../services/storage.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-comidas',
  templateUrl: 'comidas.page.html',
  styleUrls: ['comidas.page.scss'],
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonCard,
  ],
})
export class ComidasPage implements OnInit {
  desayunos = signal<Comida[]>([]);
  cenas = signal<Comida[]>([]);

  constructor(
    private storage: StorageService,
    private alert: AlertService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    const data = await this.storage.getComidas();
    this.desayunos.set(data.filter((c) => c.tipo === 'desayuno'));
    this.cenas.set(data.filter((c) => c.tipo === 'cena'));
  }

  async agregar(tipo: 'desayuno' | 'cena'): Promise<void> {
    const data = await this.alert.promptAgregarItem(
      tipo === 'desayuno' ? 'Agregar desayuno' : 'Agregar cena',
      'Nombre',
      'Ingredientes (opcional)',
    );
    if (!data) return;
    const nueva: Comida = {
      id: uuid(),
      nombre: data[0],
      ingredientes: data[1] || undefined,
      tipo,
    };
    await this.storage.saveComida(nueva);
    await this.cargar();
  }

  async agregarActual(): Promise<void> {
    const tipo = await this.alert.selectFromList('Tipo de comida', [
      { text: 'Desayuno', value: 'desayuno' },
      { text: 'Cena', value: 'cena' },
    ]);
    if (!tipo) return;
    await this.agregar(tipo as 'desayuno' | 'cena');
  }

  async editar(comida: Comida): Promise<void> {
    const data = await this.alert.promptEditarItem(
      'Editar comida',
      'Nombre',
      'Ingredientes (opcional)',
      comida.nombre,
      comida.ingredientes ?? '',
    );
    if (!data) return;
    comida.nombre = data[0];
    comida.ingredientes = data[1] || undefined;
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
