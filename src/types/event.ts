export type SegmentType =
  | 'TIMER'
  | 'CLOCK'
  | 'BREAK'
  | 'SPEAKER'
  | 'MEDIA'
  | 'FREE_TIME'
  | 'OVERTIME';

export type EventStatus =
  | 'DRAFT'
  | 'READY'
  | 'LIVE'
  | 'PAUSED'
  | 'COMPLETED';

export type EventScenario = 'NORMAL' | 'SHORT' | 'EMERGENCY';

export interface EventSegment {
  id: string;
  eventId: string;
  order: number;
  name: string;
  description?: string;
  plannedDurationSeconds: number;
  speaker?: string;
  category: string;
  colorTag: string;
  notes?: string;
  warningTimesSeconds: number[]; // e.g. [300, 60, 10]
  soundEnabled: boolean;
  autoAdvance: boolean;
  isOptional: boolean;
  isSkipped: boolean;
  segmentType: SegmentType;
}

export interface EventSchedule {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  location: string;
  organizer: string;
  description: string;
  currentSegmentIndex: number;
  status: EventStatus;
  activeScenario: EventScenario;
  scenarioAdjustments: {
    shortReductionPercent: number; // e.g. 20%
    emergencyReductionPercent: number; // e.g. 40%
  };
  segments: EventSegment[];
  totalPlannedDurationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventNote {
  id: string;
  eventId: string;
  timestamp: string; // e.g. "10:32 AM"
  segmentIndex: number;
  segmentName: string;
  text: string;
  createdAt: number;
}

export interface SegmentHistoryRecord {
  segmentId: string;
  segmentName: string;
  speaker?: string;
  category: string;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  overtimeSeconds: number;
  isSkipped: boolean;
  varianceSeconds: number; // positive: took longer (behind), negative: took less (ahead)
}

export interface EventHistoryRecord {
  id: string;
  eventId: string;
  eventName: string;
  date: string;
  startedAt: number;
  endedAt: number;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  scheduleVarianceSeconds: number; // positive = behind, negative = ahead
  segmentRecords: SegmentHistoryRecord[];
  notes: EventNote[];
}

export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedTotalDurationSeconds: number;
  defaultTheme: string;
  segments: Array<Omit<EventSegment, 'id' | 'eventId'>>;
}
