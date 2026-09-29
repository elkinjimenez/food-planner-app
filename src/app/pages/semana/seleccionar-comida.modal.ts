import { Component, ElementRef, Input, inject } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonNote } from '@ionic/angular';
import { Comida, TipoComida } from '../../models/comida.model';
import { AlertService } from '../../services/alert.service';
import { IngredientesPipe } from '../../shared/ingredientes.pipe';
import { injectCrearComida } from '../../shared/crear-comida';

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
      <!-- Con las dos acciones, van en una sola línea -->
      <div class="acciones" [class.acciones--dos]="!!seleccionadaId">
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
        <button type="button" class="comida-card comida-card--crear" (click)="crear()">
          <span class="comida-card__icon">
            <ion-icon name="add-outline"></ion-icon>
          </span>
          <span class="comida-card__body">
            <span class="comida-card__nombre">{{ textoCrear() }}</span>
            <span class="comida-card__ingredientes">Se agrega a Mis Comidas y queda elegido</span>
          </span>
        </button>
      </div>
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
            @if (comida.ingredientes.length > 0) {
              <span class="comida-card__ingredientes">{{ comida.ingredientes | ingredientes }}</span>
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
        box-shadow: 0 2px 8px rgba(var(--brillo-rgb), 0.15);
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

      .comida-card--crear & {
        background: var(--fondo-primario-tenue);

        ion-icon {
          color: var(--ion-color-primary);
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

    .comida-card--crear .comida-card__nombre {
      color: var(--color-primario-texto);
    }

    .acciones {
      display: flex;
      gap: 10px;
      margin: 0 12px 10px;

      .comida-card {
        flex: 1;
        width: auto;
        min-width: 0;
        margin: 0;
      }
    }

    // Quitar y crear lado a lado: más compactas y sin la descripción
    .acciones--dos {
      .comida-card {
        gap: 8px;
        padding: 12px 10px;
      }

      .comida-card__icon {
        width: 32px;
        height: 32px;
        border-radius: 10px;

        ion-icon {
          font-size: 18px;
        }
      }

      .comida-card__nombre {
        font-size: 0.95rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .comida-card__ingredientes {
        display: none;
      }
    }

    .comida-card__check {
      font-size: 24px;
      color: var(--ion-color-primary);
      flex-shrink: 0;
    }
  `],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonNote, IngredientesPipe],
})
export class SeleccionarComidaModal {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private alert = inject(AlertService);
  private crearComida = injectCrearComida();

  @Input() titulo = 'Elegir';
  @Input() tipo: TipoComida = 'desayuno';
  @Input() comidas: Comida[] = [];
  @Input() seleccionadaId: string | null = null;

  /** En la línea con "Quitar" (media fila) va un texto más corto. */
  textoCrear(): string {
    if (this.tipo === 'desayuno') return this.seleccionadaId ? 'Nuevo desayuno' : 'Crear desayuno';
    return this.seleccionadaId ? 'Nueva cena' : 'Crear cena';
  }

  isSeleccionada(comida: Comida): boolean {
    return comida.id === this.seleccionadaId;
  }

  seleccionar(comida: Comida): void {
    void this.cerrar(comida);
  }

  quitar(): void {
    void this.cerrar(null, 'quitar');
  }

  /** Abre el modal de crear comida encima; la nueva queda elegida. */
  async crear(): Promise<void> {
    const nueva = await this.crearComida(this.tipo);
    if (!nueva) return;
    if (nueva.tipo === this.tipo) {
      await this.cerrar(nueva);
      return;
    }
    // Al crearla se cambió el tipo: queda en Mis Comidas, pero no sirve para este espacio
    await this.alert.toast(nueva.nombre, { header: nueva.tipo === 'desayuno' ? 'Guardado en tus desayunos' : 'Guardada en tus cenas' });
  }

  /**
   * Cierra este modal y no "el de encima": al volver de crear una comida, el modal de crear aún
   * está terminando de cerrarse y ModalController.dismiss() lo tomaría a él.
   */
  private cerrar(data: Comida | null, role?: string): Promise<boolean> {
    return this.el.nativeElement.closest('ion-modal')!.dismiss(data, role);
  }
}
