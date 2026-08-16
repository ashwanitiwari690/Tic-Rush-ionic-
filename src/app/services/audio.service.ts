import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  sound = this.readBool('tic-sound', true);
  music = this.readBool('tic-music', true);
  volume = this.readNumber('tic-volume', 0.9);

  private ctx?: AudioContext;
  private musicGain?: GainNode;
  private sfxGain?: GainNode;
  private timer?: number;
  private step = 0;

  private readBool(key: string, fallback: boolean): boolean {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  }

  private readNumber(key: string, fallback: number): number {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
  }

  private audioContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.gain.value = Math.min(1, this.volume * 0.9);
      this.sfxGain.gain.value = 0.95;
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private unlock() {
    const c = this.audioContext();
    if (c.state === 'suspended') void c.resume();
    if (this.musicGain) this.musicGain.gain.value = Math.min(1, this.volume * 0.9);
  }

  setSound(value: boolean) {
    this.sound = value;
    localStorage.setItem('tic-sound', String(value));
  }

  setMusic(value: boolean) {
    this.music = value;
    localStorage.setItem('tic-music', String(value));
    if (value) this.startMusic();
    else this.stopMusic();
  }

  setVolume(value: number) {
    this.volume = Math.min(1, Math.max(0, Number(value) || 0));
    localStorage.setItem('tic-volume', String(this.volume));
    if (this.musicGain) this.musicGain.gain.value = this.volume * 0.9;
  }

  startMusic() {
    if (!this.music || this.timer) return;
    this.unlock();

    // Short upbeat arcade loop: pentatonic melody + bass, 150 BPM.
    const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 880, 783.99,
                    523.25, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33];
    const bass = [130.81, 130.81, 146.83, 146.83, 164.81, 164.81, 146.83, 130.81];
    const intervalMs = 200;

    this.timer = window.setInterval(() => {
      if (!this.music) return;
      const index = this.step++;
      this.tone(melody[index % melody.length], 0.14, 'square', 0.075, 0, this.musicGain);
      if (index % 2 === 0) {
        this.tone(bass[(index / 2) % bass.length], 0.20, 'triangle', 0.055, 0, this.musicGain);
      }
    }, intervalMs);
  }

  stopMusic() {
    if (this.timer) window.clearInterval(this.timer);
    this.timer = undefined;
    this.step = 0;
  }

  tap() {
    if (!this.sound) return;
    this.unlock();
    this.tone(660, 0.055, 'square', 0.16, 0, this.sfxGain);
  }

  win() {
    if (!this.sound) return;
    this.unlock();
    this.tone(523.25, 0.11, 'square', 0.20, 0, this.sfxGain);
    this.tone(659.25, 0.11, 'square', 0.20, 0.10, this.sfxGain);
    this.tone(783.99, 0.18, 'triangle', 0.24, 0.20, this.sfxGain);
    this.tone(1046.5, 0.26, 'triangle', 0.20, 0.31, this.sfxGain);
  }

  lose() {
    if (!this.sound) return;
    this.unlock();
    this.tone(330, 0.15, 'triangle', 0.16, 0, this.sfxGain);
    this.tone(246.94, 0.20, 'triangle', 0.15, 0.12, this.sfxGain);
    this.tone(196, 0.28, 'sine', 0.13, 0.25, this.sfxGain);
  }

  draw() {
    if (!this.sound) return;
    this.unlock();
    this.tone(440, 0.12, 'triangle', 0.14, 0, this.sfxGain);
    this.tone(523.25, 0.16, 'triangle', 0.14, 0.12, this.sfxGain);
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    level: number,
    delay: number,
    output?: GainNode
  ) {
    const c = this.audioContext();
    const target = output ?? this.sfxGain;
    if (!target) return;

    const now = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, level), now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(target);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }
}
