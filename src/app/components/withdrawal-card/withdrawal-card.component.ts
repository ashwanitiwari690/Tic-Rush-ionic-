import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { walletOutline, closeCircle } from 'ionicons/icons';
import { GameService } from '../../services/game.service';
import { WithdrawalError, WithdrawalService } from '../../services/withdrawal.service';

type ViewState = 'summary' | 'confirm' | 'success';

@Component({
  selector: 'app-withdrawal-card',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: 'withdrawal-card.component.html',
  styleUrl: 'withdrawal-card.component.css'
})
export class WithdrawalCardComponent implements OnInit {
  view: ViewState = 'summary';
  mobileNumber = '';
  errorMessage = '';
  /** Rupee amount confirmed by the backend for the last completed redemption. */
  lastAmount = '0.00';

  constructor(public game: GameService, public withdrawal: WithdrawalService) {
    addIcons({ walletOutline, closeCircle });
  }

  ngOnInit(): void {
    this.mobileNumber = this.withdrawal.getRegisteredMobileNumber();
  }

  get coinsToRedeem(): number { return this.game.coins; }
  get mobileNumberValid(): boolean { return /^[6-9]\d{9}$/.test(this.mobileNumber); }

  /**
   * Stays true through an in-flight or just-completed redemption even after coins drop
   * below the minimum, so the success confirmation is never torn out from under the
   * player. Only goes false once they've acknowledged it (done()) and are back below 1000.
   */
  get visible(): boolean { return this.withdrawal.isEligible || this.view !== 'summary'; }

  onMobileNumberInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.mobileNumber = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = this.mobileNumber;
    this.errorMessage = '';
  }

  openConfirm(): void {
    this.errorMessage = '';
    this.view = 'confirm';
  }

  cancel(): void {
    if (this.withdrawal.isProcessing) return;
    this.errorMessage = '';
    this.view = 'summary';
  }

  async confirm(): Promise<void> {
    if (this.withdrawal.isProcessing || !this.mobileNumberValid) return;
    this.errorMessage = '';
    const coins = this.coinsToRedeem;

    try {
      const response = await this.withdrawal.redeem(this.mobileNumber, coins);
      this.lastAmount = response.amountCredited;
      this.view = 'success';
    } catch (err) {
      this.errorMessage = err instanceof WithdrawalError ? err.message : 'Something went wrong. Please try again.';
    }
  }

  done(): void {
    this.view = 'summary';
  }
}
