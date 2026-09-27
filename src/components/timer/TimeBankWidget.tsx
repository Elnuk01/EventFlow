import React from 'react';
import { formatDuration } from '../../utils/timeUtils';

interface TimeBankWidgetProps {
  totalPlannedSeconds: number;
  totalElapsedSeconds: number;
  remainingSeconds: number;
}

export const TimeBankWidget: React.FC<TimeBankWidgetProps> = ({
  totalPlannedSeconds,
  totalElapsedSeconds,
  remainingSeconds,
}) => {
  const percentUsed =
    totalPlannedSeconds > 0
      ? Math.min(100, Math.round((totalElapsedSeconds / totalPlannedSeconds) * 100))
      : 0;

  const isExceeded = totalElapsedSeconds > totalPlannedSeconds;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Time Bank Budget
        </span>
        <span className="text-xs font-mono font-medium text-neutral-300">
          {percentUsed}% Consumed
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all duration-300 ${
            isExceeded
              ? 'bg-rose-500'
              : percentUsed > 85
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>

      {/* Figures Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800/60">
          <span className="text-[10px] text-neutral-400 block uppercase">Total Planned</span>
          <span className="text-xs font-mono font-semibold text-neutral-200">
            {formatDuration(totalPlannedSeconds, 'HH:MM:SS')}
          </span>
        </div>
        <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800/60">
          <span className="text-[10px] text-neutral-400 block uppercase">Used Time</span>
          <span className="text-xs font-mono font-semibold text-neutral-200">
            {formatDuration(totalElapsedSeconds, 'HH:MM:SS')}
          </span>
        </div>
        <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800/60">
          <span className="text-[10px] text-neutral-400 block uppercase">
            {isExceeded ? 'Deficit' : 'Remaining'}
          </span>
          <span
            className={`text-xs font-mono font-semibold ${
              isExceeded ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {isExceeded ? '+' : ''}
            {formatDuration(
              isExceeded ? totalElapsedSeconds - totalPlannedSeconds : remainingSeconds,
              'HH:MM:SS'
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
