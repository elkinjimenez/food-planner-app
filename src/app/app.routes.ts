import { Routes } from '@angular/router';

export const routes: Routes = [
  // Fuera de las pestañas: se abre desde Semana o Hidratación y se vuelve con la flecha
  {
    path: 'historial',
    loadComponent: () => import('./pages/historial/historial.page').then((m) => m.HistorialPage),
  },
  {
    path: '',
    loadComponent: () => import('./pages/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: 'semana',
        loadComponent: () => import('./pages/semana/semana.page').then((m) => m.SemanaPage),
      },
      {
        path: 'comidas',
        loadComponent: () => import('./pages/comidas/comidas.page').then((m) => m.ComidasPage),
      },
      {
        path: 'mercado',
        loadComponent: () => import('./pages/mercado/mercado.page').then((m) => m.MercadoPage),
      },
      {
        path: 'nevera',
        loadComponent: () => import('./pages/nevera/nevera.page').then((m) => m.NeveraPage),
      },
      {
        path: 'agua',
        loadComponent: () => import('./pages/agua/agua.page').then((m) => m.AguaPage),
      },
      {
        path: '',
        redirectTo: 'semana',
        pathMatch: 'full',
      },
    ],
  },
];
