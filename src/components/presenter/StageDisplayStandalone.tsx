import React, { useState, useEffect } from 'react';
import { PresenterScreen } from './PresenterScreen';
import { stageDisplayService, StageDisplayState } from '../../services/stageDisplayService';
import { db } from '../../database/db';
import { EventSegment, PresenterTheme, TimerState } from '../../types';

export const StageDisplayStandalone: React.FC = () => {
  // Try to load initial fallback from db if active
  const initialEvent = (() => {
    const id = db.getActiveEventId();
    if (id) {
      const found = db.getEvent(id);
      if (found) return found;
    }
    const all = db.getAllEvents();
    return all[0] || null;
  })();

  const initialSettings = db.getSettings();

  const [state, setState] = useState<StageDisplayState>(() => {
    const currentSegment = initialEvent?.segments[0] || null;
    const nextSegment = initialEvent?.segments[1] || null;

    return {
      segment: currentSegment,
      nextSegment,
      eventName: initialEvent?.name || 'EventFlow Stage Display',
      state: 'IDLE' as TimerState,
      remainingSeconds: currentSegment?.plannedDurationSeconds || 0,
      elapsedSeconds: 0,
      overtimeSeconds: 0,
      plannedDurationSeconds: currentSegment?.plannedDurationSeconds || 0,
      theme: initialSettings?.presenter?.theme || 'minimal-dark',
      timestamp: Date.now(),
    };
  });

  const [showHelperBanner, setShowHelperBanner] = useState<boolean>(true);

  // Subscribe to real-time state broadcasts from the operator window
  useEffect(() => {
    const unsubscribe = stageDisplayService.subscribeToState((freshState) => {
      setState(freshState);
    });

    // Auto-hide helper hint after 4 seconds
    const timer = setTimeout(() => {
      setShowHelperBanner(false);
    }, 4000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  // Request fullscreen on user click if not yet fullscreen
  const handleScreenClick = () => {
    if (!document.fullscreenElement && showHelperBanner) {
      document.documentElement.requestFullscreen().catch(() => {});
      setShowHelperBanner(false);
    }
  };

  return (
    <div
      onClick={handleScreenClick}
      className="relative w-screen h-screen overflow-hidden bg-black text-white select-none cursor-default"
    >
      {/* Floating Notification for Stage Operators (Auto-hides) */}
      {showHelperBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-neutral-900/90 border border-neutral-700/80 shadow-2xl backdrop-blur-md text-xs text-neutral-200 animate-in fade-in slide-in-from-top-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-emerald-400">Extended Stage Display Connected</span>
            <span className="text-neutral-400">·</span>
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 font-mono text-[10px] text-white">F</kbd> for Fullscreen</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowHelperBanner(false);
              }}
              className="text-neutral-400 hover:text-white ml-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Fullscreen Stage Display */}
      <PresenterScreen
        segment={state.segment}
        nextSegment={state.nextSegment}
        eventName={state.eventName}
        state={state.state}
        remainingSeconds={state.remainingSeconds}
        elapsedSeconds={state.elapsedSeconds}
        overtimeSeconds={state.overtimeSeconds}
        plannedDurationSeconds={state.plannedDurationSeconds}
        theme={state.theme}
        isStandalone={true}
        onClose={() => {
          if (window.opener) {
            window.close();
          } else if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }}
      />
    </div>
  );
};
