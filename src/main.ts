import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { Injectable, isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { LocationStrategy, PathLocationStrategy } from '@angular/common';

// Toda la app ocupa una sola entrada del historial: los gestos atrás/adelante del sistema no
// navegan dentro de ella. En Historial se vuelve con el deslizar de Ionic o la flecha.
@Injectable()
class SinHistorialStrategy extends PathLocationStrategy {
  override pushState(state: unknown, title: string, url: string, queryParams: string): void {
    this.replaceState(state, title, url, queryParams);
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: LocationStrategy, useClass: SinHistorialStrategy },
    // Estilo iOS en todas las plataformas, también en PC
    provideIonicAngular({ mode: 'ios' }),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerImmediately'
          }),
  ],
});
