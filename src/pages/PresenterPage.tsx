import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  MonitorPlay,
  Tv,
  Check,
  User,
  ArrowRight,
  Palette,
  Type,
  AlertTriangle,
} from 'lucide-react';
import { EventSchedule } from '../types';
import { TimerSnapshot, timerEngine } from '../services/timerEngine';
import { PresenterScreen, TIMER_FONTS, TIMER_COLOR_PRESETS } from '../components/presenter/PresenterScreen';
import { stageDisplayService } from '../services/stageDisplayService';
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
  onOpenExternalWindow,
  onNavigateToLive,
}) => {
  const COLOR_STORAGE_KEY = 'eventflow_presenter_time_color';
  const FONT_STORAGE_KEY = 'eventflow_presenter_time_font';

  // Customized Font & Color state synchronized with localStorage
  const [timeColor, setTimeColor] = useState<string>(() => {
    try {
      return localStorage.getItem(COLOR_STORAGE_KEY) || '#FFFFFF';
    } catch {
      return '#FFFFFF';
    }
  });

  const [selectedFontId, setSelectedFontId] = useState<string>(() => {
    try {
      return localStorage.getItem(FONT_STORAGE_KEY) || 'original';
    } catch {
      return 'original';
    }
  });

  const [isFullscreenPreview, setIsFullscreenPreview] = useState<boolean>(false);
  const [simulateTimeUp, setSimulateTimeUp] = useState<boolean>(false);

  const currentSegment = event.segments[timerSnapshot.currentSegmentIndex] || null;
  const nextSegment = event.segments[timerSnapshot.currentSegmentIndex + 1] || null;
  const isActualTimeUp = timerSnapshot.overtimeSeconds > 0 || timerSnapshot.state === 'OVERTIME';
  const isDisplayTimeUp = isActualTimeUp || simulateTimeUp;
  const isRunning = timerSnapshot.state === 'RUNNING' || timerSnapshot.state === 'OVERTIME';

  const isWarning = !isDisplayTimeUp && timerSnapshot.remainingSeconds <= 60 && timerSnapshot.remainingSeconds > 0;
  const activeFont = TIMER_FONTS.find((f) => f.id === selectedFontId) || TIMER_FONTS[0];

  const effectiveTimerColor = isDisplayTimeUp
    ? timeColor === '#FFFFFF'
      ? '#F43F5E'
      : timeColor
    : isWarning && timeColor === '#FFFFFF'
    ? '#F59E0B'
    : timeColor;

  const displayTime = isDisplayTimeUp
    ? `+${formatDuration(simulateTimeUp && !isActualTimeUp ? 105 : timerSnapshot.overtimeSeconds, 'MM:SS')}`
    : formatDuration(timerSnapshot.remainingSeconds, 'MM:SS');

  const programName = currentSegment?.name || 'Event Standby';
  const speakerName = currentSegment?.speaker;

  // Persist color
  const handleColorChange = (hex: string) => {
    setTimeColor(hex);
    try {
      localStorage.setItem(COLOR_STORAGE_KEY, hex);
    } catch {
      // ignore
    }
  };

  // Persist font
  const handleFontChange = (fontId: string) => {
    setSelectedFontId(fontId);
    try {
      localStorage.setItem(FONT_STORAGE_KEY, fontId);
    } catch {
      // ignore
    }
  };

  // Broadcast display settings changes to connected extended stage displays
  useEffect(() => {
    stageDisplayService.broadcastState({
      segment: currentSegment,
      nextSegment,
      eventName: event.name,
      state: timerSnapshot.state,
      remainingSeconds: timerSnapshot.remainingSeconds,
      elapsedSeconds: timerSnapshot.elapsedSeconds,
      overtimeSeconds: timerSnapshot.overtimeSeconds,
      plannedDurationSeconds: timerSnapshot.plannedDurationSeconds,
      theme: 'minimal-dark',
      mode: 'minimal',
      displayConfig: {
        mode: 'minimal',
        theme: 'minimal-dark',
        showSpeakerName: true,
        showNextSegment: true,
        showClock: true,
        showProgressBar: true,
        fontSizeScale: 'large',
        overtimeDisplay: 'timeup-pop',
      },
      allSegments: event.segments.map((s, idx) => ({
        id: s.id,
        name: s.name,
        plannedDurationSeconds: s.plannedDurationSeconds,
        speaker: s.speaker,
        isCompleted: idx < timerSnapshot.currentSegmentIndex,
        isCurrent: idx === timerSnapshot.currentSegmentIndex,
      })),
      timestamp: Date.now(),
    });
  }, [currentSegment, nextSegment, event, timerSnapshot]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto overflow-y-auto max-h-[calc(100vh-3.5rem)]">
      {/* Top Header with Back to Live Control & Launch Presenter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/60 pb-4">
        <div className="flex items-center gap-3">
          {onNavigateToLive && (
            <button
              onClick={onNavigateToLive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium border border-neutral-800 transition-colors cursor-pointer"
              title="Return to Live Control"
            >
              <ArrowLeft size={13} />
              <span>Live Control</span>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Stage Display</span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold uppercase">
                Giant Timer
              </span>
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              High-visibility edge-to-edge countdown digits designed for 60+ feet distance readability.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenExternalWindow}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow active:scale-95 cursor-pointer"
            title="Open Giant Timer immediately on secondary/projector monitor"
          >
            <MonitorPlay size={14} />
            <span>Show on Extended Screen</span>
          </button>
          <button
            onClick={() => setIsFullscreenPreview(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium transition-all shadow cursor-pointer"
            title="Preview Fullscreen in this window"
          >
            <Maximize2 size={14} />
            <span>Preview Fullscreen (F)</span>
          </button>
        </div>
      </div>

      {/* 1. Giant Timer Banner Feature Highlight */}
      <div className="p-4 rounded-2xl bg-neutral-900/40 border border-neutral-800 flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
          <Tv size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">Giant Stage Timer</h2>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Active Layout
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            Eliminates all distracting clutter and small widgets. Displays ultra-large, high-contrast countdown digits that speakers can glance at effortlessly from anywhere on stage.
          </p>
        </div>
      </div>

      {/* 2. Color & Font Customization Controls */}
      <div className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Timer Appearance (Font &amp; Color)
            </h3>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">
            Applies to both preview &amp; extended monitors
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Font Selector */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
              <Type size={14} className="text-cyan-400" />
              <span>Digit Font Family</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIMER_FONTS.map((f) => {
                const isSelected = selectedFontId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleFontChange(f.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800 border-emerald-500 text-white shadow'
                        : 'bg-neutral-950/70 border-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="text-[11px] font-medium truncate">{f.name.split(' ')[0]}</div>
                      <div className="text-sm font-bold truncate mt-0.5" style={{ fontFamily: f.cssFamily }}>
                        12:30
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Palette size={14} className="text-emerald-400" />
                <span>Digit Color</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-neutral-400 uppercase">{timeColor}</span>
                <input
                  type="color"
                  value={timeColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-6 h-6 rounded-lg border border-neutral-700 bg-neutral-900 cursor-pointer p-0.5"
                  title="Choose custom color"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {TIMER_COLOR_PRESETS.map((preset) => {
                const isSelected = timeColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleColorChange(preset.hex)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-800 border-white text-white font-bold ring-1 ring-white/20'
                        : 'bg-neutral-950/70 border-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm border border-neutral-700"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span className="truncate text-[11px]">{preset.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Live 16:9 Display Preview Card */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono uppercase tracking-wider text-[11px] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Giant Timer Preview</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSimulateTimeUp((prev) => !prev)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                simulateTimeUp
                  ? 'bg-rose-600/20 text-rose-300 border-rose-500/50'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
              }`}
            >
              {simulateTimeUp ? 'Exit Time Up Test' : 'Test Time Up Alert'}
            </button>
            <span className="hidden sm:inline text-neutral-500 text-[11px]">
              Click preview to launch Fullscreen
            </span>
          </div>
        </div>

        {/* 16:9 Viewport Display */}
        <div
          onClick={() => setIsFullscreenPreview(true)}
          className="relative aspect-video w-full rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl cursor-pointer group flex flex-col justify-between p-6 sm:p-8 select-none bg-black text-white transition-transform hover:scale-[1.003]"
          title="Click to launch Fullscreen Presenter"
        >
          {/* Subtle hover overlay hint */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/90 text-white text-xs border border-neutral-700 font-medium z-30 shadow-lg">
            <Maximize2 size={13} className="text-emerald-400" />
            <span>Fullscreen (F)</span>
          </div>

          {/* Mini Header */}
          <div className="flex items-center justify-between opacity-80 text-xs">
            <span className="font-bold tracking-tight uppercase text-neutral-400">{event.name}</span>
            <span className="font-mono text-neutral-400">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Center Giant Timer Display */}
          <div className="my-auto flex flex-col items-center justify-center text-center py-2">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-tight max-w-3xl mb-1 sm:mb-2 text-white">
              {programName}
            </h2>

            {speakerName && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 text-xs text-emerald-400 mb-2 font-semibold">
                <User size={13} />
                <span>{speakerName}</span>
              </div>
            )}

            {/* Giant Digits */}
            <div className="my-1 sm:my-2 flex items-center justify-center">
              {isDisplayTimeUp ? (
                <div className="flex flex-col items-center animate-pulse">
                  <span
                    className="font-black uppercase tracking-tight select-none text-5xl sm:text-7xl md:text-8xl leading-none"
                    style={{
                      fontFamily: activeFont.cssFamily,
                      letterSpacing: activeFont.letterSpacing || 'normal',
                      color: effectiveTimerColor,
                      textShadow: `0 0 45px ${effectiveTimerColor}70`,
                    }}
                  >
                    TIME UP!
                  </span>
                  <span
                    className="font-mono text-2xl sm:text-3xl md:text-4xl font-bold mt-2 tabular-nums"
                    style={{ color: effectiveTimerColor }}
                  >
                    {displayTime}
                  </span>
                </div>
              ) : (
                <span
                  className="font-black tracking-tight leading-none select-none text-7xl sm:text-9xl md:text-[10rem] lg:text-[12rem] tabular-nums drop-shadow-2xl transition-all"
                  style={{
                    fontFamily: activeFont.cssFamily,
                    letterSpacing: activeFont.letterSpacing || 'normal',
                    color: effectiveTimerColor,
                    textShadow: `0 0 40px ${effectiveTimerColor}40`,
                  }}
                >
                  {displayTime}
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full max-w-md h-2 rounded-full bg-neutral-900 border border-neutral-800 overflow-hidden mt-2">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: isDisplayTimeUp
                    ? '100%'
                    : `${Math.min(
                        100,
                        Math.round(
                          ((timerSnapshot.plannedDurationSeconds - timerSnapshot.remainingSeconds) /
                            Math.max(1, timerSnapshot.plannedDurationSeconds)) *
                            100
                        )
                      )}%`,
                  backgroundColor: effectiveTimerColor,
                }}
              />
            </div>
          </div>

          {/* Mini Footer */}
          <div className="flex items-center justify-between text-xs opacity-80 pt-2 border-t border-neutral-900">
            {nextSegment ? (
              <div className="flex items-center gap-1.5 text-neutral-400">
                <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Next</span>
                <ArrowRight size={12} />
                <span className="font-semibold text-neutral-200 truncate">{nextSegment.name}</span>
                <span className="text-neutral-500 font-mono text-[11px]">
                  ({formatDuration(nextSegment.plannedDurationSeconds, 'MM:SS')})
                </span>
              </div>
            ) : (
              <span />
            )}
            <span />
          </div>
        </div>

        {/* Quick controls underneath preview for operator convenience */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => timerEngine.togglePlayPause()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer ${
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
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700/60 transition-colors cursor-pointer"
              title="Reset Segment"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <button
              onClick={() => timerEngine.adjustTime(-60)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700/60 cursor-pointer"
            >
              -1 MIN
            </button>
            <button
              onClick={() => timerEngine.adjustTime(60)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-neutral-700/60 font-semibold cursor-pointer"
            >
              +1 MIN
            </button>
            <button
              onClick={() => timerEngine.adjustTime(300)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700/60 font-semibold cursor-pointer"
            >
              +5 MIN Buffer
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Overlay Component */}
      {isFullscreenPreview && (
        <PresenterScreen
          segment={currentSegment}
          nextSegment={nextSegment}
          eventName={event.name}
          state={timerSnapshot.state}
          remainingSeconds={timerSnapshot.remainingSeconds}
          elapsedSeconds={timerSnapshot.elapsedSeconds}
          overtimeSeconds={timerSnapshot.overtimeSeconds}
          plannedDurationSeconds={timerSnapshot.plannedDurationSeconds}
          allSegments={event.segments.map((s, idx) => ({
            id: s.id,
            name: s.name,
            plannedDurationSeconds: s.plannedDurationSeconds,
            speaker: s.speaker,
            isCompleted: idx < timerSnapshot.currentSegmentIndex,
            isCurrent: idx === timerSnapshot.currentSegmentIndex,
          }))}
          onClose={() => setIsFullscreenPreview(false)}
        />
      )}
    </div>
  );
};
