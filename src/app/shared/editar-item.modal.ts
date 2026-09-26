import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonIcon,
  IonInput,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  ModalController,
} from '@ionic/angular';
import { FORMATO_FECHA, LOCALE_FECHAS, fechaHoy, sumarDias } from '../utils/fecha';

// ion-datetime-button busca su ion-datetime por id en el documento: cada modal usa uno propio
let contadorFechas = 0;

export interface EditarItemConfig {
  titulo: string;
  boton: 'Agregar' | 'Guardar';
  icono: string;
  label1: string;
  label2: string;
  value1: string;
  value2: string;
  input2Type?: 'text' | 'date';
  campo2Opcional?: boolean;
  sugerencias2?: string[]; // atajos que rellenan el campo 2 cuando es de texto
  // Selector de una opción arriba de los campos (p. ej. la categoría o el tipo)
  labelOpcion?: string;
  opciones?: { valor: string; texto: string }[];
  opcion?: string;
}

@Component({
  selector: 'app-editar-item-modal',
  template: `
    <ion-header class="modal-header">
      <div class="modal-handle"></div>
      <ion-toolbar>
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
        @if (config.opciones) {
          <div class="form-field">
            <span class="field-label">{{ config.labelOpcion }}</span>
            <ion-segment [(ngModel)]="opcion">
              @for (o of config.opciones; track o.valor) {
                <ion-segment-button [value]="o.valor">
                  <ion-label>{{ o.texto }}</ion-label>
                </ion-segment-button>
              }
            </ion-segment>
          </div>
        }
        <div class="form-field">
          <span class="field-label">{{ config.label1 }}</span>
          <ion-input
            class="field-input"
            [(ngModel)]="value1"
            [placeholder]="config.label1"
            fill="solid"
            autocapitalize="sentences"
            autocorrect="on"
            [spellcheck]="true"
          ></ion-input>
        </div>
        <div class="form-field">
          <span class="field-label">{{ config.label2 }}</span>
          @if (config.input2Type === 'date') {
            <!-- Selector de Ionic y no <input type="date">: el nativo muestra la fecha en el
                 formato del sistema (p. ej. mes/día/año) y no se puede cambiar. -->
            <ion-datetime-button class="field-fecha" [datetime]="idFecha"></ion-datetime-button>
            <ion-modal #modalFecha class="calendario" [keepContentsMounted]="true">
              <ng-template>
                <ion-datetime
                  [id]="idFecha"
                  presentation="date"
                  [locale]="localeFechas"
                  [formatOptions]="formatoDatetime"
                  [firstDayOfWeek]="1"
                  [value]="value2"
                  (ionChange)="fechaElegida($event.detail.value); modalFecha.dismiss()"
                ></ion-datetime>
              </ng-template>
            </ion-modal>
            <div class="sugerencias">
              @for (s of sugerenciasFecha; track s.dias) {
                <button
                  type="button"
                  class="sugerencia"
                  [class.sugerencia--activa]="value2 === fechaEn(s.dias)"
                  (click)="value2 = fechaEn(s.dias)"
                >{{ s.texto }}</button>
              }
            </div>
          } @else {
            <ion-input
              class="field-input"
              [(ngModel)]="value2"
              [placeholder]="config.label2"
              fill="solid"
              autocapitalize="sentences"
              autocorrect="on"
              [spellcheck]="true"
            ></ion-input>
            @if (config.sugerencias2) {
              <div class="sugerencias">
                @for (s of config.sugerencias2; track s) {
                  <button
                    type="button"
                    class="sugerencia"
                    [class.sugerencia--activa]="value2 === s"
                    (click)="value2 = s"
                  >{{ s }}</button>
                }
              </div>
            }
          }
        </div>
      </div>
    </ion-content>
    <ion-footer>
      <div class="form-actions">
        <button class="btn-cancel" (click)="cancelar()">Cancelar</button>
        <button class="btn-save" [class.btn-save--disabled]="!puedeGuardar()" [disabled]="!puedeGuardar()" (click)="guardar()">{{ config.boton }}</button>
      </div>
    </ion-footer>
  `,
  styles: [`
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
      color: var(--color-texto-secundario);
      padding-left: 4px;
    }

    .field-input {
      --background: var(--fondo-tarjeta);
      --border-radius: 12px;
      --padding-start: 14px;
      --padding-end: 14px;
      --color: var(--color-texto);
      font-size: 1rem;
    }

    /* Botón del selector de fecha, con el mismo aspecto que los inputs */
    .field-fecha {
      justify-content: flex-start;
    }

    .field-fecha::part(native) {
      width: 100%;
      min-height: 44px;
      margin: 0;
      padding: 0 14px;
      text-align: start;
      background: var(--fondo-tarjeta);
      border-radius: 12px;
      color: var(--color-texto);
      font-size: 1rem;
    }

    .sugerencias {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .sugerencia {
      flex: 1 0 calc(25% - 6px);
      padding: 8px 4px;
      border: none;
      border-radius: 10px;
      background: var(--fondo-tarjeta);
      color: var(--color-texto-secundario);
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
    }

    .sugerencia--activa {
      background: var(--ion-color-primary);
      color: var(--color-sobre-primario);
    }

    .form-actions {
      display: flex;
      gap: 12px;
      padding: 32px;
      background: var(--fondo-modal);
    }

    .btn-cancel,
    .btn-save {
      flex: 1;
      padding: 18px;
      border-radius: 14px;
      border: none;
      font-size: 1.05rem;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: transform 0.15s ease;

      &:active {
        transform: scale(0.97);
      }
    }

    .btn-cancel {
      background: var(--fondo-suave);
      color: var(--color-texto-secundario);
    }

    .btn-save {
      background: var(--ion-color-primary);
      color: var(--color-sobre-primario);
    }

    .btn-save--disabled {
      background: var(--fondo-primario-deshabilitado);
      color: var(--color-sobre-primario);
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
    IonInput,
    IonDatetime,
    IonDatetimeButton,
    IonModal,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
})
export class EditarItemModal implements OnInit {
  private modalCtrl = inject(ModalController);

  @Input() config!: EditarItemConfig;

  value1 = '';
  value2 = '';
  opcion = '';

  readonly idFecha = `fecha-${++contadorFechas}`;
  readonly localeFechas = LOCALE_FECHAS;
  readonly formatoDatetime = { date: FORMATO_FECHA };
  // Un mes cuenta como 30 días, igual que la duración de los ítems de Mercado
  readonly sugerenciasFecha = [
    { texto: '3 días', dias: 3 },
    { texto: '1 semana', dias: 7 },
    { texto: '2 semanas', dias: 14 },
    { texto: '1 mes', dias: 30 },
  ];

  ngOnInit(): void {
    this.value1 = this.config.value1;
    this.value2 = this.config.value2;
    this.opcion = this.config.opcion ?? '';
    // El selector siempre muestra una fecha (hoy, si no hay ninguna): se usa esa misma
    // para que lo que se ve sea lo que se guarda.
    if (this.config.input2Type === 'date' && !this.value2) {
      this.value2 = fechaHoy();
    }
  }

  fechaEn(dias: number): string {
    return sumarDias(fechaHoy(), dias);
  }

  /** El selector puede entregar la fecha con hora (YYYY-MM-DDTHH:mm:ss): se guarda solo YYYY-MM-DD. */
  fechaElegida(valor: string | string[] | null | undefined): void {
    if (typeof valor === 'string') {
      this.value2 = valor.slice(0, 10);
    }
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
      opcion: this.opcion,
    });
  }

  cancelar(): void {
    this.modalCtrl.dismiss(null);
  }
}
