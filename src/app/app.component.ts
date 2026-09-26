import { Component, OnInit, inject, signal } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  restaurantOutline,
  cartOutline,
  snowOutline,
  waterOutline,
  water,
  addOutline,
  removeOutline,
  trashOutline,
  createOutline,
  refreshOutline,
  shuffleOutline,
  sunnyOutline,
  moonOutline,
  leafOutline,
  checkmarkCircle,
  checkmarkSharp,
  timeOutline,
  arrowBackOutline,
  archiveOutline,
  calendarNumberOutline,
  chevronBackOutline,
  chevronForwardOutline,
  chevronDownOutline,
  flagOutline,
  shareOutline,
  todayOutline,
  closeOutline,
  searchOutline,
} from 'ionicons/icons';
import { StorageService } from './services/storage.service';
import { AppUpdateService } from './services/app-update.service';
import { BienvenidaPage } from './pages/bienvenida/bienvenida.page';

// En localStorage y no en IndexedDB: se lee sin esperar al abrir la app y no entra en los respaldos
const BIENVENIDA_VISTA = 'food-planner-bienvenida-vista';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, BienvenidaPage],
})
export class AppComponent implements OnInit {
  private storage = inject(StorageService);
  private appUpdate = inject(AppUpdateService);

  mostrarBienvenida = signal(!localStorage.getItem(BIENVENIDA_VISTA));

  constructor() {
    addIcons({
      calendarOutline,
      restaurantOutline,
      cartOutline,
      snowOutline,
      waterOutline,
      water,
      addOutline,
      removeOutline,
      trashOutline,
      createOutline,
      refreshOutline,
      shuffleOutline,
      sunnyOutline,
      moonOutline,
      leafOutline,
      checkmarkCircle,
      checkmarkSharp,
      timeOutline,
      arrowBackOutline,
      archiveOutline,
      calendarNumberOutline,
      chevronBackOutline,
      chevronForwardOutline,
      chevronDownOutline,
      flagOutline,
      shareOutline,
      todayOutline,
      closeOutline,
      searchOutline,
    });
  }

  ngOnInit(): void {
    this.storage.init().catch((err) => console.error('Error inicializando storage:', err));
    this.appUpdate.init();
  }

  cerrarBienvenida(): void {
    localStorage.setItem(BIENVENIDA_VISTA, '1');
    this.mostrarBienvenida.set(false);
  }
}
