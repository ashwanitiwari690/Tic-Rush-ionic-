import { Component } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon, IonToggle, IonRange } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, volumeHigh, musicalNotes, personCircleOutline } from 'ionicons/icons';
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

  constructor(public audio: AudioService, public game: GameService, public router: Router) {
    addIcons({ arrowBack, volumeHigh, musicalNotes, personCircleOutline });
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
}
