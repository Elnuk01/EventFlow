/**
 * Accurate time utilities for EventFlow
 */

export function formatDuration(
  totalSeconds: number,
  format: 'MM:SS' | 'HH:MM:SS' = 'MM:SS',
  showSign: boolean = false
): string {
  const isNegative = totalSeconds < 0;
  const absSec = Math.abs(Math.round(totalSeconds));

  const hours = Math.floor(absSec / 3600);
  const minutes = Math.floor((absSec % 3600) / 60);
  const seconds = absSec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  let formatted = '';
  if (format === 'HH:MM:SS' || hours > 0) {
    formatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    formatted = `${pad(minutes)}:${pad(seconds)}`;
  }

  if (showSign) {
    return isNegative ? `-${formatted}` : `+${formatted}`;
  }
  return isNegative ? `-${formatted}` : formatted;
}

export function formatTimeOfDay(date: Date = new Date(), format24h: boolean = false): string {
  if (format24h) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

export function formatShortTimeOfDay(date: Date = new Date(), format24h: boolean = false): string {
  if (format24h) {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  // expects "HH:MM" in 24h
  const [h, m] = timeStr.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function calculatePlannedFinishTime(startTimeStr: string, totalPlannedSeconds: number): string {
  const startMins = parseTimeToMinutes(startTimeStr);
  const durationMins = Math.round(totalPlannedSeconds / 60);
  const totalMins = (startMins + durationMins) % (24 * 60);

  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;

  const d = new Date();
  d.setHours(h, m, 0, 0);
  return formatShortTimeOfDay(d);
}

export function calculateEstimatedFinishTime(
  basePlannedFinishTimeStr: string,
  scheduleVarianceSeconds: number
): string {
  const [hStr, mRest] = basePlannedFinishTimeStr.split(':');
  let h = parseInt(hStr, 10);
  const isPM = basePlannedFinishTimeStr.toLowerCase().includes('pm');
  const isAM = basePlannedFinishTimeStr.toLowerCase().includes('am');

  const m = parseInt(mRest || '0', 10);
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  const d = new Date();
  d.setHours(h, m, 0, 0);
  d.setSeconds(d.getSeconds() + Math.round(scheduleVarianceSeconds));

  return formatShortTimeOfDay(d);
}

export function formatVarianceText(varianceSeconds: number): {
  text: string;
  status: 'ON_SCHEDULE' | 'AHEAD' | 'BEHIND';
  formattedTime: string;
} {
  const rounded = Math.round(varianceSeconds);
  if (Math.abs(rounded) < 15) {
    return {
      text: 'ON SCHEDULE',
      status: 'ON_SCHEDULE',
      formattedTime: '00:00'
    };
  }

  const durationStr = formatDuration(Math.abs(rounded), 'MM:SS');
  if (rounded > 0) {
    return {
      text: `${durationStr} BEHIND`,
      status: 'BEHIND',
      formattedTime: `+${durationStr}`
    };
  } else {
    return {
      text: `${durationStr} AHEAD`,
      status: 'AHEAD',
      formattedTime: `-${durationStr}`
    };
  }
}
