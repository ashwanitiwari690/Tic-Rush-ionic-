import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../../components/icon/icon.component';
import { GameService, Mode } from '../../services/game.service';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-select-mode',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: 'select-mode.page.html',
  styleUrl: 'select-mode.page.css'
})
export class SelectModePage {
  navigating = false;

  constructor(public game: GameService, private router: Router, private audio: AudioService) {}

  async go(mode: Mode) {
    if (this.navigating) return;
    this.navigating = true;
    this.audio.startMusic();
    this.game.setMode(mode);
    try {
      await this.router.navigateByUrl('/game');
    } finally {
      this.navigating = false;
    }
  }

  async back() {
    if (this.navigating) return;
    this.navigating = true;
    try {
      await this.router.navigateByUrl('/home');
    } finally {
      this.navigating = false;
    }
  }
}
