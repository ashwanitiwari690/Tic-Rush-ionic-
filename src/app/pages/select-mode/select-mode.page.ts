import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, arrowForwardCircle, hardwareChipOutline, peopleOutline, flame } from 'ionicons/icons';
import { GameService, Mode } from '../../services/game.service';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-select-mode',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: 'select-mode.page.html',
  styleUrl: 'select-mode.page.css'
})
export class SelectModePage {
  navigating = false;

  constructor(public game: GameService, private router: Router, private audio: AudioService) {
    addIcons({ arrowBack, arrowForwardCircle, hardwareChipOutline, peopleOutline, flame });
  }

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
