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
    <ion-footer class="modal-footer">
      <div class="form-actions">
        <button class="btn-cancel" (click)="cancelar()">Cancelar</button>
        <button class="btn-save" [class.btn-save--disabled]="!puedeGuardar()" [disabled]="!puedeGuardar()" (click)="guardar()">{{ config.boton }}</button>
      </div>
    </ion-footer>
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

    .save-btn {
      --color: #2dd36f;
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
      background: #ffffff;
      border-radius: 12px;
      color: #1a2e35;
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
      background: #ffffff;
      color: #7a8b99;
      font-size: 0.85rem;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
    }

    .sugerencia--activa {
      background: #2dd36f;
      color: #ffffff;
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
      white-space: nowrap;
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
    IonInput,
    IonDatetime,
    IonDatetimeButton,
    IonModal,
  ],
})
export class EditarItemModal implements OnInit {
  private modalCtrl = inject(ModalController);

  @Input() config!: EditarItemConfig;

  value1 = '';
  value2 = '';

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
    });
  }

  cancelar(): void {
    this.modalCtrl.dismiss(null);
  }
}
