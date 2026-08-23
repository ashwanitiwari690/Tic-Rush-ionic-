import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, trophy, sparkles, personCircleOutline, walletOutline } from 'ionicons/icons';
import { GameService } from '../../services/game.service';
import { WithdrawalService } from '../../services/withdrawal.service';
import { WithdrawalCardComponent } from '../../components/withdrawal-card/withdrawal-card.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, WithdrawalCardComponent],
  templateUrl: 'profile.page.html',
  styleUrl: 'profile.page.css'
})
export class ProfilePage {
  navigating = false;

  constructor(public game: GameService, public withdrawal: WithdrawalService, public router: Router) {
    addIcons({ arrowBack, trophy, sparkles, personCircleOutline, walletOutline });
  }

  get accuracy() {
    return this.game.stats.games ? Math.round(this.game.stats.wins / this.game.stats.games * 100) : 0;
  }


  async back() {
    if (this.navigating) return;
    this.navigating = true;
    try { await this.router.navigateByUrl('/home'); }
    finally { this.navigating = false; }
  }
}
