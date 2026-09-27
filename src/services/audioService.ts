/**
 * EventFlow Offline Broadcast Audio Engine
 * Uses Web Audio API oscillator synthesis for 100% offline, zero-asset audio alerts.
 */

class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.7;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a synthesized alert tone based on sound type
   */
  public playAlert(soundType: 'soft-chime' | 'single-beep' | 'double-beep' | 'countdown-beep' | 'timeup-chime') {
    if (this.isMuted || this.volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    switch (soundType) {
      case 'soft-chime':
        this.playSoftChime(ctx);
        break;
      case 'single-beep':
        this.playSingleBeep(ctx);
        break;
      case 'double-beep':
        this.playDoubleBeep(ctx);
        break;
      case 'countdown-beep':
        this.playCountdownBeep(ctx);
        break;
      case 'timeup-chime':
        this.playTimeUpChime(ctx);
        break;
      default:
        this.playSingleBeep(ctx);
    }
  }

  private playSingleBeep(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5

    gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  private playDoubleBeep(ctx: AudioContext) {
    this.playTone(ctx, 880, 0.08, 0);
    this.playTone(ctx, 880, 0.08, 0.12);
  }

  private playCountdownBeep(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6

    gain.gain.setValueAtTime(this.volume * 0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  private playSoftChime(ctx: AudioContext) {
    // Beautiful two-note chord (C5 -> G5)
    this.playHarmonicTone(ctx, 523.25, 0.5, 0);
    this.playHarmonicTone(ctx, 659.25, 0.65, 0.08);
  }

  private playTimeUpChime(ctx: AudioContext) {
    // Stage warning sound: 3 descending tones
    this.playTone(ctx, 880, 0.15, 0);
    this.playTone(ctx, 698.46, 0.18, 0.16);
    this.playTone(ctx, 523.25, 0.35, 0.35);
  }

  private playTone(ctx: AudioContext, freq: number, duration: number, delay: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  }

  private playHarmonicTone(ctx: AudioContext, freq: number, duration: number, delay: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle'; // warmer tone
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

    gain.gain.setValueAtTime(this.volume * 0.45, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  }
}

export const audioService = new AudioService();
