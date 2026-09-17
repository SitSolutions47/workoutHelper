import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { TimerSession } from './services/timer-session';

export const SOUND_TIMER_ROUTES: Routes = [
  {
    path: '',
    title: 'timer',
    loadComponent: () => import('./timer-setup/timer-setup').then((m) => m.TimerSetup),
  },
  {
    path: 'presets',
    title: 'presets',
    loadComponent: () =>
      import('./timer-presets-page/timer-presets-page').then((m) => m.TimerPresetsPage),
  },
  {
    path: 'run',
    title: 'run',
    // A workout only starts from a tap in the setup screen (required for audio), e.g. not on reload.
    canActivate: [() => inject(TimerSession).status() !== 'idle' || inject(Router).parseUrl('/timer')],
    loadComponent: () => import('./timer-run/timer-run').then((m) => m.TimerRun),
  },
];
