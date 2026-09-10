import { Component } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../../components/icon/icon.component';
import { AudioService } from '../../services/audio.service';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, DecimalPipe, IconComponent],
  templateUrl: 'settings.page.html',
  styleUrl: 'settings.page.css'
})
export class SettingsPage {
  navigating = false;

  constructor(public audio: AudioService, public game: GameService, public router: Router) {}

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

  onSoundToggle(event: Event): void {
    this.audio.setSound((event.target as HTMLInputElement).checked);
  }

  onMusicToggle(event: Event): void {
    this.audio.setMusic((event.target as HTMLInputElement).checked);
  }

  onVolumeInput(event: Event): void {
    this.audio.setVolume((event.target as HTMLInputElement).valueAsNumber);
  }
}
