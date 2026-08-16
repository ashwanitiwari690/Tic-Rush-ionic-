import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForwardCircle, settingsOutline, personCircleOutline, playCircle, bagHandleOutline, checkmarkCircle } from 'ionicons/icons';
import { GameService } from '../../services/game.service';
import { AudioService } from '../../services/audio.service';
import { RewardAdService, REWARDED_AD_COINS } from '../../services/reward-ad.service';
import { RewardedVideoOverlayComponent } from '../../components/rewarded-video-overlay/rewarded-video-overlay.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, RewardedVideoOverlayComponent],
  templateUrl: 'home.page.html',
  styleUrl: 'home.page.css'
})
export class HomePage implements OnDestroy {
  navigating = false;
  rewardNotice = '';
  cooldownTick = 0;
  todayDate = new Date().getDate();
  private cooldownTimer?: number;

  constructor(public game: GameService, public router: Router, private audio: AudioService, public rewardAd: RewardAdService) {
    addIcons({ arrowForwardCircle, settingsOutline, personCircleOutline, playCircle, bagHandleOutline, checkmarkCircle });
    this.cooldownTimer = window.setInterval(() => {
      this.cooldownTick++;
      this.finishRewardedAd();
    }, 1000);
  }

  async openSelectMode() {
    if (this.navigating || this.rewardAd.isWatching) return;
    this.navigating = true;
    try {
      await this.router.navigateByUrl('/select-mode');
    } finally {
      this.navigating = false;
    }
  }

  async openDailyChallenge() {
    if (this.navigating || this.rewardAd.isWatching || this.game.dailyCompletedToday) return;
    this.navigating = true;
    this.audio.startMusic();
    this.game.setMode('daily');
    try {
      await this.router.navigateByUrl('/game');
    } finally {
      this.navigating = false;
    }
  }

  async open(path: '/profile' | '/settings' | '/shop') {
    if (this.navigating || this.rewardAd.isWatching) return;
    this.navigating = true;
    try {
      await this.router.navigateByUrl(path);
    } finally {
      this.navigating = false;
    }
  }

  async watchRewardedAd(): Promise<void> {
    this.rewardNotice = '';
    const started = await this.rewardAd.startWatch();
    if (!started) return;
    this.finishRewardedAd();
  }

  finishRewardedAd(): void {
    if (!this.rewardAd.isWatching && this.rewardAd.message && this.rewardAd.consumeCompletedReward()) {
      this.game.addCoins(REWARDED_AD_COINS);
      this.rewardNotice = `+${REWARDED_AD_COINS} coins added to your wallet`;
    }
  }

  formatCooldown(): string {
    void this.cooldownTick;
    return this.rewardAd.remainingLabel;
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer !== undefined) window.clearInterval(this.cooldownTimer);
    if (this.rewardAd.isWatching) this.rewardAd.cancelWatch();
  }
}
