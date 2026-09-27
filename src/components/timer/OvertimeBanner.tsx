import React, { useState } from 'react';
import { AlertCircle, Plus, SkipForward } from 'lucide-react';
import { formatDuration } from '../../utils/timeUtils';

interface OvertimeBannerProps {
  overtimeSeconds: number;
  onEndSegment: () => void;
  onAddTime: (seconds: number) => void;
  onNextSegment: () => void;
}

export const OvertimeBanner: React.FC<OvertimeBannerProps> = ({
  overtimeSeconds,
  onAddTime,
  onNextSegment,
}) => {
  const [customMin, setCustomMin] = useState<string>('2');

  if (overtimeSeconds <= 0) return null;

  const handleCustomAdd = () => {
    const val = parseFloat(customMin);
    if (!isNaN(val) && val > 0) {
      onAddTime(Math.round(val * 60));
    }
  };

  return (
    <div className="w-full bg-rose-950/40 border border-rose-800/50 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5 text-rose-300">
        <AlertCircle size={16} className="text-rose-400 shrink-0" />
        <span className="font-medium">
          Segment in Overtime: <strong className="font-mono text-rose-200">+{formatDuration(overtimeSeconds, 'MM:SS')}</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Suggested Quick Add Buttons (Retained) */}
        <button
          onClick={() => onAddTime(60)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition-colors cursor-pointer border border-neutral-700/60"
          title="Add 1 Minute"
        >
          <Plus size={12} />
          <span>1m</span>
        </button>
        <button
          onClick={() => onAddTime(300)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono transition-colors cursor-pointer border border-neutral-700/60"
          title="Add 5 Minutes"
        >
          <Plus size={12} />
          <span>5m</span>
        </button>

        {/* Custom Minutes Input & Add Button */}
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700/60 rounded-lg p-0.5">
          <input
            type="number"
            min="0.5"
            max="120"
            step="any"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomAdd();
            }}
            placeholder="min"
            className="w-10 bg-neutral-950 border border-neutral-800 rounded px-1 py-0.5 text-center text-xs font-mono text-white placeholder-neutral-600 focus:outline-none"
            title="Custom minutes to add"
          />
          <button
            onClick={handleCustomAdd}
            disabled={!customMin || parseFloat(customMin) <= 0 || isNaN(parseFloat(customMin))}
            className="px-2 py-0.5 rounded text-neutral-200 hover:text-white hover:bg-neutral-800 disabled:opacity-30 text-xs font-mono cursor-pointer transition-colors"
            title={`Add +${customMin || ''} minutes`}
          >
            +{customMin ? `${customMin}m` : 'm'}
          </button>
        </div>

        <button
          onClick={onNextSegment}
          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer ml-1"
        >
          <span>Next Segment</span>
          <SkipForward size={12} />
        </button>
      </div>
    </div>
  );
};
