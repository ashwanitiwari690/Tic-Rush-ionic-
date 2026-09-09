import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular/standalone';
import { AppVerificationService } from './services/app-verification.service';

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
export class AppComponent implements OnInit {
  constructor(private appVerification: AppVerificationService) {}

  ngOnInit(): void {
    this.appVerification.verify();
  }
}
