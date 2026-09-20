import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
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
export class SettingsPage implements OnInit {
  navigating = false;
  appVersion = '1.0.0';
  appBuild = '';

  constructor(public audio: AudioService, public game: GameService, public router: Router) {}

  async ngOnInit(): Promise<void> {
    await this.loadAppInfo();
  }

  private async loadAppInfo(): Promise<void> {
    try {
      const info = await App.getInfo();
      if (info?.version) {
        this.appVersion = info.version;
        this.appBuild = info.build;
      }
    } catch {
      this.appVersion = '1.0.0';
    }
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
