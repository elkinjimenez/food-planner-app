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
} from 'ionicons/icons';
import { StorageService } from './services/storage.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private storage: StorageService) {
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
    });
  }

  ngOnInit(): void {
    this.storage.init().catch((err) => console.error('Error inicializando storage:', err));
  }
}
