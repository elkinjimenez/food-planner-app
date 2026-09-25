import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class AlertService {
  constructor(private alertCtrl: AlertController) {}

  async confirm(header: string, message?: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(false) },
          { text: 'Aceptar', handler: () => resolve(true) },
        ],
      });
      await alert.present();
    });
  }
}
