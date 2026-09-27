import React, { useEffect } from 'react';
import { X, Maximize } from 'lucide-react';
import { EventSegment, PresenterTheme, TimerState } from '../../types';
import { formatDuration } from '../../utils/timeUtils';

interface PresenterScreenProps {
  segment: EventSegment | null;
  nextSegment?: EventSegment | null;
  eventName?: string;
  state: TimerState;
  remainingSeconds: number;
  elapsedSeconds?: number;
  overtimeSeconds: number;
  plannedDurationSeconds?: number;
  totalEventElapsedSeconds?: number;
  totalEventPlannedSeconds?: number;
  theme?: PresenterTheme;
  mode?: string;
  onClose?: () => void;
  isStandalone?: boolean;
}

export const PresenterScreen: React.FC<PresenterScreenProps> = ({
  segment,
  state,
  remainingSeconds,
  overtimeSeconds,
  theme = 'minimal-dark',
  onClose,
  isStandalone = false,
}) => {
  // Listen for Escape key and F key to exit presenter screen reliably
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape' || e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        if (onClose) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const isTimeUp = overtimeSeconds > 0 || state === 'OVERTIME';
  const isWarning = !isTimeUp && remainingSeconds <= 60 && remainingSeconds > 0;

  // Format main massive timer countdown readout (when not time up)
  const displayTime = formatDuration(remainingSeconds, 'MM:SS');

  // Clean, high-contrast theme styling
  let bgClass = 'bg-black text-white';
  let timerColor = 'text-white';
  let programColor = 'text-neutral-100';

  if (theme === 'light') {
    bgClass = 'bg-neutral-100 text-neutral-900';
    programColor = 'text-neutral-900';
    if (isWarning) timerColor = 'text-amber-600 font-bold';
    else timerColor = 'text-neutral-950 font-bold';
  } else {
    // Dark themes
    if (isWarning) {
      timerColor = 'text-amber-400 led-glow-amber';
      programColor = 'text-amber-200';
    } else if (state === 'PAUSED') {
      timerColor = 'text-neutral-400';
      programColor = 'text-neutral-300';
    } else {
      timerColor = 'text-white';
      programColor = 'text-neutral-100';
    }
  }

  const programName = segment?.name || 'Event Standby';

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden transition-colors duration-300 ${
        isTimeUp && theme !== 'light' ? 'bg-neutral-950' : bgClass
      }`}
    >
      {/* Top Bar with clear Exit & Fullscreen Controls */}
      <header className="w-full flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5 opacity-60 hover:opacity-100 transition-opacity">
          <img
            src="/logo.png"
            alt="EventFlow"
            className="w-5 h-5 object-contain rounded"
          />
          <span className="text-xs font-semibold tracking-tight">EventFlow</span>
          {isStandalone && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              STAGE DISPLAY
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium transition-colors cursor-pointer"
            title="Toggle Browser Fullscreen (F)"
            aria-label="Toggle Fullscreen"
          >
            <Maximize size={15} />
            <span className="hidden sm:inline">Fullscreen</span>
            <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400">
              F
            </kbd>
          </button>

          {onClose && (
            <button
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-rose-950 text-neutral-300 hover:text-rose-200 border border-neutral-800 hover:border-rose-800 transition-colors cursor-pointer text-xs font-medium"
              title={isStandalone ? 'Close Window (Esc)' : 'Exit Presenter Screen (Esc)'}
            >
              <X size={15} className="text-neutral-400 hover:text-rose-300" />
              <span>{isStandalone ? 'Close' : 'Exit'}</span>
              <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-400">
                ESC
              </kbd>
            </button>
          )}
        </div>
      </header>

      {/* Center Main Stage Display: ONLY THE CURRENT PROGRAM AND VERY BIG TIMER / TIME UP */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 w-full max-w-7xl mx-auto my-auto">
        {/* Current Program Name (e.g. Opening Prayer, Sermon, Worship) */}
        <h1
          className={`text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight max-w-5xl leading-tight mb-4 sm:mb-8 select-text ${
            isTimeUp ? 'text-rose-300' : programColor
          }`}
        >
          {programName}
        </h1>

        {/* When time elapses: show popping "Time Up!!!" instead of numerical overtime counter */}
        {isTimeUp ? (
          <div className="flex items-center justify-center w-full py-4">
            <span
              className="font-mono font-black tracking-tight select-none uppercase text-6xl sm:text-8xl md:text-[11rem] lg:text-[14rem] xl:text-[17rem] leading-none text-rose-500 animate-timeup-pop cursor-default"
              style={{
                textShadow: '0 0 35px rgba(244, 63, 94, 0.75), 0 0 70px rgba(225, 29, 72, 0.5)',
              }}
            >
              Time Up!!!
            </span>
          </div>
        ) : (
          /* Normal Countdown: Very Big Countdown Timer */
          <div className="flex items-center justify-center w-full">
            <span
              className={`font-mono font-black tracking-tighter tabular-nums select-all text-7xl sm:text-9xl md:text-[14rem] lg:text-[18rem] xl:text-[22rem] leading-none transition-colors duration-150 ${timerColor}`}
            >
              {displayTime}
            </span>
          </div>
        )}
      </main>

      {/* Empty bottom spacer to keep perfect vertical centering */}
      <div className="h-6" />
    </div>
  );
};
