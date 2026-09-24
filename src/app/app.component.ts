import { Component, OnInit } from '@angular/core';
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
  ellipseOutline,
  timeOutline,
  arrowBackOutline,
  closeOutline,
} from 'ionicons/icons';
import { StorageService } from './services/storage.service';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private storage: StorageService,
    private swUpdate: SwUpdate
  ) {
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
      ellipseOutline,
      timeOutline,
      arrowBackOutline,
      closeOutline,
    });
  }

  ngOnInit(): void {
    this.storage.init().catch((err) => console.error('Error inicializando storage:', err));
    // Actualiza la aplicación si hay una nueva versión disponible
    if (this.swUpdate.isEnabled) {
      this.swUpdate.checkForUpdate();
    }

    // Escucha cuando hay update disponible
    this.swUpdate.versionUpdates.subscribe(event => {
      if (event.type === 'VERSION_READY') {
        this.swUpdate.activateUpdate().then(() => {
          document.location.reload();
        });
      }
    });
  }
}
