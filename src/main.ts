import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Estilo iOS en todas las plataformas, también en PC. Sin el deslizar atrás de Ionic:
    // deslizar a los lados cambia de pestaña
    provideIonicAngular({ mode: 'ios', swipeBackEnabled: false }),
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()), provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerImmediately'
          }),
  ],
});
