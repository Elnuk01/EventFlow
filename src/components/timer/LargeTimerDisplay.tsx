import React from 'react';
import { formatDuration } from '../../utils/timeUtils';
import { EventSegment, TimerState } from '../../types';

interface LargeTimerDisplayProps {
  segment: EventSegment | null;
  state: TimerState;
  remainingSeconds: number;
  elapsedSeconds: number;
  overtimeSeconds: number;
  plannedDurationSeconds: number;
  progressPercent: number;
  displayFormat?: 'MM:SS' | 'HH:MM:SS';
}

export const LargeTimerDisplay: React.FC<LargeTimerDisplayProps> = ({
  segment,
  state,
  remainingSeconds,
  elapsedSeconds,
  overtimeSeconds,
  plannedDurationSeconds,
  progressPercent,
  displayFormat = 'MM:SS',
}) => {
  const isOvertime = overtimeSeconds > 0 || state === 'OVERTIME';
  const isWarning = !isOvertime && remainingSeconds <= 60 && remainingSeconds > 0;

  // Primary digital string
  const mainTimeStr = isOvertime
    ? `+${formatDuration(overtimeSeconds, displayFormat)}`
    : formatDuration(remainingSeconds, displayFormat);

  // Dynamic styling - clean, minimal typography colors without garish glowing text
  let timerColor = 'text-white';
  if (isOvertime) {
    timerColor = 'text-rose-400';
  } else if (isWarning) {
    timerColor = 'text-amber-300';
  } else if (state === 'PAUSED') {
    timerColor = 'text-neutral-400';
  }

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 px-4 select-none">
      {/* Segment Title & Speaker */}
      <div className="text-center mb-2 sm:mb-3 px-2">
        <h2 className="text-xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-neutral-100">
          {segment ? segment.name : 'No Active Segment'}
        </h2>
        {segment?.speaker && (
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {segment.speaker} {segment.category ? `· ${segment.category}` : ''}
          </p>
        )}
      </div>

      {/* Main Massive Time Readout */}
      <div className="my-1 sm:my-2 py-1 flex items-center justify-center">
        <span
          className={`font-mono font-bold tracking-tight tabular-nums text-5xl sm:text-7xl md:text-8xl lg:text-9xl transition-colors duration-150 ${timerColor}`}
        >
          {mainTimeStr}
        </span>
      </div>

      {/* Clean Hairline Progress Bar */}
      <div className="w-full max-w-lg h-1.5 bg-neutral-800/80 rounded-full overflow-hidden my-3 sm:my-4">
        <div
          className={`h-full transition-all duration-300 ${
            isOvertime
              ? 'bg-rose-500'
              : isWarning
              ? 'bg-amber-400'
              : state === 'RUNNING'
              ? 'bg-emerald-400'
              : 'bg-neutral-500'
          }`}
          style={{ width: `${isOvertime ? 100 : Math.min(100, Math.max(0, progressPercent))}%` }}
        />
      </div>

      {/* Subtle Metrics Row */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-6 gap-y-1 text-xs text-neutral-400 font-mono text-center">
        <span>Planned: <strong className="text-neutral-200 font-normal">{formatDuration(plannedDurationSeconds, displayFormat)}</strong></span>
        <span>·</span>
        <span>Elapsed: <strong className="text-neutral-200 font-normal">{formatDuration(elapsedSeconds, displayFormat)}</strong></span>
        {isOvertime && (
          <>
            <span>·</span>
            <span className="text-rose-400 font-medium">Overtime: +{formatDuration(overtimeSeconds, displayFormat)}</span>
          </>
        )}
      </div>
    </div>
  );
};
