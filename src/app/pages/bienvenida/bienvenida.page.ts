import { Component, output } from '@angular/core';
import { IonIcon } from '@ionic/angular';

// En el orden del tab bar y con sus mismos íconos
const FUNCIONES = [
  { titulo: 'Semana', texto: 'Planea desayunos y cenas de la semana', icono: 'calendar-outline', tono: 'tono-cena' },
  { titulo: 'Comidas', texto: 'Tus opciones de desayuno y cena', icono: 'restaurant-outline', tono: 'tono-desayuno' },
  { titulo: 'Mercado', texto: 'Tu lista de compras', icono: 'cart-outline', tono: 'tono-supermercado' },
  { titulo: 'Nevera', texto: 'Lo que tienes en casa y cuándo vence', icono: 'snow-outline', tono: 'tono-nevera' },
  { titulo: 'Hidratación', texto: 'Los vasos de agua que tomas cada día', icono: 'water-outline', tono: 'tono-agua' },
];

/**
 * Se muestra la primera vez que se abre la app. Va encima de las pestañas y no como ruta: así
 * cargan detrás mientras se lee y, al empezar, Semana ya está lista.
 */
@Component({
  selector: 'app-bienvenida',
  templateUrl: 'bienvenida.page.html',
  styleUrls: ['bienvenida.page.scss'],
  imports: [IonIcon],
  host: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'bienvenida-titulo' },
})
export class BienvenidaPage {
  empezar = output();
  readonly funciones = FUNCIONES;
}
