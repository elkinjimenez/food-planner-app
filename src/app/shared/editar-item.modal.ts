import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonIcon,
  IonButton,
  IonButtons,
  IonInput,
  ModalController,
} from '@ionic/angular';

export interface EditarItemConfig {
  titulo: string;
  icono: string;
  label1: string;
  label2: string;
  value1: string;
  value2: string;
  input2Type?: 'text' | 'date';
  campo2Opcional?: boolean;
}

@Component({
  selector: 'app-editar-item-modal',
  template: `
    <ion-header class="modal-header">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancelar()" class="close-btn" fill="clear">
            <ion-icon name="arrow-back-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title class="modal-title">
          <div class="title-wrapper">
            <ion-icon [name]="config.icono" class="title-icon"></ion-icon>
            <span class="title-text">{{ config.titulo }}</span>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="modal-content">
      <div class="edit-form">
        <div class="form-field">
          <span class="field-label">{{ config.label1 }}</span>
          <ion-input
            class="field-input"
            [(ngModel)]="value1"
            [placeholder]="config.label1"
            fill="solid"
          ></ion-input>
        </div>
        <div class="form-field">
          <span class="field-label">{{ config.label2 }}</span>
          @if (config.input2Type === 'date') {
            <ion-input
              class="field-input"
              type="date"
              [(ngModel)]="value2"
              [placeholder]="config.label2"
              fill="solid"
            ></ion-input>
          } @else {
            <ion-input
              class="field-input"
              [(ngModel)]="value2"
              [placeholder]="config.label2"
              fill="solid"
            ></ion-input>
          }
        </div>
      </div>
    </ion-content>
    <ion-footer class="modal-footer">
      <div class="form-actions">
        <button class="btn-cancel" (click)="cancelar()">Cancelar</button>
        <button class="btn-save" [class.btn-save--disabled]="!puedeGuardar()" [disabled]="!puedeGuardar()" (click)="guardar()">Guardar cambios</button>
      </div>
    </ion-footer>
  `,
  styles: [`
    .modal-header ion-toolbar {
      --background: #ffffff;
      --border-width: 0;
      --min-height: 64px;
    }

    .close-btn {
      --color: #98a4b0;
    }

    .save-btn {
      --color: #2dd36f;
    }

    .modal-title {
      padding-inline-start: 0;
    }

    .title-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-icon {
      font-size: 1.2rem;
      color: #2dd36f;
    }

    .title-text {
      font-weight: 700;
      font-size: 1.15rem;
      color: #1a2e35;
    }

    .modal-content {
      --background: #f5f7fa;
    }

    .edit-form {
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .field-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #7a8b99;
      padding-left: 4px;
    }

    .field-input {
      --background: #ffffff;
      --border-radius: 12px;
      --padding-start: 14px;
      --padding-end: 14px;
      --color: #1a2e35;
      font-size: 1rem;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      padding: 32px;
      background: #f5f7fa;
    }

    .btn-cancel,
    .btn-save {
      flex: 1;
      padding: 18px;
      border-radius: 14px;
      border: none;
      font-size: 1.05rem;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s ease;

      &:active {
        transform: scale(0.97);
      }
    }

    .btn-cancel {
      background: #f0f4f8;
      color: #7a8b99;
    }

    .btn-save {
      background: #2dd36f;
      color: #ffffff;
    }

    .btn-save--disabled {
      background: #c8e8d4;
      color: #ffffff;
      opacity: 0.6;
      cursor: not-allowed;
    }
  `],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonIcon,
    IonButton,
    IonButtons,
    IonInput,
  ],
})
export class EditarItemModal {
  @Input() config!: EditarItemConfig;

  value1 = '';
  value2 = '';

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    this.value1 = this.config.value1;
    this.value2 = this.config.value2;
  }

  puedeGuardar(): boolean {
    const v1 = this.value1.trim().length > 0;
    const v2 = this.value2.trim().length > 0;
    return v1 && (this.config.campo2Opcional || v2);
  }

  guardar(): void {
    this.modalCtrl.dismiss({
      value1: this.value1.trim(),
      value2: this.value2.trim(),
    });
  }

  cancelar(): void {
    this.modalCtrl.dismiss(null);
  }
}
