import React, { useState, useEffect } from 'react';
import { Monitor, Clock, User, LogOut, Home, ChevronDown } from 'lucide-react';
import { formatTimeOfDay } from '../../utils/timeUtils';
import { EventSchedule, AppSettings, AuthUser } from '../../types';

interface HeaderProps {
  activeEvent: EventSchedule | null;
  settings: AppSettings;
  isFocusMode: boolean;
  currentUser?: AuthUser | null;
  onToggleFocusMode: () => void;
  onOpenPresenter: () => void;
  onTriggerPanic: () => void;
  onToggleMobileMenu?: () => void;
  onNavigateToLanding?: () => void;
  onLogout?: () => void;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeEvent,
  settings,
  currentUser,
  onOpenPresenter,
  onTriggerPanic,
  onToggleMobileMenu,
  onNavigateToLanding,
  onLogout,
  onOpenAuth,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);

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

        {/* User Account / Landing Page Menu */}
        <div className="relative">
          {currentUser ? (
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Account Menu"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 border border-emerald-500/30">
                {currentUser.name.charAt(0)}
              </div>
              <span className="hidden md:inline max-w-[100px] truncate">{currentUser.name}</span>
              <ChevronDown size={12} className="text-neutral-500" />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 text-xs font-medium cursor-pointer transition-colors"
            >
              <User size={13} />
              <span>Log In</span>
            </button>
          )}

          {/* User Dropdown Menu */}
          {showUserMenu && currentUser && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-2.5 border-b border-neutral-800/80 mb-1">
                <div className="font-semibold text-xs text-white truncate">{currentUser.name}</div>
                <div className="text-[11px] text-neutral-400 truncate">{currentUser.email}</div>
                <div className="text-[10px] font-mono text-emerald-400 mt-0.5 truncate">
                  {currentUser.organization}
                </div>
              </div>

              {onNavigateToLanding && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigateToLanding();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors text-left cursor-pointer"
                >
                  <Home size={14} className="text-neutral-400" />
                  <span>Landing Page</span>
                </button>
              )}

              {onLogout && (
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors text-left cursor-pointer mt-1"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
