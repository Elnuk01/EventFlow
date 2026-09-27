import React from 'react';
import { ScheduleStatus } from '../../types';

interface EventPulseBadgeProps {
  status: ScheduleStatus;
  varianceText?: string;
  isOvertime?: boolean;
}

export const EventPulseBadge: React.FC<EventPulseBadgeProps> = ({
  status,
  varianceText,
  isOvertime,
}) => {
  let colorStyle = 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
  let dotColor = 'bg-emerald-500';
  let displayText = varianceText || 'ON SCHEDULE';

  if (isOvertime || status === 'OVERTIME') {
    colorStyle = 'text-rose-400 bg-rose-950/40 border-rose-800/50 animate-pulse';
    dotColor = 'bg-rose-500';
    displayText = 'OVERTIME';
  } else if (status === 'BEHIND') {
    colorStyle = 'text-amber-400 bg-amber-950/40 border-amber-800/50';
    dotColor = 'bg-amber-500';
  } else if (status === 'AHEAD') {
    colorStyle = 'text-blue-400 bg-blue-950/40 border-blue-800/50';
    dotColor = 'bg-blue-500';
  } else if (status === 'PAUSED') {
    colorStyle = 'text-neutral-400 bg-neutral-900 border-neutral-700/60';
    dotColor = 'bg-neutral-500';
    displayText = 'PAUSED';
  } else if (status === 'COMPLETED') {
    colorStyle = 'text-purple-400 bg-purple-950/40 border-purple-800/50';
    dotColor = 'bg-purple-500';
    displayText = 'COMPLETED';
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-mono font-medium tracking-wide ${colorStyle}`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span className="uppercase">{displayText}</span>
    </div>
  );
};
