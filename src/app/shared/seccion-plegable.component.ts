import { Component, input, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular';

/** Sección que se pliega o despliega tocando su encabezado (ícono + título + cantidad). Empieza abierta. */
@Component({
  selector: 'app-seccion-plegable',
  template: `
    <div
      class="section-header section-header--plegable"
      [class.section-header--plegada]="plegada()"
      role="button"
      [attr.aria-expanded]="!plegada()"
      (click)="plegada.set(!plegada())"
    >
      <div class="section-icon {{ tono() }}">
        <ion-icon [name]="icono()"></ion-icon>
      </div>
      <span class="section-title">{{ titulo() }}</span>
      <span class="section-count">{{ cantidad() }}</span>
      <ion-icon class="section-chevron" name="chevron-down-outline"></ion-icon>
    </div>
    <div class="seccion-plegable" [class.seccion-plegable--plegada]="plegada()">
      <div class="seccion-contenido">
        <ng-content />
      </div>
    </div>
  `,
  styles: [':host { display: block; }'],
  imports: [IonIcon],
})
export class SeccionPlegableComponent {
  titulo = input.required<string>();
  icono = input.required<string>();
  tono = input.required<string>();
  cantidad = input.required<string | number>();

  plegada = signal(false);
}
