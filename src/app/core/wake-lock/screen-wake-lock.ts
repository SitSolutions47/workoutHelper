import { DOCUMENT, Service, inject } from '@angular/core';

/**
 * Keeps the screen on during a workout. Browsers throttle timers on a locked screen, which would
 * delay callouts. The lock is dropped whenever the page is hidden, so it's re-requested on return.
 */
@Service()
export class ScreenWakeLock {
  private readonly document = inject(DOCUMENT);

  private sentinel: WakeLockSentinel | undefined;
  private requesting = false;
  private wanted = false;

  constructor() {
    this.document.addEventListener('visibilitychange', () => {
      if (this.wanted && this.document.visibilityState === 'visible') {
        void this.acquire();
      }
    });
  }

  async request(): Promise<void> {
    this.wanted = true;
    await this.acquire();
  }

  async release(): Promise<void> {
    this.wanted = false;
    const sentinel = this.sentinel;
    this.sentinel = undefined;
    await sentinel?.release().catch(() => undefined);
  }

  private async acquire(): Promise<void> {
    const navigator = this.document.defaultView?.navigator;
    if (!navigator || !('wakeLock' in navigator) || this.requesting) {
      return;
    }
    if (this.sentinel && !this.sentinel.released) {
      return;
    }
    this.requesting = true;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      if (this.wanted) {
        this.sentinel = sentinel;
      } else {
        await sentinel.release();
      }
    } catch {
      // Denied (e.g. battery saver). The timer still works; the screen may just turn off.
    } finally {
      this.requesting = false;
    }
  }
}
