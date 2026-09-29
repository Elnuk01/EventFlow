import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize,
  Clock,
  User,
  ArrowRight,
  Palette,
  Type,
  RotateCcw,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { EventSegment, PresenterTheme, PresenterMode, PresenterDisplayConfig, TimerState } from '../../types';
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
  mode?: PresenterMode;
  displayConfig?: Partial<PresenterDisplayConfig>;
  allSegments?: Array<{
    id?: string;
    name: string;
    plannedDurationSeconds: number;
    speaker?: string;
    isCompleted?: boolean;
    isCurrent?: boolean;
  }>;
  onClose?: () => void;
  isStandalone?: boolean;
  onConfigChange?: (config: Partial<PresenterDisplayConfig>) => void;
}

// Available font definitions for the timer digits
export interface TimerFontOption {
  id: string;
  name: string;
  cssFamily: string;
  letterSpacing?: string;
}

export const TIMER_FONTS: TimerFontOption[] = [
  {
    id: 'original',
    name: 'Original (Classic Mono)',
    cssFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
    letterSpacing: '-0.04em',
  },
  {
    id: 'impact',
    name: 'Heavy Impact (Stage Bold)',
    cssFamily: "'Impact', 'Arial Black', sans-serif",
  },
  {
    id: 'mono',
    name: 'Digital Console (Standard Mono)',
    cssFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
  {
    id: 'sans',
    name: 'Modern Sans (Clean)',
    cssFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    id: 'digital',
    name: '7-Segment Digital Clock',
    cssFamily: "'Courier New', Courier, monospace",
    letterSpacing: '0.08em',
  },
  {
    id: 'serif',
    name: 'Editorial / Gala Serif',
    cssFamily: "Georgia, Cambria, 'Times New Roman', serif",
  },
  {
    id: 'grotesk',
    name: 'Chunky Display Grotesk',
    cssFamily: "'Trebuchet MS', 'Lucida Sans Unicode', sans-serif",
  },
];

// Presets for rapid color selection
export const TIMER_COLOR_PRESETS = [
  { id: 'white', label: 'Pure White', hex: '#FFFFFF' },
  { id: 'amber', label: 'Stage Amber', hex: '#F59E0B' },
  { id: 'emerald', label: 'Neon Emerald', hex: '#10B981' },
  { id: 'cyan', label: 'Electric Cyan', hex: '#06B6D4' },
  { id: 'rose', label: 'Crimson Red', hex: '#F43F5E' },
  { id: 'orange', label: 'Safety Orange', hex: '#F97316' },
  { id: 'magenta', label: 'Cyber Magenta', hex: '#D946EF' },
  { id: 'lime', label: 'Lime Punch', hex: '#84CC16' },
];

export const PresenterScreen: React.FC<PresenterScreenProps> = ({
  segment,
  nextSegment,
  eventName = 'Live Event',
  state,
  remainingSeconds,
  elapsedSeconds = 0,
  overtimeSeconds,
  plannedDurationSeconds,
  onClose,
  isStandalone = false,
}) => {
  // Local storage keys for persisting the customized color & font
  const COLOR_STORAGE_KEY = 'eventflow_presenter_time_color';
  const FONT_STORAGE_KEY = 'eventflow_presenter_time_font';

  // Customized Color state
  const [timeColor, setTimeColor] = useState<string>(() => {
    try {
      return localStorage.getItem(COLOR_STORAGE_KEY) || '#FFFFFF';
    } catch {
      return '#FFFFFF';
    }
  });

  // Customized Font state
  const [selectedFontId, setSelectedFontId] = useState<string>(() => {
    try {
      return localStorage.getItem(FONT_STORAGE_KEY) || 'original';
    } catch {
      return 'original';
    }
  });

  // Toggle for the Color & Font customization modal
  const [showStyleModal, setShowStyleModal] = useState<boolean>(false);

  // Real-time Clock (TOD)
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save color to localStorage
  const handleColorChange = (hex: string) => {
    setTimeColor(hex);
    try {
      localStorage.setItem(COLOR_STORAGE_KEY, hex);
    } catch {
      // ignore
    }
  };

  // Save font to localStorage
  const handleFontChange = (fontId: string) => {
    setSelectedFontId(fontId);
    try {
      localStorage.setItem(FONT_STORAGE_KEY, fontId);
    } catch {
      // ignore
    }
  };

  // Keyboard shortcut listener (F for fullscreen, C for color/font, Esc for exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (showStyleModal) {
          setShowStyleModal(false);
          return;
        }
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        if (onClose) {
          onClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          toggleFullscreen();
        }
      } else if (e.key === 'c' || e.key === 'C') {
        setShowStyleModal((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, showStyleModal]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Time-up condition: segment overtime active
  const isTimeUp = overtimeSeconds > 0 || state === 'OVERTIME';

  // Warning when under 60 seconds
  const isWarning = !isTimeUp && remainingSeconds <= 60 && remainingSeconds > 0;

  // Format main timer readout
  const displayTime = isTimeUp
    ? `+${formatDuration(overtimeSeconds, 'MM:SS')}`
    : formatDuration(remainingSeconds, 'MM:SS');

  // Compute progress percentage
  const totalPlanned = plannedDurationSeconds || segment?.plannedDurationSeconds || (elapsedSeconds + remainingSeconds) || 1;
  const progressPercent = Math.min(100, Math.max(0, Math.round(((totalPlanned - remainingSeconds) / totalPlanned) * 100)));

  // Current active font object
  const activeFont = TIMER_FONTS.find((f) => f.id === selectedFontId) || TIMER_FONTS[0];

  // Active color to apply on timer digits:
  // In Time Up state, default to vivid crimson if user color is pure white, or honor custom color
  const effectiveTimerColor = isTimeUp
    ? (timeColor === '#FFFFFF' ? '#F43F5E' : timeColor)
    : isWarning && timeColor === '#FFFFFF'
    ? '#F59E0B'
    : timeColor;

  const programName = segment?.name || 'Event Standby';
  const speakerName = segment?.speaker;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden bg-black text-white transition-colors duration-300">
      {/* Top Header Bar */}
      <header className="w-full flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-900 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="EventFlow" className="w-5 h-5 object-contain rounded" />
            <span className="text-xs font-bold tracking-tight uppercase">EventFlow</span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            {isStandalone && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                GIANT STAGE TIMER
              </span>
            )}
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 font-medium">
              {eventName}
            </span>
          </div>
        </div>

        {/* Center / Right Controls (Focused: Clock, Fullscreen, Close) */}
        <div className="flex items-center gap-2">
          {/* Wall Clock Time of Day */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs font-mono font-semibold text-neutral-200">
            <Clock size={13} className="text-emerald-400 animate-pulse" />
            <span>{currentTimeStr || '--:--:--'}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-300 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Toggle Browser Fullscreen (F)"
          >
            <Maximize size={14} />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>

          {/* Exit / Close */}
          {onClose && (
            <button
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-rose-950 text-neutral-300 hover:text-rose-200 border border-neutral-800 hover:border-rose-800 transition-colors cursor-pointer text-xs font-medium"
              title="Close Presenter Screen (Esc)"
            >
              <X size={15} />
              <span>{isStandalone ? 'Close' : 'Exit'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Viewport: PURE GIANT TIMER */}
      <main className="flex-1 flex flex-col justify-center items-center w-full max-w-7xl mx-auto my-auto relative z-10 px-2 sm:px-4 text-center">
        {/* Segment Title & Speaker Badge */}
        <div className="flex flex-col items-center gap-2 mb-2 sm:mb-4 max-w-4xl">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            {programName}
          </h1>

          {speakerName && (
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-xs sm:text-sm font-semibold text-emerald-400">
              <User size={14} />
              <span>{speakerName}</span>
            </div>
          )}
        </div>

        {/* GIANT TIMER DIGITS (Dominates Viewport with Custom Color & Font) */}
        <div className="my-1 sm:my-2 flex items-center justify-center w-full">
          {isTimeUp ? (
            <div className="flex flex-col items-center">
              <span
                className="select-none tracking-tight leading-none text-6xl sm:text-8xl md:text-[11rem] lg:text-[15rem] xl:text-[18rem] uppercase font-black cursor-default drop-shadow-2xl animate-pulse"
                style={{
                  fontFamily: activeFont.cssFamily,
                  letterSpacing: activeFont.letterSpacing || 'normal',
                  color: effectiveTimerColor,
                  textShadow: `0 0 50px ${effectiveTimerColor}80, 0 0 100px ${effectiveTimerColor}40`,
                }}
              >
                TIME UP!
              </span>
              <span
                className="font-mono text-2xl sm:text-4xl md:text-5xl font-bold mt-2 tabular-nums"
                style={{ color: effectiveTimerColor }}
              >
                {displayTime}
              </span>
            </div>
          ) : (
            <span
              className="select-none tracking-tight leading-none text-8xl sm:text-[12rem] md:text-[16rem] lg:text-[22rem] xl:text-[26rem] tabular-nums drop-shadow-2xl transition-all duration-200"
              style={{
                fontFamily: activeFont.cssFamily,
                letterSpacing: activeFont.letterSpacing || 'normal',
                color: effectiveTimerColor,
                textShadow: `0 0 45px ${effectiveTimerColor}40, 0 0 90px ${effectiveTimerColor}20`,
              }}
            >
              {displayTime}
            </span>
          )}
        </div>

        {/* Clean Progress Bar */}
        <div className="w-full max-w-3xl my-3 px-4">
          <div className="w-full h-2 sm:h-3 rounded-full bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: isTimeUp ? '100%' : `${progressPercent}%`,
                backgroundColor: effectiveTimerColor,
              }}
            />
          </div>
        </div>

        {/* Next Up Segment Card */}
        {nextSegment && (
          <div className="mt-2 flex items-center gap-3 px-5 py-2 rounded-2xl bg-neutral-900/90 border border-neutral-800 text-xs sm:text-sm text-neutral-300 max-w-xl">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
              Next Up
            </span>
            <ArrowRight size={14} className="text-neutral-500 shrink-0" />
            <span className="font-semibold text-white truncate">{nextSegment.name}</span>
            {nextSegment.speaker && (
              <span className="text-neutral-400 text-xs truncate">({nextSegment.speaker})</span>
            )}
            <span className="ml-auto font-mono text-neutral-400 text-xs shrink-0">
              {formatDuration(nextSegment.plannedDurationSeconds, 'MM:SS')}
            </span>
          </div>
        )}
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="w-full flex items-center justify-between pt-3 border-t border-neutral-900 text-xs text-neutral-500 z-20 shrink-0">
        <div className="flex items-center gap-2">
          <span>
            Font: <strong className="text-neutral-300 font-medium">{activeFont.name.split(' ')[0]}</strong>
          </span>
          <span className="text-neutral-700">·</span>
          <span className="flex items-center gap-1.5">
            Color:
            <span
              className="inline-block w-3 h-3 rounded-full border border-neutral-700"
              style={{ backgroundColor: timeColor }}
            />
          </span>
        </div>

        <div className="flex items-center gap-2 text-neutral-500 text-[11px] font-mono">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[10px]">F</kbd> for Fullscreen</span>
          <span className="text-neutral-700">·</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[10px]">ESC</kbd> to Exit</span>
        </div>
      </footer>

      {/* ============================================================ */}
      {/* SIMPLIFIED COLOR & FONT CUSTOMIZATION MODAL (POPOVER)          */}
      {/* ============================================================ */}
      {showStyleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div
            className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Palette size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Customize Giant Timer</h3>
                  <p className="text-xs text-neutral-400">Select font and color for maximum stage readability.</p>
                </div>
              </div>
              <button
                onClick={() => setShowStyleModal(false)}
                className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Live Interactive Preview Box */}
            <div className="mt-5 p-5 rounded-2xl bg-black border border-neutral-800 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
                Live Digit Preview
              </span>
              <div
                className="text-5xl sm:text-6xl font-black py-2 transition-all"
                style={{
                  fontFamily: activeFont.cssFamily,
                  letterSpacing: activeFont.letterSpacing || 'normal',
                  color: timeColor,
                  textShadow: `0 0 25px ${timeColor}50`,
                }}
              >
                08:45
              </div>
              <div className="text-[11px] text-neutral-400 font-mono mt-1">
                {activeFont.name} · {timeColor.toUpperCase()}
              </div>
            </div>

            {/* 1. FONT SELECTION */}
            <div className="mt-5">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                <Type size={14} className="text-cyan-400" />
                <span>Timer Font Family</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {TIMER_FONTS.map((f) => {
                  const isSelected = selectedFontId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleFontChange(f.id)}
                      className={`flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-neutral-900 border-emerald-500 text-white shadow-lg'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold truncate">{f.name.split(' ')[0]}</div>
                        <div
                          className="text-base font-bold truncate mt-0.5"
                          style={{ fontFamily: f.cssFamily }}
                        >
                          12:30
                        </div>
                      </div>
                      {isSelected && <Check size={16} className="text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. COLOR SELECTION */}
            <div className="mt-5 pt-4 border-t border-neutral-800">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette size={14} className="text-emerald-400" />
                  <span>Timer Digits Color</span>
                </label>

                {/* Custom Color Input */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-neutral-400 uppercase">{timeColor}</span>
                  <input
                    type="color"
                    value={timeColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-7 h-7 rounded-lg border border-neutral-700 bg-neutral-900 cursor-pointer p-0.5"
                    title="Choose custom color"
                  />
                </div>
              </div>

              {/* Color Swatch Presets */}
              <div className="grid grid-cols-4 gap-2">
                {TIMER_COLOR_PRESETS.map((preset) => {
                  const isSelected = timeColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleColorChange(preset.hex)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-900 border-white text-white font-bold ring-1 ring-white/20'
                          : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-sm border border-neutral-700"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span className="truncate text-[11px]">{preset.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleColorChange('#FFFFFF');
                  handleFontChange('impact');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset to Default</span>
              </button>

              <button
                type="button"
                onClick={() => setShowStyleModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
