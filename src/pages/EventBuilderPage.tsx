import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Save,
  Clock,
  User,
  Tag,
  Check,
  Play,
  Share2,
  FolderPlus,
  AlertCircle,
  GripVertical,
} from 'lucide-react';
import { EventSchedule, EventSegment, SegmentType, EventTemplate } from '../types';
import { formatDuration } from '../utils/timeUtils';
import { db } from '../database/db';
import { exportEventToJSON, parseEventFromJSON } from '../utils/exportUtils';
import { Upload } from 'lucide-react';

interface EventBuilderPageProps {
  event: EventSchedule;
  onSaveEvent: (event: EventSchedule) => void;
  onLaunchLive: (event: EventSchedule) => void;
}

export const EventBuilderPage: React.FC<EventBuilderPageProps> = ({
  event,
  onSaveEvent,
  onLaunchLive,
}) => {
  const [formData, setFormData] = useState<EventSchedule>({ ...event });
  const [editingSegment, setEditingSegment] = useState<EventSegment | null>(null);
  const [isNewSegmentModalOpen, setIsNewSegmentModalOpen] = useState<boolean>(false);
  const [templateSavedNotification, setTemplateSavedNotification] = useState<boolean>(false);
  const [importNotification, setImportNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Drag and drop state for segment reordering
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const segments = [...formData.segments];
    const [moved] = segments.splice(draggedIndex, 1);
    segments.splice(targetIndex, 0, moved);

    const reordered = segments.map((s, idx) => ({ ...s, order: idx + 1 }));
    const updated = { ...formData, segments: reordered };
    setFormData(updated);
    onSaveEvent(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = parseEventFromJSON(content);
        if (result.success && result.event) {
          setFormData(result.event);
          onSaveEvent(result.event);
          setImportNotification({
            type: 'success',
            message: `Event "${result.event.name}" loaded with ${result.event.segments.length} segments!`,
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

  // Form field changes
  const handleMetaChange = (field: keyof EventSchedule, value: unknown) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
  };

  const handleSave = () => {
    onSaveEvent(formData);
  };

  // Reorder segment
  const moveSegment = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.segments.length) return;

    const segments = [...formData.segments];
    const temp = segments[index];
    segments[index] = segments[newIndex];
    segments[newIndex] = temp;

    // Re-index order
    const reordered = segments.map((s, idx) => ({ ...s, order: idx + 1 }));
    const updated = { ...formData, segments: reordered };
    setFormData(updated);
    onSaveEvent(updated);
  };

  // Delete segment
  const deleteSegment = (id: string) => {
    const filtered = formData.segments
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    const updated = { ...formData, segments: filtered };
    setFormData(updated);
    onSaveEvent(updated);
  };

  // Duplicate segment
  const duplicateSegment = (segment: EventSegment, index: number) => {
    const duplicated: EventSegment = {
      ...segment,
      id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${segment.name} (Copy)`,
      order: index + 2,
    };

    const segments = [...formData.segments];
    segments.splice(index + 1, 0, duplicated);

    const reordered = segments.map((s, idx) => ({ ...s, order: idx + 1 }));
    const updated = { ...formData, segments: reordered };
    setFormData(updated);
    onSaveEvent(updated);
  };

  // Toggle optional / skipped
  const toggleSegmentProp = (id: string, prop: 'isOptional' | 'isSkipped') => {
    const updatedSegments = formData.segments.map((s) => {
      if (s.id === id) {
        return { ...s, [prop]: !s[prop] };
      }
      return s;
    });
    const updated = { ...formData, segments: updatedSegments };
    setFormData(updated);
    onSaveEvent(updated);
  };

  // Save as Template
  const handleSaveAsTemplate = () => {
    const template: EventTemplate = {
      id: `tpl-${Date.now()}`,
      name: `${formData.name} Template`,
      description: formData.description || 'Custom user template',
      category: 'Custom',
      estimatedTotalDurationSeconds: formData.totalPlannedDurationSeconds,
      defaultTheme: 'minimal-dark',
      segments: formData.segments.map((s) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, eventId, ...rest } = s;
        return rest;
      }),
    };
    db.saveTemplate(template);
    setTemplateSavedNotification(true);
    setTimeout(() => setTemplateSavedNotification(false), 3000);
  };

  // Save created or edited segment
  const handleSaveSegmentModal = (seg: EventSegment) => {
    let updatedSegments: EventSegment[];
    if (editingSegment) {
      updatedSegments = formData.segments.map((s) => (s.id === seg.id ? seg : s));
    } else {
      updatedSegments = [...formData.segments, { ...seg, order: formData.segments.length + 1 }];
    }

    const updated = { ...formData, segments: updatedSegments };
    setFormData(updated);
    onSaveEvent(updated);
    setEditingSegment(null);
    setIsNewSegmentModalOpen(false);
  };

  const totalDuration = formData.segments.reduce(
    (acc, s) => acc + (s.isSkipped ? 0 : s.plannedDurationSeconds),
    0
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto max-h-[calc(100vh-3.5rem)]">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800/60 pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Event Builder</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure segment names, planned durations, and running order.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden file input for importing JSON */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium border border-neutral-800 transition-colors cursor-pointer"
            title="Import event from JSON file"
          >
            <Upload size={13} />
            <span>Import</span>
          </button>

          <button
            onClick={handleSaveAsTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium border border-neutral-800 transition-colors cursor-pointer"
          >
            <FolderPlus size={13} />
            <span>Save Template</span>
          </button>

          <button
            onClick={() => exportEventToJSON(formData)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium border border-neutral-800 transition-colors cursor-pointer"
          >
            <Share2 size={13} />
            <span>Export</span>
          </button>

          <button
            onClick={() => onLaunchLive(formData)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
          >
            <Play size={12} className="fill-current" />
            <span>Launch Live</span>
          </button>
        </div>
      </div>

      {importNotification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in ${
            importNotification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
              : 'bg-rose-950/80 border-rose-600 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {importNotification.type === 'success' ? (
              <Check size={16} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
            )}
            <span>{importNotification.message}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="text-neutral-400 hover:text-white text-xs font-semibold px-2 py-0.5 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {templateSavedNotification && (
        <div className="p-3 bg-purple-950/80 border border-purple-600 rounded-lg text-xs text-purple-200 flex items-center gap-2 animate-in fade-in">
          <Check size={14} />
          <span>Event successfully saved to your Templates library!</span>
        </div>
      )}

      {/* Event Metadata Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
          Event Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">EVENT NAME</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleMetaChange('name', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-600"
              placeholder="e.g. Sunday Worship Service"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">LOCATION / BROADCAST</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleMetaChange('location', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-600"
              placeholder="e.g. Main Auditorium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">DATE</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleMetaChange('date', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">START TIME</label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => handleMetaChange('startTime', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-neutral-400 mb-1">ORGANIZER</label>
            <input
              type="text"
              value={formData.organizer}
              onChange={(e) => handleMetaChange('organizer', e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-600"
              placeholder="e.g. Media Production Team"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-neutral-400 mb-1">DESCRIPTION / NOTES</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleMetaChange('description', e.target.value)}
            rows={2}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-neutral-600"
            placeholder="Event brief, order notes, or special directives..."
          />
        </div>
      </div>

      {/* Segments Timeline Management Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-neutral-100">
            Event Timeline ({formData.segments.length} Segments)
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
            Total Planned: {formatDuration(totalDuration, 'HH:MM:SS')}
          </span>
        </div>

        <button
          onClick={() => {
            setEditingSegment(null);
            setIsNewSegmentModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow"
        >
          <Plus size={15} />
          <span>Add Segment</span>
        </button>
      </div>

      {/* Segments Table List */}
      <div className="space-y-2">
        {formData.segments.map((seg, idx) => (
          <div
            key={seg.id}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
              draggedIndex === idx
                ? 'opacity-40 border-dashed border-neutral-600 bg-neutral-900/40'
                : dragOverIndex === idx
                ? 'border-emerald-500 bg-emerald-950/20 shadow-md ring-1 ring-emerald-500/50'
                : seg.isSkipped
                ? 'bg-neutral-950/40 border-neutral-900 opacity-60'
                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            {/* Left: Drag Handle, Order, Name, Speaker, Category */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="cursor-grab active:cursor-grabbing text-neutral-500 hover:text-neutral-300 p-1 -ml-1 rounded hover:bg-neutral-800/80 transition-colors shrink-0"
                title="Drag to rearrange segment"
              >
                <GripVertical size={15} />
              </div>

              <span className="font-mono text-xs font-bold text-neutral-400 w-6 text-center shrink-0">
                {(idx + 1).toString().padStart(2, '0')}
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className={`text-sm font-bold truncate ${
                      seg.isSkipped ? 'line-through text-neutral-500' : 'text-neutral-100'
                    }`}
                  >
                    {seg.name}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800 shrink-0">
                    {seg.segmentType}
                  </span>
                  {seg.isOptional && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 shrink-0">
                      OPTIONAL
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 font-mono">
                  {seg.speaker && (
                    <span className="flex items-center gap-1 text-neutral-300">
                      <User size={11} className="text-neutral-400" />
                      {seg.speaker}
                    </span>
                  )}
                  {seg.category && (
                    <span className="flex items-center gap-1">
                      <Tag size={11} className="text-neutral-400" />
                      {seg.category}
                    </span>
                  )}
                  {seg.description && (
                    <span className="truncate max-w-xs text-neutral-400">· {seg.description}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Duration, Move Buttons, Edit, Delete */}
            <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-800">
              <span className="font-mono text-base font-bold text-neutral-200">
                {formatDuration(seg.plannedDurationSeconds, 'MM:SS')}
              </span>

              <div
                className="flex items-center gap-1"
                draggable={false}
                onDragStart={(e) => e.stopPropagation()}
              >
                {/* Move Up / Down Accessible Reorder */}
                <button
                  onClick={() => moveSegment(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 disabled:opacity-20 hover:text-white"
                  title="Move Up"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  onClick={() => moveSegment(idx, 'down')}
                  disabled={idx === formData.segments.length - 1}
                  className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 disabled:opacity-20 hover:text-white"
                  title="Move Down"
                >
                  <ArrowDown size={15} />
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => {
                    setEditingSegment(seg);
                    setIsNewSegmentModalOpen(true);
                  }}
                  className="px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                >
                  Edit
                </button>

                {/* Duplicate */}
                <button
                  onClick={() => duplicateSegment(seg, idx)}
                  className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200"
                  title="Duplicate Segment"
                >
                  <Copy size={15} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteSegment(seg.id)}
                  className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-rose-400"
                  title="Delete Segment"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {formData.segments.length === 0 && (
          <div className="p-8 text-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400">
            <p className="text-sm">No segments in this event yet.</p>
            <button
              onClick={() => {
                setEditingSegment(null);
                setIsNewSegmentModalOpen(true);
              }}
              className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold"
            >
              Add First Segment
            </button>
          </div>
        )}
      </div>

      {/* Segment Create / Edit Modal */}
      {isNewSegmentModalOpen && (
        <SegmentEditModal
          segment={editingSegment}
          onClose={() => {
            setIsNewSegmentModalOpen(false);
            setEditingSegment(null);
          }}
          onSave={handleSaveSegmentModal}
        />
      )}
    </div>
  );
};

// Modal for editing segment
interface SegmentEditModalProps {
  segment: EventSegment | null;
  onClose: () => void;
  onSave: (segment: EventSegment) => void;
}

const SegmentEditModal: React.FC<SegmentEditModalProps> = ({ segment, onClose, onSave }) => {
  const [name, setName] = useState<string>(segment?.name || '');
  const [description, setDescription] = useState<string>(segment?.description || '');
  const [speaker, setSpeaker] = useState<string>(segment?.speaker || '');
  const [category, setCategory] = useState<string>(segment?.category || 'General');
  const [segmentType, setSegmentType] = useState<SegmentType>(segment?.segmentType || 'TIMER');
  const [minutes, setMinutes] = useState<number>(
    segment ? Math.floor(segment.plannedDurationSeconds / 60) : 5
  );
  const [seconds, setSeconds] = useState<number>(segment ? segment.plannedDurationSeconds % 60 : 0);
  const [isOptional, setIsOptional] = useState<boolean>(segment?.isOptional || false);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(segment?.autoAdvance || false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(segment ? segment.soundEnabled : true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const plannedSeconds = Math.max(10, minutes * 60 + seconds);

    const saved: EventSegment = {
      id: segment ? segment.id : `seg-${Date.now()}`,
      eventId: segment ? segment.eventId : '',
      order: segment ? segment.order : 1,
      name: name.trim(),
      description: description.trim(),
      speaker: speaker.trim(),
      category: category.trim(),
      colorTag: 'emerald',
      plannedDurationSeconds: plannedSeconds,
      warningTimesSeconds: segment?.warningTimesSeconds || [300, 60, 10],
      soundEnabled,
      autoAdvance,
      isOptional,
      isSkipped: segment ? segment.isSkipped : false,
      segmentType,
    };

    onSave(saved);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-700 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4">
        <h3 className="text-lg font-bold text-white">
          {segment ? 'Edit Segment' : 'Add New Segment'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-neutral-400 font-mono mb-1">SEGMENT NAME *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Keynote Presentation"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neutral-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-mono mb-1">SEGMENT TYPE</label>
              <select
                value={segmentType}
                onChange={(e) => setSegmentType(e.target.value as SegmentType)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none"
              >
                <option value="TIMER">TIMER (Countdown)</option>
                <option value="SPEAKER">SPEAKER (Presenter)</option>
                <option value="BREAK">BREAK (Intermission)</option>
                <option value="MEDIA">MEDIA (Video/Audio)</option>
                <option value="CLOCK">CLOCK (Time of Day)</option>
                <option value="FREE_TIME">FREE TIME (Flexible)</option>
                <option value="OVERTIME">OVERTIME (Buffer)</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 font-mono mb-1">CATEGORY</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Speech, Worship, QA"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-mono mb-1">SPEAKER / PRESENTER</label>
              <input
                type="text"
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                placeholder="e.g. Dr. Jane Smith"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-neutral-400 font-mono mb-1">PLANNED DURATION</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-20 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-white font-mono text-center"
                />
                <span className="text-neutral-400">min</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-16 bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-white font-mono text-center"
                />
                <span className="text-neutral-400">sec</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-mono mb-1">NOTES / CUES</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Dim house lights, cue microphone 2"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                type="checkbox"
                checked={isOptional}
                onChange={(e) => setIsOptional(e.target.checked)}
                className="rounded bg-neutral-950 border-neutral-800 text-emerald-500 focus:ring-0"
              />
              <span>Optional Segment</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="rounded bg-neutral-950 border-neutral-800 text-emerald-500 focus:ring-0"
              />
              <span>Enable Audio Alert</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow"
            >
              Save Segment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
