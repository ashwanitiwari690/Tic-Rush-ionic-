import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../../components/icon/icon.component';
import { GameService, MarkTheme, MarkThemeId } from '../../services/game.service';
import { RewardAdService } from '../../services/reward-ad.service';
import { RewardedVideoOverlayComponent } from '../../components/rewarded-video-overlay/rewarded-video-overlay.component';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, IconComponent, RewardedVideoOverlayComponent],
  templateUrl: 'shop.page.html',
  styleUrl: 'shop.page.css'
})
export class ShopPage implements OnInit, OnDestroy {
  navigating = false;
  cooldownTick = 0;
  private pendingThemeId: MarkThemeId | null = null;
  private cooldownTimer?: number;

  constructor(public game: GameService, public rewardAd: RewardAdService, private router: Router) {}

  ngOnInit(): void {
    this.syncCooldownTimer();
  }

  private syncCooldownTimer(): void {
    if (!this.rewardAd.canWatch) {
      if (!this.cooldownTimer) {
        this.cooldownTimer = window.setInterval(() => {
          this.cooldownTick++;
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

  async back(): Promise<void> {
    if (this.navigating) return;
    this.navigating = true;
    try {
      await this.router.navigateByUrl('/home');
    } finally {
      this.navigating = false;
    }
  }

  buyTheme(id: MarkThemeId): void {
    this.game.buyOrSelectTheme(id);
  }

  isAffordable(id: MarkThemeId): boolean {
    const theme = this.game.getTheme(id);
    return this.game.isThemeOwned(id) || this.game.coins >= theme.price;
  }

  async watchAdForTheme(id: MarkThemeId): Promise<void> {
    this.pendingThemeId = id;
    const started = await this.rewardAd.startWatch();
    if (!started) {
      this.pendingThemeId = null;
      return;
    }
    this.onAdCompleted();
    this.syncCooldownTimer();
  }

  onAdCompleted(): void {
    if (!this.rewardAd.message || !this.rewardAd.consumeCompletedReward()) return;
    if (this.pendingThemeId) {
      this.game.unlockThemeByAd(this.pendingThemeId);
      this.pendingThemeId = null;
      this.syncCooldownTimer();
    }
  }

  formatCooldown(): string {
    void this.cooldownTick;
    return this.rewardAd.remainingLabel;
  }

  trackByThemeId(_index: number, theme: MarkTheme): string {
    return theme.id;
  }

  ngOnDestroy(): void {
    this.stopCooldownTimer();
    if (this.rewardAd.isWatching) this.rewardAd.cancelWatch();
  }
}
