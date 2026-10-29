import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../../components/icon/icon.component';
import { GameService } from '../../services/game.service';
import { AudioService } from '../../services/audio.service';
import { RewardAdService, REWARDED_AD_COINS } from '../../services/reward-ad.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: 'home.page.html',
  styleUrl: 'home.page.css'
})
export class HomePage implements OnInit, OnDestroy {
  navigating = false;
  rewardNotice = '';
  cooldownTick = 0;
  todayDate = new Date().getDate();
  private cooldownTimer?: number;

  constructor(
    public game: GameService,
    public router: Router,
    private audio: AudioService,
    public rewardAd: RewardAdService
  ) {}

  ngOnInit(): void {
    this.audio.stopMusic();
    this.syncCooldownTimer();
  }

  /** Starts the 1s ticker only when an actual cooldown is ticking down; pauses otherwise to save CPU/battery. */
  private syncCooldownTimer(): void {
    if (!this.rewardAd.canWatch) {
      if (!this.cooldownTimer) {
        this.cooldownTimer = window.setInterval(() => {
          this.cooldownTick++;
          this.finishRewardedAd();
          if (this.rewardAd.canWatch) {
            this.stopCooldownTimer();
          }
        }, 1000);
      }
    } else {
      this.stopCooldownTimer();
    }
  }

  private stopCooldownTimer(): void {
    if (this.cooldownTimer !== undefined) {
      window.clearInterval(this.cooldownTimer);
      this.cooldownTimer = undefined;
    }
  }

  /** Opens mode selection cleanly without disruptive interstitial ads on action buttons. */
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
    if (this.rewardAd.isWatching || !this.rewardAd.canWatch) return;
    this.rewardNotice = '';
    const started = await this.rewardAd.startWatch({ allowSimulatedFallback: false });
    if (!started) {
      if (!this.rewardAd.usesNativeAds) {
        this.rewardNotice = 'Rewarded ads run on the Tic Rush Android app — open it on your device to earn coins.';
      } else {
        this.rewardNotice = 'Ad was closed early or could not be loaded. Please try again.';
      }
      return;
    }
    this.finishRewardedAd();
    this.syncCooldownTimer();
  }

  finishRewardedAd(): void {
    if (!this.rewardAd.isWatching && this.rewardAd.message && this.rewardAd.consumeCompletedReward()) {
      this.game.addCoins(REWARDED_AD_COINS);
      this.rewardNotice = `+${REWARDED_AD_COINS} coins added to your wallet`;
      this.syncCooldownTimer();
    }
  }

  formatCooldown(): string {
    void this.cooldownTick;
    return this.rewardAd.remainingLabel;
  }

  ngOnDestroy(): void {
    this.stopCooldownTimer();
    if (this.rewardAd.isWatching) this.rewardAd.cancelWatch();
  }
}
