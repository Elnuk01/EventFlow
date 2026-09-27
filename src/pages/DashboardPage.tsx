import React, { useState, useRef } from 'react';
import {
  Play,
  Plus,
  Upload,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { EventSchedule, EventHistoryRecord } from '../types';
import { formatDuration } from '../utils/timeUtils';
import { parseEventFromJSON } from '../utils/exportUtils';

interface DashboardPageProps {
  events: EventSchedule[];
  history: EventHistoryRecord[];
  onSelectEvent: (event: EventSchedule) => void;
  onNavigate: (tab: 'dashboard' | 'events' | 'builder' | 'live' | 'presenter' | 'templates' | 'history' | 'reports') => void;
  onLaunchLive: (event: EventSchedule) => void;
  onCreateNew: () => void;
  onOpenTemplates: () => void;
  onImportBackup: () => void;
  onImportEvent?: (event: EventSchedule) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  events,
  onSelectEvent,
  onNavigate,
  onLaunchLive,
  onCreateNew,
  onImportEvent,
}) => {
  const [importNotification, setImportNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = parseEventFromJSON(content);
        if (result.success && result.event && onImportEvent) {
          onImportEvent(result.event);
          setImportNotification({
            type: 'success',
            message: `Event "${result.event.name}" (${result.event.segments.length} segments) imported.`,
          });
        } else {
          setImportNotification({
            type: 'error',
            message: result.error || 'Failed to import event from JSON file.',
          });
        }
        setTimeout(() => setImportNotification(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const upcomingEvents = events.filter((e) => e.status !== 'COMPLETED');

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto overflow-y-auto max-h-[calc(100vh-3.25rem)]">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/60 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Event Schedules</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Stage timing, confidence monitor control, and live schedule management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium transition-colors cursor-pointer"
          >
            <Upload size={13} />
            <span>Import</span>
          </button>

          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {importNotification && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            importNotification.type === 'success'
              ? 'bg-neutral-900 border-emerald-600/60 text-emerald-300'
              : 'bg-neutral-900 border-rose-600/60 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {importNotification.type === 'success' ? (
              <Check size={14} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={14} className="text-rose-400 shrink-0" />
            )}
            <span>{importNotification.message}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="text-neutral-400 hover:text-white text-xs font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-2">
        {upcomingEvents.map((evt) => (
          <div
            key={evt.id}
            className="p-4 rounded-xl bg-neutral-900/50 hover:bg-neutral-900/90 border border-neutral-800/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-neutral-100 truncate">{evt.name}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 mt-1">
                <span>{evt.date}</span>
                <span>·</span>
                <span>{evt.startTime}</span>
                <span>·</span>
                <span>{evt.segments.length} segments</span>
                <span>·</span>
                <span className="font-mono">{formatDuration(evt.totalPlannedDurationSeconds, 'MM:SS')}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={() => {
                  onSelectEvent(evt);
                  onNavigate('builder');
                }}
                className="px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => onLaunchLive(evt)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-medium border border-neutral-700/50 transition-colors cursor-pointer"
              >
                <Play size={12} className="fill-current" />
                <span>Launch</span>
              </button>
            </div>
          </div>
        ))}

        {upcomingEvents.length === 0 && (
          <div className="text-center py-12 text-neutral-500 text-xs">
            No events scheduled yet. Click &quot;New Event&quot; or &quot;Import&quot; to begin.
          </div>
        )}
      </div>
    </div>
  );
};
