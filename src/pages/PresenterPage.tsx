import React, { useState } from 'react';
import {
  Maximize2,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { EventSchedule, PresenterTheme } from '../types';
import { TimerSnapshot, timerEngine } from '../services/timerEngine';
import { PresenterScreen } from '../components/presenter/PresenterScreen';
import { formatDuration } from '../utils/timeUtils';

interface PresenterPageProps {
  event: EventSchedule;
  timerSnapshot: TimerSnapshot;
  totalEventElapsedSeconds: number;
  totalEventPlannedSeconds: number;
  onOpenExternalWindow: () => void;
  onNavigateToLive?: () => void;
}

export const PresenterPage: React.FC<PresenterPageProps> = ({
  event,
  timerSnapshot,
  onNavigateToLive,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<PresenterTheme>('minimal-dark');
  const [isFullscreenPreview, setIsFullscreenPreview] = useState<boolean>(false);

  const currentSegment = event.segments[timerSnapshot.currentSegmentIndex] || null;
  const isTimeUp = timerSnapshot.overtimeSeconds > 0 || timerSnapshot.state === 'OVERTIME';
  const isRunning = timerSnapshot.state === 'RUNNING' || timerSnapshot.state === 'OVERTIME';

  const displayTime = formatDuration(timerSnapshot.remainingSeconds, 'MM:SS');
  const programName = currentSegment?.name || 'Event Standby';

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto max-h-[calc(100vh-3.5rem)]">
      {/* Top Header with Back to Live Control & Launch Presenter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/60 pb-4">
        <div className="flex items-center gap-3">
          {onNavigateToLive && (
            <button
              onClick={onNavigateToLive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium border border-neutral-800 transition-colors cursor-pointer"
              title="Exit Presenter and return to Live Control"
            >
              <ArrowLeft size={13} />
              <span>Live Control</span>
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Stage Presenter
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Audience and confidence monitor display.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsFullscreenPreview(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Maximize2 size={14} />
            <span>Launch Fullscreen (F)</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Live Stage Preview Box */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono uppercase tracking-wider">
            Audience / Confidence Monitor View
          </span>
          <span className="text-[11px] text-neutral-500">
            Click screen or launch button to view fullscreen (Press ESC to exit)
          </span>
        </div>

        {/* 16:9 Display Preview Card */}
        <div
          onClick={() => setIsFullscreenPreview(true)}
          className="relative aspect-video w-full rounded-2xl overflow-hidden border border-neutral-800 shadow-2xl bg-black cursor-pointer group flex flex-col items-center justify-center p-6 text-center select-none transition-transform hover:scale-[1.005]"
          title="Click to launch Fullscreen Presenter"
        >
          {/* Subtle hover overlay hint */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/90 text-white text-xs border border-neutral-700 font-medium">
            <Maximize2 size={13} className="text-emerald-400" />
            <span>Click for Fullscreen</span>
          </div>

          {/* Current Program */}
          <h2
            className={`text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight max-w-4xl mb-4 sm:mb-6 ${
              isTimeUp ? 'text-rose-300' : 'text-neutral-100'
            }`}
          >
            {programName}
          </h2>

          {/* Very Big Timer or Time Up!!! */}
          {isTimeUp ? (
            <span
              className="font-mono font-black tracking-tight select-none uppercase text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-none text-rose-500 animate-timeup-pop cursor-default"
              style={{
                textShadow: '0 0 30px rgba(244, 63, 94, 0.75), 0 0 60px rgba(225, 29, 72, 0.5)',
              }}
            >
              Time Up!!!
            </span>
          ) : (
            <span
              className={`font-mono font-black tracking-tighter tabular-nums text-6xl sm:text-8xl md:text-[10rem] lg:text-[12rem] leading-none ${
                timerSnapshot.remainingSeconds <= 60 && timerSnapshot.remainingSeconds > 0
                  ? 'text-amber-400 led-glow-amber'
                  : 'text-white'
              }`}
            >
              {displayTime}
            </span>
          )}
        </div>

        {/* Quick controls underneath preview for operator convenience */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => timerEngine.togglePlayPause()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition-colors ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isRunning ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
              <span>{isRunning ? 'Pause' : 'Start'}</span>
            </button>

            <button
              onClick={() => timerEngine.reset()}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 transition-colors"
              title="Reset Segment"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => timerEngine.adjustTime(-60)}
              className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60"
            >
              -1 MIN
            </button>
            <button
              onClick={() => timerEngine.adjustTime(60)}
              className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700/60 font-semibold"
            >
              +1 MIN
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Overlay Component */}
      {isFullscreenPreview && (
        <PresenterScreen
          segment={currentSegment}
          state={timerSnapshot.state}
          remainingSeconds={timerSnapshot.remainingSeconds}
          overtimeSeconds={timerSnapshot.overtimeSeconds}
          theme={selectedTheme}
          onClose={() => setIsFullscreenPreview(false)}
        />
      )}
    </div>
  );
};
