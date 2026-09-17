import { Routes } from '@angular/router';

/** Route titles are translation keys, see `TranslatedTitleStrategy`. */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'home',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'settings',
    title: 'settings',
    loadComponent: () => import('./features/settings/settings').then((m) => m.Settings),
  },
  {
    path: 'timer',
    loadChildren: () =>
      import('./features/sound-timer/sound-timer.routes').then((m) => m.SOUND_TIMER_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
