import React from 'react';
import {
  Radio,
  CalendarDays,
  FileEdit,
  MonitorPlay,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { audioService } from '../../services/audioService';

export type ActiveTab =
  | 'dashboard'
  | 'events'
  | 'builder'
  | 'live'
  | 'presenter'
  | 'templates'
  | 'history'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isLiveRunning: boolean;
  onOpenPresenterWindow: () => void;
  onCloseMobile?: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isLiveRunning,
  onOpenPresenterWindow,
  onCloseMobile,
  isMobile = false,
}) => {
  const [isMuted, setIsMuted] = React.useState(audioService.isSoundMuted());

  const toggleSound = () => {
    const next = audioService.toggleMute();
    setIsMuted(next);
  };

  const navItems = [
    {
      id: 'live' as const,
      label: 'Live Control',
      icon: Radio,
      isLive: isLiveRunning,
    },
    { id: 'events' as const, label: 'Events', icon: CalendarDays },
    { id: 'builder' as const, label: 'Builder', icon: FileEdit },
    { id: 'presenter' as const, label: 'Presenter', icon: MonitorPlay },
    { id: 'history' as const, label: 'History', icon: History },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const effectiveCollapsed = isMobile ? false : isCollapsed;

  return (
    <aside
      className={
        isMobile
          ? 'flex flex-col h-full bg-neutral-950 w-full justify-between select-none z-50'
          : `hidden md:flex h-screen bg-neutral-950 border-r border-neutral-800/60 flex-col justify-between transition-all duration-200 select-none z-30 shrink-0 ${
              isCollapsed ? 'w-16' : 'w-56'
            }`
      }
    >
      {/* Brand Header */}
      <div>
        <div className="h-13 flex items-center justify-between px-3 border-b border-neutral-800/60">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <img
              src="/logo.png"
              alt="EventFlow Logo"
              className="w-6 h-6 rounded-md object-contain shrink-0"
            />
            {!effectiveCollapsed && (
              <span className="font-semibold text-sm tracking-tight text-white block truncate">
                EventFlow
              </span>
            )}
          </div>

          {isMobile ? (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close menu"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          ) : (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/60 transition-colors cursor-pointer shrink-0"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="p-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-neutral-800/80 text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                } ${effectiveCollapsed ? 'justify-center px-0' : ''}`}
                title={effectiveCollapsed ? item.label : undefined}
              >
                <div className="relative shrink-0">
                  <Icon
                    size={16}
                    className={isActive ? 'text-white' : 'text-neutral-400'}
                  />
                  {item.isLive && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </div>
                {!effectiveCollapsed && (
                  <span className="truncate flex-1 text-left flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.isLive && (
                      <span className="text-[10px] text-rose-400 font-mono">
                        live
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Actions */}
      <div className="p-2 border-t border-neutral-800/60 flex items-center justify-between">
        {!effectiveCollapsed ? (
          <>
            <button
              onClick={() => {
                onOpenPresenterWindow();
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Open Presenter Window"
            >
              <MonitorPlay size={13} />
              <span>Stage Display</span>
            </button>

            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer ${
                isMuted ? 'text-amber-400' : ''
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </>
        ) : (
          <button
            onClick={toggleSound}
            className={`w-full flex justify-center py-1.5 text-neutral-400 hover:text-white cursor-pointer ${
              isMuted ? 'text-amber-400' : ''
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        )}
      </div>
    </aside>
  );
};
