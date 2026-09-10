import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppVerificationService } from './services/app-verification.service';
import { AdmobService } from './services/admob.service';
import { ConnectivityService } from './services/connectivity.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <router-outlet *ngIf="connectivity.online"></router-outlet>
    <main class="offline-screen" *ngIf="!connectivity.online">
      <div class="offline-card">
        <div class="offline-icon">📡</div>
        <h1>NO INTERNET CONNECTION</h1>
        <p>Tic Rush needs an internet connection to load ads and save your rewards. Please reconnect to keep playing.</p>
        <button (click)="connectivity.recheck()">TRY AGAIN</button>
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .offline-screen {
      width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
      padding: 24px; background:
        radial-gradient(circle at 10% 0%, rgba(32,224,255,.13), transparent 28%),
        radial-gradient(circle at 100% 65%, rgba(121,88,255,.14), transparent 34%),
        linear-gradient(145deg,#060b24,#091333);
    }
    .offline-card {
      max-width: 360px; width: 100%; text-align: center;
      background: linear-gradient(145deg, rgba(25,42,91,.98), rgba(12,23,59,.98));
      border: 1px solid #3e5ea8; border-radius: 22px; padding: 32px 24px;
      box-shadow: 0 12px 28px rgba(0,0,0,.2);
    }
    .offline-icon { font-size: 48px; margin-bottom: 14px; }
    h1 { color: #f7f9ff; font-size: 19px; font-weight: 950; letter-spacing: .4px; margin: 0 0 10px; }
    p { color: #9caed8; font-size: 14px; line-height: 1.5; margin: 0 0 22px; }
    button {
      width: 100%; padding: 14px; border: none; border-radius: 14px; font: inherit;
      font-weight: 900; letter-spacing: .5px; font-size: 14px; color: #06122c;
      background: linear-gradient(90deg, #20e0ff, #527cff);
    }
    button:active { transform: scale(.985); }
  `]
})
export class AppComponent implements OnInit {
  constructor(
    private appVerification: AppVerificationService,
    private admob: AdmobService,
    public connectivity: ConnectivityService
  ) {}

  ngOnInit(): void {
    this.appVerification.verify();
    void this.admob.initialize().then(() => this.admob.showBanner());
  }
}
