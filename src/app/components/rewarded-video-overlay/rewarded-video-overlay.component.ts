import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { RewardAdService } from '../../services/reward-ad.service';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-rewarded-video-overlay',
  standalone: true,
  imports: [CommonModule, IonIcon],
  templateUrl: 'rewarded-video-overlay.component.html',
  styleUrl: 'rewarded-video-overlay.component.css'
})
export class RewardedVideoOverlayComponent {
  @Input() title = 'WATCH TO EARN 100 COINS';
  @Input() rewardLabel = '+100 🪙';
  /** Fires once, right after the video finishes and the reward has been marked complete. */
  @Output() completed = new EventEmitter<void>();

  constructor(public rewardAd: RewardAdService, private audio: AudioService) {
    addIcons({ close });
  }

  onVideoTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement;
    this.rewardAd.syncVideoTime(video.currentTime, video.duration);
  }

  onVideoEnded(): void {
    this.rewardAd.completeWatch();
    this.completed.emit();
  }

  cancelRewardedAd(): void {
    this.rewardAd.cancelWatch();
    this.audio.setMusic(true);
  }
}
