import React, { useState, useRef } from 'react';
import {
  Search,
  Plus,
  Play,
  FileEdit,
  Copy,
  Trash2,
  Share2,
  Upload,
  Check,
  AlertCircle,
} from 'lucide-react';
import { EventSchedule } from '../types';
import { formatDuration } from '../utils/timeUtils';
import { exportEventToJSON, parseEventFromJSON } from '../utils/exportUtils';

interface EventsPageProps {
  events: EventSchedule[];
  onSelectEvent: (event: EventSchedule) => void;
  onLaunchLive: (event: EventSchedule) => void;
  onCreateNew: () => void;
  onDeleteEvent: (id: string) => void;
  onDuplicateEvent: (event: EventSchedule) => void;
  onEditInBuilder: (event: EventSchedule) => void;
  onImportEvent?: (event: EventSchedule) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({
  events,
  onLaunchLive,
  onCreateNew,
  onDeleteEvent,
  onDuplicateEvent,
  onEditInBuilder,
  onImportEvent,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [importNotification, setImportNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventSchedule | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close modal on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && eventToDelete) {
        setEventToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [eventToDelete]);

  const filtered = events.filter((e) => {
    const q = searchTerm.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      (e.location && e.location.toLowerCase().includes(q)) ||
      (e.organizer && e.organizer.toLowerCase().includes(q)) ||
      (e.date && e.date.includes(q))
    );
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto overflow-y-auto max-h-[calc(100vh-3.25rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/60 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Schedules</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Organize running orders, speaker transitions, and timings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Import Event Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium transition-colors cursor-pointer"
            title="Import event from JSON file"
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

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-neutral-500" size={14} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search events..."
          className="w-full bg-neutral-950 border border-neutral-800/80 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
        />
      </div>

      {/* Events List */}
      <div className="space-y-2">
        {filtered.map((evt) => (
          <div
            key={evt.id}
            className="p-4 rounded-xl bg-neutral-900/40 hover:bg-neutral-900/80 border border-neutral-800/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-neutral-100 truncate">{evt.name}</h3>
                {evt.status === 'LIVE' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                <span>{evt.date}</span>
                <span>·</span>
                <span>{evt.startTime}</span>
                <span>·</span>
                <span>{evt.segments.length} segments</span>
                <span>·</span>
                <span className="font-mono">{formatDuration(evt.totalPlannedDurationSeconds, 'MM:SS')}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <button
                onClick={() => exportEventToJSON(evt)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Export JSON"
              >
                <Share2 size={13} />
              </button>
              <button
                onClick={() => onDuplicateEvent(evt)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Duplicate"
              >
                <Copy size={13} />
              </button>
              <button
                onClick={() => setEventToDelete(evt)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Delete Event"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => onEditInBuilder(evt)}
                className="px-2.5 py-1 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 text-xs transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => onLaunchLive(evt)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700/50 transition-colors cursor-pointer"
              >
                <Play size={11} className="fill-current" />
                <span>Launch</span>
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-neutral-500 text-xs">
            No events match your search.
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-800 max-w-sm w-full rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Delete Event</h3>
                <p className="text-xs text-neutral-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80">
              Are you sure you want to delete <span className="font-semibold text-white">&quot;{eventToDelete.name}&quot;</span>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const eventName = eventToDelete.name;
                  onDeleteEvent(eventToDelete.id);
                  setEventToDelete(null);
                  setImportNotification({
                    type: 'success',
                    message: `Event "${eventName}" was deleted.`,
                  });
                  setTimeout(() => setImportNotification(null), 3500);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm cursor-pointer"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
