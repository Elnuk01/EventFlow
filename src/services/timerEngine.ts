import { TimerState, EventSegment } from '../types';
import { audioService } from './audioService';

export interface TimerSnapshot {
  state: TimerState;
  elapsedSeconds: number;
  remainingSeconds: number;
  overtimeSeconds: number;
  plannedDurationSeconds: number;
  progressPercent: number; // 0 to 100
  currentSegment: EventSegment | null;
  currentSegmentIndex: number;
  isWarning: boolean;
  warningMessage: string | null;
}

type TimerListener = (snapshot: TimerSnapshot) => void;

class TimerEngine {
  private state: TimerState = 'IDLE';
  private plannedDurationSeconds: number = 0;
  private accumulatedElapsedMs: number = 0;
  private lastResumeTimestamp: number | null = null;
  private currentSegment: EventSegment | null = null;
  private currentSegmentIndex: number = 0;
  private listeners: Set<TimerListener> = new Set();
  private intervalId: number | null = null;
  private soundEnabled: boolean = true;
  private warningThresholdsPassed: Set<number> = new Set();
  private hasTriggeredTimeUp: boolean = false;

  constructor() {
    this.startTicker();
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public loadSegment(segment: EventSegment, index: number, autoStart: boolean = false) {
    this.stopTicker();
    this.state = 'IDLE';
    this.currentSegment = segment;
    this.currentSegmentIndex = index;
    this.plannedDurationSeconds = segment.plannedDurationSeconds;
    this.accumulatedElapsedMs = 0;
    this.lastResumeTimestamp = null;
    this.warningThresholdsPassed.clear();
    this.hasTriggeredTimeUp = false;

    if (autoStart) {
      this.start();
    } else {
      this.notifyListeners();
    }
  }

  public start() {
    if (this.state === 'RUNNING') return;

    this.lastResumeTimestamp = performance.now();
    this.state = this.getOvertimeSeconds() > 0 ? 'OVERTIME' : 'RUNNING';
    this.startTicker();
    this.notifyListeners();
  }

  public pause() {
    if (this.state !== 'RUNNING' && this.state !== 'OVERTIME') return;

    if (this.lastResumeTimestamp !== null) {
      this.accumulatedElapsedMs += performance.now() - this.lastResumeTimestamp;
      this.lastResumeTimestamp = null;
    }
    this.state = 'PAUSED';
    this.notifyListeners();
  }

  public togglePlayPause() {
    if (this.state === 'RUNNING' || this.state === 'OVERTIME') {
      this.pause();
    } else {
      this.start();
    }
  }

  public reset() {
    const wasRunning = this.state === 'RUNNING' || this.state === 'OVERTIME';
    this.accumulatedElapsedMs = 0;
    this.lastResumeTimestamp = wasRunning ? performance.now() : null;
    this.state = wasRunning ? 'RUNNING' : 'IDLE';
    this.warningThresholdsPassed.clear();
    this.hasTriggeredTimeUp = false;
    this.notifyListeners();
  }

  /**
   * Adjusts current planned or remaining time by delta seconds (+60, -60, etc.)
   */
  public adjustTime(deltaSeconds: number) {
    const deltaMs = deltaSeconds * 1000;
    // We adjust plannedDuration so remaining time extends or contracts cleanly
    this.plannedDurationSeconds = Math.max(0, this.plannedDurationSeconds + deltaSeconds);

    // If we're in overtime and operator adds time, check if we exit overtime
    const currentElapsed = this.getElapsedSeconds();
    if (this.state === 'OVERTIME' && currentElapsed < this.plannedDurationSeconds) {
      this.state = this.lastResumeTimestamp !== null ? 'RUNNING' : 'PAUSED';
      this.hasTriggeredTimeUp = false;
    }

    this.notifyListeners();
  }

  public setElapsed(elapsedSeconds: number) {
    this.accumulatedElapsedMs = elapsedSeconds * 1000;
    if (this.lastResumeTimestamp !== null) {
      this.lastResumeTimestamp = performance.now();
    }
    this.notifyListeners();
  }

  public getElapsedSeconds(): number {
    let totalMs = this.accumulatedElapsedMs;
    if (this.lastResumeTimestamp !== null) {
      totalMs += performance.now() - this.lastResumeTimestamp;
    }
    return Math.floor(totalMs / 1000);
  }

  public getRemainingSeconds(): number {
    const elapsed = this.getElapsedSeconds();
    const remaining = this.plannedDurationSeconds - elapsed;
    return Math.max(0, remaining);
  }

  public getOvertimeSeconds(): number {
    const elapsed = this.getElapsedSeconds();
    const overtime = elapsed - this.plannedDurationSeconds;
    return Math.max(0, overtime);
  }

  public getState(): TimerState {
    return this.state;
  }

  public getPlannedDurationSeconds(): number {
    return this.plannedDurationSeconds;
  }

  public getCurrentSegmentIndex(): number {
    return this.currentSegmentIndex;
  }

  public getCurrentSegment(): EventSegment | null {
    return this.currentSegment;
  }

  public subscribe(listener: TimerListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSnapshot(): TimerSnapshot {
    const elapsed = this.getElapsedSeconds();
    const remaining = this.getRemainingSeconds();
    const overtime = this.getOvertimeSeconds();
    const planned = this.plannedDurationSeconds;

    const progress = planned > 0 ? Math.min(100, Math.round((elapsed / planned) * 100)) : 0;

    let isWarning = false;
    let warningMessage: string | null = null;

    if (overtime > 0) {
      isWarning = true;
      warningMessage = `OVERTIME +${overtime}s`;
    } else if (remaining <= 60 && remaining > 0) {
      isWarning = true;
      warningMessage = `${remaining}s REMAINING`;
    }

    return {
      state: this.state,
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      overtimeSeconds: overtime,
      plannedDurationSeconds: planned,
      progressPercent: progress,
      currentSegment: this.currentSegment,
      currentSegmentIndex: this.currentSegmentIndex,
      isWarning,
      warningMessage,
    };
  }

  private startTicker() {
    if (this.intervalId !== null) return;
    this.intervalId = window.setInterval(() => {
      this.tick();
    }, 200); // 5Hz accurate tick for display & alert checking
  }

  private stopTicker() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick() {
    if (this.state !== 'RUNNING' && this.state !== 'OVERTIME') {
      return;
    }

    const elapsed = this.getElapsedSeconds();
    const remaining = this.plannedDurationSeconds - elapsed;

    // Check transition to OVERTIME
    if (remaining <= 0 && this.state === 'RUNNING') {
      this.state = 'OVERTIME';
      if (!this.hasTriggeredTimeUp) {
        this.hasTriggeredTimeUp = true;
        if (this.soundEnabled && this.currentSegment?.soundEnabled !== false) {
          audioService.playAlert('timeup-chime');
        }
      }
    }

    // Check Warning Thresholds (e.g. 600, 300, 60, 10 seconds)
    if (remaining > 0 && this.soundEnabled && this.currentSegment) {
      const warningPoints = this.currentSegment.warningTimesSeconds || [300, 60, 10];
      for (const threshold of warningPoints) {
        // Trigger alert within 1 second of threshold window and only once
        if (remaining <= threshold && remaining > threshold - 1 && !this.warningThresholdsPassed.has(threshold)) {
          this.warningThresholdsPassed.add(threshold);
          if (threshold <= 10) {
            audioService.playAlert('countdown-beep');
          } else if (threshold <= 60) {
            audioService.playAlert('double-beep');
          } else {
            audioService.playAlert('soft-chime');
          }
        }
      }
    }

    this.notifyListeners();
  }

  private notifyListeners() {
    const snap = this.getSnapshot();
    this.listeners.forEach((listener) => {
      try {
        listener(snap);
      } catch (err) {
        console.error('Timer listener error', err);
      }
    });
  }
}

export const timerEngine = new TimerEngine();
