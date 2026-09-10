import { Injectable } from '@angular/core';

/**
 * Tracks whether the device currently has a network connection. Tic Rush's
 * economy is funded by AdMob ad revenue (coins are backed by real payouts),
 * so gameplay is blocked while offline rather than letting the player earn
 * coins with no ad ever having been requested or shown.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  online = typeof navigator === 'undefined' ? true : navigator.onLine;

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => { this.online = true; });
    window.addEventListener('offline', () => { this.online = false; });
  }

  /** Re-reads the browser's connectivity flag directly, for a manual "Try again" action. */
  recheck(): void {
    if (typeof navigator !== 'undefined') this.online = navigator.onLine;
  }
}
