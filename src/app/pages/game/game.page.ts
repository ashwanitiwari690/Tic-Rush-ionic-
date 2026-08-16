import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, volumeHigh, volumeMute } from 'ionicons/icons';
import { GameService } from '../../services/game.service';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: 'game.page.html',
  styleUrl: 'game.page.css'
})
export class GamePage {
  navigating = false;

  constructor(public game: GameService, public audio: AudioService, private router: Router) {
    addIcons({ arrowBack, volumeHigh, volumeMute });
  }

  move(i: number) {
    this.audio.startMusic();
    const result = this.game.play(i);
    if (!result.valid) return;
    this.audio.tap();
    if (this.game.winner === 'X') this.audio.win();
    else if (this.game.winner === 'O') this.audio.lose();
    else if (this.game.winner === 'draw') this.audio.draw();
  }

  async reset() {
    if (this.game.mode === 'daily' && this.game.winner === 'X') {
      await this.back();
      return;
    }
    this.game.resetBoard();
    this.audio.startMusic();
  }

  async back() {
    if (this.navigating) return;
    this.navigating = true;
    this.audio.stopMusic();
    try {
      await this.router.navigateByUrl('/home');
    } finally {
      this.navigating = false;
    }
  }

  toggleSound() {
    this.audio.setSound(!this.audio.sound);
  }

  switchMode() {
    this.game.setMode(this.game.mode === 'computer' ? 'team' : 'computer');
  }

  async endRun() {
    if (this.navigating) return;
    this.navigating = true;
    try {
      await this.router.navigateByUrl('/select-mode');
    } finally {
      this.navigating = false;
    }
  }

  resultTitle(): string {
    if (this.game.mode === 'survival') {
      if (this.game.winner === 'X') return 'ROUND CLEARED';
      if (this.game.winner === 'draw') return 'DRAW GAME';
      return 'RUN OVER';
    }
    if (this.game.mode === 'daily') {
      if (this.game.winner === 'X') return 'CHALLENGE CLEARED';
      if (this.game.winner === 'draw') return 'DRAW GAME';
      return 'ROUND OVER';
    }
    return this.game.winner === 'X' ? 'ROUND CLEARED' : this.game.winner === 'draw' ? 'DRAW GAME' : 'ROUND OVER';
  }

  resultSubtitle(): string {
    if (this.game.mode === 'survival') {
      if (this.game.winner === 'X') return `10 coins added • Streak ${this.game.survivalStreak}`;
      if (this.game.winner === 'draw') return 'Run continues at the same difficulty';
      return `Run ended • Best streak ${this.game.stats.survivalBest}`;
    }
    if (this.game.mode === 'daily') {
      if (this.game.winner === 'X') return `+25 coins • ${this.game.dailyStreak} day streak`;
      return "Try again to complete today's challenge";
    }
    return this.game.winner === 'X' && this.game.mode === 'computer' ? '10 coins added • Level up!' : 'Play another quick round';
  }

  resultButtonLabel(): string {
    if (this.game.mode === 'survival') return this.game.winner === 'O' ? 'NEW RUN' : 'NEXT ROUND';
    if (this.game.mode === 'daily') return this.game.winner === 'X' ? 'DONE' : 'TRY AGAIN';
    return 'REMATCH';
  }
}
