import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, trophy, sparkles, personCircleOutline, walletOutline } from 'ionicons/icons';
import { GameService } from '../../services/game.service';
import { GameRedemptionService, RedemptionError } from '../../services/game-redemption.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon],
  templateUrl: 'profile.page.html',
  styleUrl: 'profile.page.css'
})
export class ProfilePage implements OnInit {
  navigating = false;

  showWithdrawForm = false;
  submitting = false;
  errorMessage = '';
  successMessage = '';
  coinsToRedeem = 0;
  mobileNumber = '';

  constructor(public game: GameService, public router: Router, public redemption: GameRedemptionService) {
    addIcons({ arrowBack, trophy, sparkles, personCircleOutline, walletOutline });
  }

  ngOnInit(): void {
    this.redemption.ensureGameConfig();
  }

  get accuracy() {
    return this.game.stats.games ? Math.round(this.game.stats.wins / this.game.stats.games * 100) : 0;
  }

  get canWithdraw(): boolean {
    return this.redemption.isEligible(this.game.coins);
  }

  get mobileValid(): boolean {
    return /^\d{10}$/.test(this.mobileNumber);
  }

  get coinsValid(): boolean {
    return this.coinsToRedeem >= this.redemption.minimumCoins && this.coinsToRedeem <= this.game.coins;
  }

  get canSubmit(): boolean {
    return !this.submitting && this.mobileValid && this.coinsValid;
  }

  get estimatedRupees(): number | null {
    return this.redemption.estimateRupees(this.coinsToRedeem);
  }

  openWithdrawForm(): void {
    if (!this.canWithdraw) return;
    this.coinsToRedeem = this.game.coins;
    this.mobileNumber = this.redemption.lastUsedMobile;
    this.errorMessage = '';
    this.successMessage = '';
    this.showWithdrawForm = true;
  }

  closeWithdrawForm(): void {
    if (this.submitting) return;
    this.showWithdrawForm = false;
    this.redemption.clearPendingRequest();
    this.errorMessage = '';
  }

  onCoinsInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    this.coinsToRedeem = Math.min(this.game.coins, Number(digits) || 0);
  }

  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.mobileNumber = input.value.replace(/\D/g, '').slice(0, 10);
  }

  async confirmWithdraw(): Promise<void> {
    if (!this.canSubmit) return;
    this.submitting = true;
    this.errorMessage = '';

    const idempotencyKey = this.redemption.currentIdempotencyKey ?? this.redemption.beginRequest();
    const coins = this.coinsToRedeem;

    try {
      const res = await this.redemption.submit(coins, this.mobileNumber, idempotencyKey);

      this.redemption.rememberMobile(this.mobileNumber);
      this.game.redeemSuccessfulCoins(res.coinsRedeemed);
      this.redemption.clearPendingRequest();
      this.showWithdrawForm = false;
      this.successMessage = `Redeemed ${res.coinsRedeemed} coins for ₹${res.amountCredited}.`;
    } catch (err) {
      if (err instanceof RedemptionError) {
        this.errorMessage = err.message;
        if (err.code === 'DUPLICATE_CONVERSION') this.redemption.clearPendingRequest();
      } else {
        this.errorMessage = 'Something went wrong. Please try again.';
      }
    } finally {
      this.submitting = false;
    }
  }

  async back() {
    if (this.navigating) return;
    this.navigating = true;
    try { await this.router.navigateByUrl('/home'); }
    finally { this.navigating = false; }
  }
}
