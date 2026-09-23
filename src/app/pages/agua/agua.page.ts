import { Component, OnInit, signal, computed } from '@angular/core';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonLabel,
  IonFab,
  IonFabButton,
} from '@ionic/angular';
import { StorageService, RegistroAgua } from '../../services/storage.service';

const META_VASOS = 8;

@Component({
  selector: 'app-agua',
  templateUrl: 'agua.page.html',
  styleUrls: ['agua.page.scss'],
  imports: [IonContent, IonButton, IonIcon, IonLabel, IonFab, IonFabButton],
})
export class AguaPage implements OnInit {
  registro = signal<RegistroAgua>({ fecha: '', vasos: 0 });
  meta = META_VASOS;
  progreso = computed(() => Math.min(this.registro().vasos / this.meta, 1));
  cumplido = computed(() => this.registro().vasos >= this.meta);

  constructor(private storage: StorageService) {}

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    const reg = await this.storage.getAgua();
    this.registro.set(reg);
  }

  async sumarVaso(): Promise<void> {
    const reg = { ...this.registro(), vasos: this.registro().vasos + 1 };
    this.registro.set(reg);
    await this.storage.putAgua(reg);
  }

  async restarVaso(): Promise<void> {
    if (this.registro().vasos === 0) return;
    const reg = { ...this.registro(), vasos: this.registro().vasos - 1 };
    this.registro.set(reg);
    await this.storage.putAgua(reg);
  }

  async reiniciar(): Promise<void> {
    const reg = { ...this.registro(), vasos: 0 };
    this.registro.set(reg);
    await this.storage.putAgua(reg);
  }
}
