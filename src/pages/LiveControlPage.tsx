import React, { useState } from 'react';
import {
  Check,
  RotateCcw,
  MessageSquare,
  Trash2,
  FileCheck,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';
import {
  EventSchedule,
  EventNote,
  EventScenario,
  CompensationProposal,
} from '../types';
import { TimerSnapshot, timerEngine } from '../services/timerEngine';
import { LargeTimerDisplay } from '../components/timer/LargeTimerDisplay';
import { TimerControls } from '../components/timer/TimerControls';
import { OvertimeBanner } from '../components/timer/OvertimeBanner';
import { formatDuration } from '../utils/timeUtils';

interface LiveControlPageProps {
  event: EventSchedule;
  timerSnapshot: TimerSnapshot;
  notes: EventNote[];
  scheduleCalculations: {
    originalPlannedFinish: string;
    estimatedFinish: string;
    scheduleVarianceSeconds: number;
    varianceStatus: 'ON_SCHEDULE' | 'AHEAD' | 'BEHIND';
    varianceText: string;
    totalElapsedSeconds: number;
    totalPlannedSeconds: number;
    timeBankRemainingSeconds: number;
    timeBankTotalSeconds: number;
  };
  compensationProposal: CompensationProposal | null;
  onLoadSegment: (index: number, autoStart?: boolean) => void;
  onNextSegment: (autoStart?: boolean) => void;
  onPrevSegment: () => void;
  onSkipCurrentSegment: () => void;
  onSwitchScenario: (scenario: EventScenario) => void;
  onAddNote: (text: string) => void;
  onDeleteNote: (noteId: string) => void;
  onApplyCompensation: () => void;
  onCompleteEvent: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

export const LiveControlPage: React.FC<LiveControlPageProps> = ({
  event,
  timerSnapshot,
  notes,
  scheduleCalculations,
  onLoadSegment,
  onNextSegment,
  onPrevSegment,
  onSkipCurrentSegment,
  onSwitchScenario,
  onAddNote,
  onDeleteNote,
  onCompleteEvent,
}) => {
  const [noteInput, setNoteInput] = useState<string>('');
  const [showTools, setShowTools] = useState<boolean>(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState<boolean>(false);

  const currentIndex = timerSnapshot.currentSegmentIndex;
  const currentSegment = event.segments[currentIndex] || null;
  const hasNext = currentIndex < event.segments.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteInput.trim()) {
      onAddNote(noteInput.trim());
      setNoteInput('');
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.25rem)] flex flex-col justify-between p-4 sm:p-6 md:p-8 max-w-7xl mx-auto overflow-y-auto">
      {/* Quiet Status Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-800/60 pb-3 gap-2 text-xs text-neutral-400">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="font-medium text-neutral-300">
            Segment {currentIndex + 1} of {event.segments.length}
          </span>
          <span>·</span>
          <span>
            Est. Finish: <strong className="font-normal text-neutral-200">{scheduleCalculations.estimatedFinish}</strong>
          </span>
          <span>·</span>
          <span
            className={
              scheduleCalculations.varianceStatus === 'BEHIND'
                ? 'text-rose-400'
                : scheduleCalculations.varianceStatus === 'AHEAD'
                ? 'text-blue-400'
                : 'text-neutral-400'
            }
          >
            {scheduleCalculations.varianceText}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowTools(!showTools)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
              showTools
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
            title="Toggle Scenarios & Notes"
          >
            <SlidersHorizontal size={13} />
            <span>Tools</span>
          </button>

          <button
            onClick={() => setShowCompleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors text-xs cursor-pointer"
          >
            <FileCheck size={13} className="text-emerald-400" />
            <span>Finish</span>
          </button>
        </div>
      </div>

      {/* Overtime Alert Banner if Active */}
      {timerSnapshot.overtimeSeconds > 0 && (
        <div className="my-2">
          <OvertimeBanner
            overtimeSeconds={timerSnapshot.overtimeSeconds}
            onEndSegment={() => onNextSegment(true)}
            onAddTime={(sec) => timerEngine.adjustTime(sec)}
            onNextSegment={() => onNextSegment(true)}
          />
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 my-auto items-center py-4 min-h-0">
        {/* Left Column: Big Timer & Essential Transport Controls */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center space-y-4 sm:space-y-6">
          <LargeTimerDisplay
            segment={currentSegment}
            state={timerSnapshot.state}
            remainingSeconds={timerSnapshot.remainingSeconds}
            elapsedSeconds={timerSnapshot.elapsedSeconds}
            overtimeSeconds={timerSnapshot.overtimeSeconds}
            plannedDurationSeconds={timerSnapshot.plannedDurationSeconds}
            progressPercent={timerSnapshot.progressPercent}
            displayFormat="MM:SS"
          />

          <TimerControls
            state={timerSnapshot.state}
            onTogglePlayPause={() => timerEngine.togglePlayPause()}
            onNext={() => onNextSegment(true)}
            onPrev={onPrevSegment}
            onReset={() => timerEngine.reset()}
            onSkip={onSkipCurrentSegment}
            onAdjustTime={(delta) => timerEngine.adjustTime(delta)}
            hasNext={hasNext}
            hasPrev={hasPrev}
          />
        </div>

        {/* Right Column: Clean Program Schedule */}
        <div className="lg:col-span-4 flex flex-col w-full max-h-80 lg:max-h-[520px] bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800/60 text-xs">
            <span className="font-medium text-neutral-300">Schedule</span>
            <span className="text-neutral-500 font-mono text-[11px]">
              {formatDuration(scheduleCalculations.totalPlannedSeconds, 'HH:MM:SS')} total
            </span>
          </div>

          {/* Segment List */}
          <div className="flex-1 overflow-y-auto space-y-1 py-2 pr-1">
            {event.segments.map((seg, idx) => {
              const isCurrent = idx === currentIndex;
              const isCompleted = idx < currentIndex && !seg.isSkipped;

              return (
                <div
                  key={seg.id}
                  onClick={() => onLoadSegment(idx, false)}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-neutral-800 text-white font-medium'
                      : isCompleted
                      ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900/60'
                      : 'text-neutral-300 hover:text-white hover:bg-neutral-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    {isCompleted ? (
                      <Check size={13} className="text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 shrink-0" />
                    )}
                    <span className="truncate">{seg.name}</span>
                  </div>

                  <span className="font-mono text-[11px] text-neutral-400 shrink-0">
                    {formatDuration(seg.plannedDurationSeconds, 'MM:SS')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Optional Collapsible Tools Area (Scenarios & Notes) */}
          {showTools && (
            <div className="pt-3 border-t border-neutral-800/60 space-y-3">
              {/* Scenarios */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Pacing</span>
                <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
                  <button
                    onClick={() => onSwitchScenario('NORMAL')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      event.activeScenario === 'NORMAL'
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => onSwitchScenario('SHORT')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      event.activeScenario === 'SHORT'
                        ? 'bg-amber-900/60 text-amber-200'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    -15%
                  </button>
                  <button
                    onClick={() => onSwitchScenario('EMERGENCY')}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      event.activeScenario === 'EMERGENCY'
                        ? 'bg-rose-900/60 text-rose-200'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    -35%
                  </button>
                </div>
              </div>

              {/* Quick Note Input */}
              <form onSubmit={handleNoteSubmit} className="flex gap-1.5">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Log quick note..."
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Log
                </button>
              </form>

              {/* Notes List */}
              {notes.length > 0 && (
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {notes.slice(-3).map((note) => (
                    <div
                      key={note.id}
                      className="text-[11px] text-neutral-400 flex items-center justify-between"
                    >
                      <span className="truncate">
                        [{note.timestamp}] {note.text}
                      </span>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="text-neutral-500 hover:text-rose-400 ml-1 cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showCompleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-semibold text-white">Complete Event Session?</h3>
            <p className="text-xs text-neutral-400">
              This will save the segment runtimes and variance to your permanent History log.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCompleteConfirm(false);
                  onCompleteEvent();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm cursor-pointer"
              >
                Archive to History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
