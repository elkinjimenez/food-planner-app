import { Component, OnInit, inject } from '@angular/core';
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
} from 'ionicons/icons';
import { StorageService } from './services/storage.service';
import { AppUpdateService } from './services/app-update.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private storage = inject(StorageService);
  private appUpdate = inject(AppUpdateService);

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
    });
  }

  ngOnInit(): void {
    this.storage.init().catch((err) => console.error('Error inicializando storage:', err));
    this.appUpdate.init();
  }
}
