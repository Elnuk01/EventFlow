import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
} from 'lucide-react';
import { TimerState } from '../../types';

interface TimerControlsProps {
  state: TimerState;
  onTogglePlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  onSkip?: () => void;
  onAdjustTime: (deltaSeconds: number) => void;
  hasNext: boolean;
  hasPrev: boolean;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  state,
  onTogglePlayPause,
  onNext,
  onPrev,
  onReset,
  onAdjustTime,
  hasNext,
  hasPrev,
}) => {
  const isRunning = state === 'RUNNING' || state === 'OVERTIME';

  // Custom minutes adjustment state
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('2');
  const [feedback, setFeedback] = useState<string | null>(null);

  const showFeedback = (text: string) => {
    setFeedback(text);
    setTimeout(() => setFeedback(null), 1500);
  };

  const handleCustomAdjust = (multiplier: 1 | -1) => {
    const val = parseFloat(customMinutesInput);
    if (isNaN(val) || val <= 0) return;
    const deltaSeconds = Math.round(val * 60) * multiplier;
    onAdjustTime(deltaSeconds);
    const sign = multiplier > 0 ? '+' : '-';
    showFeedback(`${sign}${val}m`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handleCustomAdjust(-1);
      } else {
        handleCustomAdjust(1);
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-4 select-none">
      {/* Primary Transport Controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Previous Segment */}
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-25 text-neutral-300 hover:text-white transition-all border border-neutral-700/40 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          title="Previous Segment (P)"
          aria-label="Previous Segment"
        >
          <SkipBack size={18} />
        </button>

        {/* Reset Segment */}
        <button
          onClick={onReset}
          className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all border border-neutral-700/40 active:scale-95 cursor-pointer"
          title="Reset Segment (R)"
          aria-label="Reset Segment"
        >
          <RotateCcw size={18} />
        </button>

        {/* Main Start / Pause Button */}
        <button
          onClick={onTogglePlayPause}
          className={`flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-medium text-sm transition-all active:scale-95 shadow-sm cursor-pointer ${
            isRunning
              ? 'bg-neutral-100 hover:bg-white text-neutral-900'
              : 'bg-emerald-500 hover:bg-emerald-400 text-white'
          }`}
          title="Start / Pause Timer (Space)"
        >
          {isRunning ? (
            <>
              <Pause size={18} className="fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={18} className="fill-current" />
              <span>Start</span>
            </>
          )}
        </button>

        {/* Next Segment */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 disabled:opacity-25 text-neutral-300 hover:text-white transition-all border border-neutral-700/40 text-xs font-medium active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          title="Next Segment (N)"
        >
          <span>Next</span>
          <SkipForward size={16} />
        </button>
      </div>

      {/* Flexible Time Adjustment Row */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
        {/* Retained Suggested Quick Presets */}
        <div className="flex items-center gap-1 text-neutral-400">
          <button
            onClick={() => {
              onAdjustTime(-300);
              showFeedback('-5m');
            }}
            className="px-2.5 py-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors cursor-pointer"
            title="Subtract 5 Minutes"
          >
            -5m
          </button>
          <button
            onClick={() => {
              onAdjustTime(-60);
              showFeedback('-1m');
            }}
            className="px-2.5 py-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors cursor-pointer"
            title="Subtract 1 Minute (-)"
          >
            -1m
          </button>
          <button
            onClick={() => {
              onAdjustTime(60);
              showFeedback('+1m');
            }}
            className="px-2.5 py-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title="Add 1 Minute (+)"
          >
            +1m
          </button>
          <button
            onClick={() => {
              onAdjustTime(300);
              showFeedback('+5m');
            }}
            className="px-2.5 py-1 rounded-lg bg-neutral-800/60 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title="Add 5 Minutes"
          >
            +5m
          </button>
        </div>

        {/* Separator */}
        <span className="text-neutral-700 hidden sm:inline">|</span>

        {/* Custom Minutes Input & Action Buttons */}
        <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => handleCustomAdjust(-1)}
            disabled={!customMinutesInput || parseFloat(customMinutesInput) <= 0 || isNaN(parseFloat(customMinutesInput))}
            className="px-2 py-0.5 rounded text-neutral-400 hover:text-rose-300 hover:bg-neutral-800 disabled:opacity-30 transition-colors cursor-pointer"
            title={`Subtract ${customMinutesInput || ''} minute(s) [Shift+Enter]`}
          >
            -{customMinutesInput ? `${customMinutesInput}m` : 'm'}
          </button>

          <div className="flex items-center">
            <input
              type="number"
              min="0.5"
              max="180"
              step="any"
              value={customMinutesInput}
              onChange={(e) => setCustomMinutesInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="min"
              className="w-12 bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5 text-center text-xs font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              title="Enter custom minutes and click + or - (or press Enter)"
            />
          </div>

          <button
            onClick={() => handleCustomAdjust(1)}
            disabled={!customMinutesInput || parseFloat(customMinutesInput) <= 0 || isNaN(parseFloat(customMinutesInput))}
            className="px-2 py-0.5 rounded text-neutral-300 hover:text-emerald-300 hover:bg-neutral-800 disabled:opacity-30 transition-colors cursor-pointer"
            title={`Add ${customMinutesInput || ''} minute(s) [Enter]`}
          >
            +{customMinutesInput ? `${customMinutesInput}m` : 'm'}
          </button>
        </div>

        {/* Instant Feedback Badge */}
        {feedback && (
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded animate-in fade-in duration-100">
            {feedback}
          </span>
        )}
      </div>
    </div>
  );
};
