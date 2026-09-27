export type TimerState =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'OVERTIME'
  | 'COMPLETED';

export type ScheduleStatus =
  | 'ON_SCHEDULE'
  | 'AHEAD'
  | 'BEHIND'
  | 'OVERTIME'
  | 'PAUSED'
  | 'COMPLETED';

export type PresenterTheme =
  | 'minimal-dark'
  | 'professional'
  | 'led'
  | 'cinema'
  | 'corporate'
  | 'church'
  | 'elegant'
  | 'light';

export type PresenterMode =
  | 'minimal'
  | 'event'
  | 'timeline'
  | 'clock'
  | 'cinematic';

export interface AppSettings {
  general: {
    language: string;
    timeFormat: '12h' | '24h';
    dateFormat: string;
    autoRestoreLastSession: boolean;
  };
  timer: {
    displayFormat: 'MM:SS' | 'HH:MM:SS';
    countDownBehavior: 'standard' | 'aggressive';
    autoAdvanceOnZero: boolean;
    overtimeAlertThresholds: number[]; // e.g. [60, 180, 300]
    flashOnOvertime: boolean;
  };
  alerts: {
    soundEnabled: boolean;
    masterVolume: number; // 0.0 - 1.0
    selectedSound: 'soft-chime' | 'single-beep' | 'double-beep' | 'countdown-beep' | 'timeup-chime';
    visualFlash: boolean;
    defaultWarningTimes: number[]; // seconds: [600, 300, 60, 10]
  };
  presenter: {
    theme: PresenterTheme;
    mode: PresenterMode;
    showNextSegment: boolean;
    showEventName: boolean;
    showClock: boolean;
    showTimeline: boolean;
    fontSizeMultiplier: number;
    customMessage: string;
    showCustomMessage: boolean;
  };
  panicButton: {
    label: string;
    action: 'add_5m' | 'emergency_pause' | 'skip_segment' | 'add_1m';
    requireConfirmation: boolean;
  };
  keyboardShortcuts: {
    startPause: string;
    nextSegment: string;
    prevSegment: string;
    resetSegment: string;
    add1Min: string;
    sub1Min: string;
    add5Min: string;
    sub5Min: string;
    togglePresenter: string;
    muteAlerts: string;
    focusMode: string;
  };
}

export interface CompensationProposal {
  currentDelaySeconds: number; // e.g. 480 (+8m)
  proposedAdjustments: Array<{
    segmentId: string;
    segmentName: string;
    currentPlannedDuration: number;
    recommendedDuration: number;
    reductionSeconds: number;
  }>;
  totalCompensatedSeconds: number;
  newEstimatedFinish: string;
}
