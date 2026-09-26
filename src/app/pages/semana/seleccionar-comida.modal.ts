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
      @if (seleccionadaId) {
        <button type="button" class="comida-card comida-card--quitar" (click)="quitar()">
          <span class="comida-card__icon">
            <ion-icon name="trash-outline"></ion-icon>
          </span>
          <span class="comida-card__body">
            <span class="comida-card__nombre">Quitar</span>
            <span class="comida-card__ingredientes">Dejar sin asignar</span>
          </span>
        </button>
      }
      @for (comida of comidas; track comida.id) {
        <button
          type="button"
          class="comida-card"
          [class.comida-card--selected]="isSeleccionada(comida)"
          [attr.aria-current]="isSeleccionada(comida) ? 'true' : null"
          (click)="seleccionar(comida)"
        >
          <span class="comida-card__icon">
            <ion-icon name="restaurant-outline"></ion-icon>
          </span>
          <span class="comida-card__body">
            <span class="comida-card__nombre">{{ comida.nombre }}</span>
            @if (comida.ingredientes) {
              <span class="comida-card__ingredientes">{{ comida.ingredientes }}</span>
            }
          </span>
          @if (isSeleccionada(comida)) {
            <ion-icon name="checkmark-circle" class="comida-card__check"></ion-icon>
          }
        </button>
      }
    </ion-content>
  `,
  styles: [`
    .comida-count {
      padding: 16px 20px 8px;

      ion-note {
        color: var(--color-texto-tenue);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .comida-card {
      display: flex;
      align-items: center;
      gap: 14px;
      width: calc(100% - 24px);
      margin: 0 12px 10px;
      padding: 14px 16px;
      border: none;
      background: var(--fondo-tarjeta);
      border-radius: 14px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
      font: inherit;
      color: inherit;
      text-align: start;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      cursor: pointer;

      &:active {
        transform: scale(0.98);
      }

      &:focus-visible {
        outline: 2px solid var(--ion-color-primary);
        outline-offset: 2px;
      }

      &--selected {
        background: var(--fondo-primario-tenue);
        border: 1.5px solid var(--ion-color-primary);
        box-shadow: 0 2px 8px rgba(var(--ion-color-primary-rgb), 0.15);
      }
    }

    .comida-card__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: var(--fondo-suave);
      flex-shrink: 0;

      ion-icon {
        font-size: 20px;
        color: var(--color-texto-secundario);
      }

      .comida-card--selected & {
        background: var(--ion-color-primary);

        ion-icon {
          color: var(--color-sobre-primario);
        }
      }

      .comida-card--quitar & {
        background: var(--fondo-peligro);

        ion-icon {
          color: var(--color-peligro);
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
      color: var(--color-texto);
    }

    .comida-card__ingredientes {
      font-size: 0.82rem;
      color: var(--color-texto-secundario);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .comida-card--quitar .comida-card__nombre {
      color: var(--color-peligro);
    }

    .comida-card__check {
      font-size: 24px;
      color: var(--ion-color-primary);
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

  quitar(): void {
    this.modalCtrl.dismiss(null, 'quitar');
  }
}
