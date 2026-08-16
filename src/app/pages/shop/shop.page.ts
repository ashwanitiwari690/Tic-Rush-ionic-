import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, bagHandleOutline, checkmarkCircle, lockClosed, playCircle } from 'ionicons/icons';
import { GameService, MarkThemeId } from '../../services/game.service';
import { RewardAdService } from '../../services/reward-ad.service';
import { RewardedVideoOverlayComponent } from '../../components/rewarded-video-overlay/rewarded-video-overlay.component';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, RewardedVideoOverlayComponent],
  templateUrl: 'shop.page.html',
  styleUrl: 'shop.page.css'
})
export class ShopPage implements OnDestroy {
  navigating = false;
  cooldownTick = 0;
  private pendingThemeId: MarkThemeId | null = null;
  private cooldownTimer?: number;

  constructor(public game: GameService, public rewardAd: RewardAdService, private router: Router) {
    addIcons({ arrowBack, bagHandleOutline, checkmarkCircle, lockClosed, playCircle });
    this.cooldownTimer = window.setInterval(() => this.cooldownTick++, 1000);
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
    if (!started) { this.pendingThemeId = null; return; }
    this.onAdCompleted();
  }

  onAdCompleted(): void {
    if (!this.rewardAd.message || !this.rewardAd.consumeCompletedReward()) return;
    if (this.pendingThemeId) {
      this.game.unlockThemeByAd(this.pendingThemeId);
      this.pendingThemeId = null;
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
