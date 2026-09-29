import { Injectable, signal } from '@angular/core';

export type Tema = 'sistema' | 'claro' | 'oscuro';

// En localStorage y no en IndexedDB: se leen sin esperar al abrir la app y no entran en los respaldos
const LLAVE_TEMA = 'food-planner-tema';
const LLAVE_VIBRACION = 'food-planner-vibracion';
const LLAVE_BIENVENIDA = 'food-planner-bienvenida-vista';

/** Preferencias de este dispositivo. */
@Injectable({ providedIn: 'root' })
export class AjustesService {
  private sistemaOscuro = matchMedia('(prefers-color-scheme: dark)');

  tema = signal<Tema>(leerTema());
  vibracion = signal(localStorage.getItem(LLAVE_VIBRACION) !== '0');
  mostrarBienvenida = signal(!localStorage.getItem(LLAVE_BIENVENIDA));
  // iOS no soporta la Vibration API
  readonly puedeVibrar = typeof navigator.vibrate === 'function';

  constructor() {
    this.aplicarTema();
    this.sistemaOscuro.addEventListener('change', () => this.aplicarTema());
  }

  cambiarTema(tema: Tema): void {
    localStorage.setItem(LLAVE_TEMA, tema);
    this.tema.set(tema);
    this.aplicarTema();
  }

  cambiarVibracion(activa: boolean): void {
    localStorage.setItem(LLAVE_VIBRACION, activa ? '1' : '0');
    this.vibracion.set(activa);
  }

  /** Llamar antes de cualquier await del gesto. */
  vibrar(ms = 50): void {
    if (this.vibracion()) navigator.vibrate?.(ms);
  }

  verBienvenida(): void {
    this.mostrarBienvenida.set(true);
  }

  cerrarBienvenida(): void {
    localStorage.setItem(LLAVE_BIENVENIDA, '1');
    this.mostrarBienvenida.set(false);
  }

  private aplicarTema(): void {
    const tema = this.tema();
    const oscuro = tema === 'oscuro' || (tema === 'sistema' && this.sistemaOscuro.matches);
    const html = document.documentElement;
    html.classList.toggle('ion-palette-dark', oscuro);
    // Controles nativos y barra del sistema con los colores del tema
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', oscuro ? 'dark' : 'light');
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', getComputedStyle(html).getPropertyValue('--ion-background-color').trim());
  }
}

function leerTema(): Tema {
  const tema = localStorage.getItem(LLAVE_TEMA);
  return tema === 'sistema' || tema === 'oscuro' ? tema : 'claro';
}
