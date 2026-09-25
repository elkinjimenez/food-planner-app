import { Component, Input, inject } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonNote, ModalController } from '@ionic/angular';
import { Comida } from '../../models/comida.model';

@Component({
  selector: 'app-seleccionar-comida-modal',
  template: `
    <ion-header class="modal-header">
      <div class="modal-handle"></div>
      <ion-toolbar>
        <ion-title class="modal-title">
          <div class="title-wrapper">
            <ion-icon name="restaurant-outline" class="title-icon"></ion-icon>
            <span class="title-text">{{ titulo }}</span>
          </div>
        </ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="modal-content">
      <div class="comida-count">
        <ion-note>{{ comidas.length }} opciones disponibles</ion-note>
      </div>
      @for (comida of comidas; track comida.id) {
        <div
          class="comida-card"
          [class.comida-card--selected]="isSeleccionada(comida)"
          (click)="seleccionar(comida)"
        >
          <div class="comida-card__icon">
            <ion-icon name="restaurant-outline"></ion-icon>
          </div>
          <div class="comida-card__body">
            <span class="comida-card__nombre">{{ comida.nombre }}</span>
            @if (comida.ingredientes) {
              <span class="comida-card__ingredientes">{{ comida.ingredientes }}</span>
            }
          </div>
          @if (isSeleccionada(comida)) {
            <ion-icon name="checkmark-circle" class="comida-card__check"></ion-icon>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .modal-header ion-toolbar {
      --background: #ffffff;
      --border-width: 0;
      --min-height: 64px;
      box-shadow: none;
    }

    /* Misma pestaña que Ionic pone en los modales sheet: flota sobre la barra */
    .modal-handle {
      position: absolute;
      top: 5px;
      left: 0;
      right: 0;
      z-index: 11;
      width: 36px;
      height: 5px;
      margin: 0 auto;
      border-radius: 8px;
      background: #c0c0be;
    }

    .modal-title {
      /* En iOS, ion-title va centrado en position absolute; static lo alinea a la izquierda, igual que en Android. */
      position: static;
      padding-inline-start: 16px;
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
      text-transform: capitalize;
    }

    .modal-content {
      --background: #f5f7fa;
    }

    .comida-count {
      padding: 16px 20px 8px;

      ion-note {
        color: #98a4b0;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .comida-card {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 0 12px 10px;
      padding: 14px 16px;
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      cursor: pointer;

      &:active {
        transform: scale(0.98);
      }

      &--selected {
        background: #e8f9ef;
        border: 1.5px solid #2dd36f;
        box-shadow: 0 2px 8px rgba(45, 211, 111, 0.15);
      }
    }

    .comida-card__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: #f0f4f8;
      flex-shrink: 0;

      ion-icon {
        font-size: 20px;
        color: #7a8b99;
      }

      .comida-card--selected & {
        background: #2dd36f;

        ion-icon {
          color: #ffffff;
        }
      }
    }

    .comida-card__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    .comida-card__nombre {
      font-size: 1rem;
      font-weight: 600;
      color: #1a2e35;
    }

    .comida-card__ingredientes {
      font-size: 0.82rem;
      color: #8a9ba8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .comida-card__check {
      font-size: 24px;
      color: #2dd36f;
      flex-shrink: 0;
    }
  `],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonNote],
})
export class SeleccionarComidaModal {
  private modalCtrl = inject(ModalController);

  @Input() titulo = 'Elegir';
  @Input() comidas: Comida[] = [];
  @Input() seleccionadaId: string | null = null;

  isSeleccionada(comida: Comida): boolean {
    return comida.id === this.seleccionadaId;
  }

  seleccionar(comida: Comida): void {
    this.modalCtrl.dismiss(comida);
  }
}
