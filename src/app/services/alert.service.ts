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

  async promptAgregarItem(header: string, label1: string, label2: string): Promise<string[] | null> {
    return this.promptTwoInputs(header, label1, label2, '', '');
  }

  async promptEditarItem(
    header: string,
    label1: string,
    label2: string,
    value1: string,
    value2: string,
  ): Promise<string[] | null> {
    return this.promptTwoInputs(header, label1, label2, value1, value2);
  }

  private async promptTwoInputs(
    header: string,
    label1: string,
    label2: string,
    value1: string,
    value2: string,
  ): Promise<string[] | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header,
        inputs: [
          { name: 'input1', placeholder: label1, value: value1 },
          { name: 'input2', placeholder: label2, value: value2 },
        ],
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(null) },
          {
            text: 'Guardar',
            handler: (data) => {
              if (!data.input1?.trim()) {
                return false;
              }
              resolve([data.input1.trim(), data.input2?.trim() ?? '']);
              return true;
            },
          },
        ],
      });
      await alert.present();
    });
  }

  async promptSingle(header: string, placeholder: string, value?: string): Promise<string | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header,
        inputs: [{ name: 'input', placeholder, value: value ?? '' }],
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(null) },
          {
            text: 'Guardar',
            handler: (data) => {
              if (!data.input?.trim()) {
                return false;
              }
              resolve(data.input.trim());
              return true;
            },
          },
        ],
      });
      await alert.present();
    });
  }

  async selectFromList(header: string, options: { text: string; value: string }[]): Promise<string | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertCtrl.create({
        header,
        inputs: options.map((o) => ({ type: 'radio' as const, label: o.text, value: o.value })),
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(null) },
          { text: 'Seleccionar', handler: (data) => resolve(data as string) },
        ],
      });
      await alert.present();
    });
  }
}
