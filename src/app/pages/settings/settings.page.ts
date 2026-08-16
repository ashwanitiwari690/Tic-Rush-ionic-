import { Component } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonToggle, IonRange } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, volumeHigh, musicalNotes, personCircleOutline, walletOutline } from 'ionicons/icons';
import { AudioService } from '../../services/audio.service';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, DecimalPipe, IonContent, IonIcon, IonToggle, IonRange],
  templateUrl: 'settings.page.html',
  styleUrl: 'settings.page.css'
})
export class SettingsPage {
  navigating = false;
  withdrawNumber = '';
  withdrawMessage = '';

  constructor(public audio: AudioService, public game: GameService, public router: Router) {
    addIcons({ arrowBack, volumeHigh, musicalNotes, personCircleOutline, walletOutline });
  }

  async back() {
    if (this.navigating) return;
    this.navigating = true;
    try { await this.router.navigateByUrl('/home'); }
    finally { this.navigating = false; }
  }

  async openProfile() {
    if (this.navigating) return;
    this.navigating = true;
    try { await this.router.navigateByUrl('/profile'); }
    finally { this.navigating = false; }
  }

  onWithdrawInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.withdrawNumber = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = this.withdrawNumber;
  }

  withdraw() {
    if (this.withdrawNumber.length === 10 && this.game.coins >= 1000) {
      this.withdrawMessage = `Request ready for API integration • payout ₹${this.game.walletRupees.toFixed(2)}`;
    }
  }
}
