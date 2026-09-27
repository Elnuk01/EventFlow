import React, { useState, useEffect } from 'react';
import { Monitor, Clock } from 'lucide-react';
import { formatTimeOfDay } from '../../utils/timeUtils';
import { EventSchedule, AppSettings } from '../../types';

interface HeaderProps {
  activeEvent: EventSchedule | null;
  settings: AppSettings;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onOpenPresenter: () => void;
  onTriggerPanic: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeEvent,
  settings,
  onOpenPresenter,
  onTriggerPanic,
  onToggleMobileMenu,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(formatTimeOfDay(new Date(), settings.general.timeFormat === '24h'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.general.timeFormat]);

  return (
    <header className="h-13 bg-neutral-950 border-b border-neutral-800/60 px-3 sm:px-5 flex items-center justify-between z-20 shrink-0">
      {/* Event info & mobile hamburger */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="p-1.5 -ml-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 md:hidden transition-colors cursor-pointer shrink-0"
          title="Open Menu"
          aria-label="Open Navigation Menu"
        >
          <svg
            className="w-4.5 h-4.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <img
          src="/logo.png"
          alt="EventFlow Logo"
          className="w-5 h-5 rounded object-contain shrink-0"
        />
        <span className="text-xs sm:text-sm font-medium text-neutral-200 truncate">
          {activeEvent ? activeEvent.name : 'EventFlow'}
        </span>
        {activeEvent && (
          <span className="text-xs text-neutral-500 hidden sm:inline truncate">
            · {activeEvent.startTime}
          </span>
        )}
      </div>

      {/* Clock & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Simple Time of Day Clock */}
        <div className="hidden xs:flex items-center gap-1.5 text-xs font-mono text-neutral-400 tabular-nums">
          <Clock size={12} className="text-neutral-500" />
          <span>{currentTime}</span>
        </div>

        {/* Quiet +5 Min Panic Buffer */}
        <button
          onClick={onTriggerPanic}
          className="px-2 sm:px-2.5 py-1 text-xs font-mono text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 rounded-md transition-colors cursor-pointer"
          title="Add +5 Minute Buffer to Current Segment"
        >
          <span>+5m</span>
          <span className="hidden sm:inline"> buffer</span>
        </button>

        {/* Stage Display on Extended Screen Button */}
        <button
          onClick={onOpenPresenter}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/40 rounded-lg transition-colors cursor-pointer"
          title="Open Stage Display on Extended Screen"
        >
          <Monitor size={13} className="text-emerald-400" />
          <span className="hidden sm:inline">Stage Display</span>
          <span className="sm:hidden">Stage</span>
        </button>
      </div>
    </header>
  );
};
