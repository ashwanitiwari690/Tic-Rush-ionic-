import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';
import { AdMobService } from './services/admob.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, RouterOutlet],
  template: `
    <ion-app>
      <router-outlet></router-outlet>
    </ion-app>
  `
})
export class AppComponent {
  constructor(admob: AdMobService) {
    // No-op on web; on native this warms up the AdMob SDK so the first rewarded ad loads faster.
    admob.initialize().catch(() => {});
  }
}
