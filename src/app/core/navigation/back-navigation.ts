import { Location } from '@angular/common';
import { Service, inject } from '@angular/core';
import { Router } from '@angular/router';

@Service()
export class BackNavigation {
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  /**
   * Returns to the previous page like the system back button, so the history doesn't grow with
   * duplicate entries. Falls back to `fallbackUrl` when the app was opened directly on this page.
   */
  back(fallbackUrl: string): void {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      void this.router.navigateByUrl(fallbackUrl, { replaceUrl: true });
    }
  }
}
