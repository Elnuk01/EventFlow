import { EventHistoryRecord, EventSchedule, EventSegment } from '../types';
import { formatDuration } from './timeUtils';

export function exportHistoryToCSV(record: EventHistoryRecord) {
  const headers = [
    'Segment #',
    'Segment Name',
    'Category',
    'Speaker',
    'Planned Time',
    'Actual Time',
    'Variance',
    'Overtime',
    'Status',
  ];

  const rows = record.segmentRecords.map((seg, idx) => {
    const plannedStr = formatDuration(seg.plannedDurationSeconds, 'MM:SS');
    const actualStr = formatDuration(seg.actualDurationSeconds, 'MM:SS');
    const varianceStr = formatDuration(seg.varianceSeconds, 'MM:SS', true);
    const overtimeStr = formatDuration(seg.overtimeSeconds, 'MM:SS');
    const status = seg.isSkipped
      ? 'SKIPPED'
      : seg.overtimeSeconds > 0
      ? 'OVERTIME'
      : seg.varianceSeconds <= 0
      ? 'ON_SCHEDULE'
      : 'BEHIND';

    return [
      idx + 1,
      `"${seg.segmentName.replace(/"/g, '""')}"`,
      `"${seg.category}"`,
      `"${(seg.speaker || '').replace(/"/g, '""')}"`,
      plannedStr,
      actualStr,
      varianceStr,
      overtimeStr,
      status,
    ].join(',');
  });

  // Summary lines
  const summary = [
    '',
    `"Event Name","${record.eventName}"`,
    `"Date","${record.date}"`,
    `"Total Planned","${formatDuration(record.plannedDurationSeconds, 'HH:MM:SS')}"`,
    `"Total Actual","${formatDuration(record.actualDurationSeconds, 'HH:MM:SS')}"`,
    `"Schedule Variance","${formatDuration(record.scheduleVarianceSeconds, 'MM:SS', true)}"`,
  ];

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows, ...summary].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `EventFlow_${record.eventName.replace(/\s+/g, '_')}_${record.date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportEventToJSON(event: EventSchedule) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(event, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `EventFlow_Event_${event.name.replace(/\s+/g, '_')}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Validates and parses an imported JSON file string into an EventSchedule.
 * Supports both standalone EventFlow Event JSON exports and template formats.
 */
export function parseEventFromJSON(jsonString: string): {
  success: boolean;
  event?: EventSchedule;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);

    // If it's a full database backup with events array, take first or error
    if (data.events && Array.isArray(data.events) && data.events.length > 0) {
      const candidate = data.events[0];
      return parseEventObject(candidate);
    }

    return parseEventObject(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid JSON file';
    return {
      success: false,
      error: `Failed to read JSON: ${errorMsg}`,
    };
  }
}

function parseEventObject(obj: Record<string, unknown>): {
  success: boolean;
  event?: EventSchedule;
  error?: string;
} {
  if (!obj || typeof obj !== 'object') {
    return { success: false, error: 'File does not contain a valid JSON object.' };
  }

  const name = typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : 'Imported Event';
  const newEventId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  let rawSegments: Array<Record<string, unknown>> = [];
  if (Array.isArray(obj.segments)) {
    rawSegments = obj.segments as Array<Record<string, unknown>>;
  }

  const segments: EventSegment[] = rawSegments.map((s, idx) => {
    const plannedDurationSeconds =
      typeof s.plannedDurationSeconds === 'number' && s.plannedDurationSeconds > 0
        ? s.plannedDurationSeconds
        : 300; // default 5 mins

    return {
      id: `seg-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      eventId: newEventId,
      order: typeof s.order === 'number' ? s.order : idx + 1,
      name: typeof s.name === 'string' && s.name.trim() ? s.name.trim() : `Segment ${idx + 1}`,
      description: typeof s.description === 'string' ? s.description : '',
      plannedDurationSeconds,
      speaker: typeof s.speaker === 'string' ? s.speaker : '',
      category: typeof s.category === 'string' ? s.category : 'General',
      colorTag: typeof s.colorTag === 'string' ? s.colorTag : 'emerald',
      notes: typeof s.notes === 'string' ? s.notes : '',
      warningTimesSeconds: Array.isArray(s.warningTimesSeconds)
        ? (s.warningTimesSeconds as number[])
        : [300, 60, 10],
      soundEnabled: typeof s.soundEnabled === 'boolean' ? s.soundEnabled : true,
      autoAdvance: typeof s.autoAdvance === 'boolean' ? s.autoAdvance : false,
      isOptional: typeof s.isOptional === 'boolean' ? s.isOptional : false,
      isSkipped: typeof s.isSkipped === 'boolean' ? s.isSkipped : false,
      segmentType:
        typeof s.segmentType === 'string' &&
        ['TIMER', 'CLOCK', 'BREAK', 'SPEAKER', 'MEDIA', 'FREE_TIME', 'OVERTIME'].includes(
          s.segmentType
        )
          ? (s.segmentType as EventSegment['segmentType'])
          : 'TIMER',
    };
  });

  const totalPlannedDurationSeconds = segments.reduce(
    (acc, s) => acc + (s.isSkipped ? 0 : s.plannedDurationSeconds),
    0
  );

  const event: EventSchedule = {
    id: newEventId,
    name,
    date:
      typeof obj.date === 'string' && obj.date.trim()
        ? obj.date.trim()
        : new Date().toISOString().split('T')[0],
    startTime:
      typeof obj.startTime === 'string' && obj.startTime.trim() ? obj.startTime.trim() : '09:00',
    location: typeof obj.location === 'string' ? obj.location : 'Main Auditorium',
    organizer: typeof obj.organizer === 'string' ? obj.organizer : 'Production Team',
    description: typeof obj.description === 'string' ? obj.description : '',
    currentSegmentIndex: 0,
    status: 'READY',
    activeScenario: 'NORMAL',
    scenarioAdjustments: {
      shortReductionPercent: 15,
      emergencyReductionPercent: 35,
    },
    segments,
    totalPlannedDurationSeconds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { success: true, event };
}
