import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  Trash2,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { EventHistoryRecord } from '../types';
import { formatDuration } from '../utils/timeUtils';
import { exportHistoryToCSV } from '../utils/exportUtils';
import { db } from '../database/db';

interface HistoryPageProps {
  history: EventHistoryRecord[];
  onRefreshHistory: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ history, onRefreshHistory }) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(
    history[0]?.id || null
  );
  const [recordToDelete, setRecordToDelete] = useState<EventHistoryRecord | null>(null);

  const selectedRecord = history.find((h) => h.id === selectedRecordId) || history[0] || null;

  const handleDelete = (record: EventHistoryRecord) => {
    setRecordToDelete(record);
  };

  const confirmDelete = () => {
    if (recordToDelete) {
      db.deleteHistoryRecord(recordToDelete.id);
      onRefreshHistory();
      setRecordToDelete(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto max-h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Event History & Time Capsules
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Archived production run records, actual durations, variances, and operator notes.
          </p>
        </div>

        {selectedRecord && (
          <button
            onClick={() => exportHistoryToCSV(selectedRecord)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span>Export to CSV</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): History List */}
        <div className="lg:col-span-5 space-y-3">
          {history.map((record) => {
            const isSelected = selectedRecord?.id === record.id;
            const isAhead = record.scheduleVarianceSeconds <= 0;

            return (
              <div
                key={record.id}
                onClick={() => setSelectedRecordId(record.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-neutral-800 border-emerald-500/80 shadow-md'
                    : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-mono text-neutral-400">{record.date}</span>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                      isAhead
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
                        : 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                    }`}
                  >
                    {isAhead ? '-' : '+'}
                    {formatDuration(Math.abs(record.scheduleVarianceSeconds), 'MM:SS')}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white truncate">{record.eventName}</h3>

                <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono mt-2 pt-2 border-t border-neutral-800/80">
                  <span>Planned: {formatDuration(record.plannedDurationSeconds, 'HH:MM:SS')}</span>
                  <span>·</span>
                  <span>Actual: {formatDuration(record.actualDurationSeconds, 'HH:MM:SS')}</span>
                </div>
              </div>
            );
          })}

          {history.length === 0 && (
            <div className="p-8 text-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400">
              <p className="text-sm">No completed events in history yet.</p>
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Selected Record Segment Breakdown & Notes */}
        <div className="lg:col-span-7">
          {selectedRecord ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6 sticky top-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold block mb-1">
                    TIME CAPSULE RECORD
                  </span>
                  <h2 className="text-xl font-bold text-white">{selectedRecord.eventName}</h2>
                  <p className="text-xs text-neutral-400 mt-1">Concluded on {selectedRecord.date}</p>
                </div>

                <button
                  onClick={() => handleDelete(selectedRecord)}
                  className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-rose-400 cursor-pointer transition-colors"
                  title="Delete Record"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-mono block mb-1">
                    Total Planned
                  </span>
                  <span className="text-sm font-bold font-mono text-neutral-200">
                    {formatDuration(selectedRecord.plannedDurationSeconds, 'HH:MM:SS')}
                  </span>
                </div>

                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-mono block mb-1">
                    Total Actual
                  </span>
                  <span className="text-sm font-bold font-mono text-neutral-200">
                    {formatDuration(selectedRecord.actualDurationSeconds, 'HH:MM:SS')}
                  </span>
                </div>

                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-mono block mb-1">
                    Deviation
                  </span>
                  <span
                    className={`text-sm font-bold font-mono ${
                      selectedRecord.scheduleVarianceSeconds <= 0
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {selectedRecord.scheduleVarianceSeconds <= 0 ? '-' : '+'}
                    {formatDuration(Math.abs(selectedRecord.scheduleVarianceSeconds), 'MM:SS')}
                  </span>
                </div>
              </div>

              {/* Segment-by-Segment Variance Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase text-neutral-400 tracking-wider">
                  Segment-by-Segment Performance
                </h4>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {selectedRecord.segmentRecords.map((seg, idx) => {
                    const isOvertime = seg.overtimeSeconds > 0;
                    const tookLonger = seg.varianceSeconds > 0;

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold text-neutral-200 block truncate">
                            {seg.segmentName}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Planned: {formatDuration(seg.plannedDurationSeconds, 'MM:SS')} · Actual: {formatDuration(seg.actualDurationSeconds, 'MM:SS')}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`font-bold ${
                              tookLonger ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {tookLonger ? '+' : ''}
                            {formatDuration(seg.varianceSeconds, 'MM:SS')}
                          </span>
                          {isOvertime && (
                            <span className="text-[10px] text-rose-400 block font-semibold">
                              (+{formatDuration(seg.overtimeSeconds, 'MM:SS')} OT)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes Log */}
              {selectedRecord.notes && selectedRecord.notes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-neutral-800">
                  <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-neutral-400">
                    <MessageSquare size={13} />
                    <span>In-Event Log Notes ({selectedRecord.notes.length})</span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {selectedRecord.notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-2.5 rounded bg-neutral-950 text-xs text-neutral-300 border border-neutral-800/80"
                      >
                        <span className="text-[10px] font-mono text-neutral-400 mr-2">
                          [{note.timestamp}] {note.segmentName}:
                        </span>
                        <span>{note.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400">
              Select a history record to view segment metrics.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-neutral-900 border border-neutral-800 max-w-sm w-full rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Delete History Record</h3>
                <p className="text-xs text-neutral-400 mt-0.5">This archived run log will be removed.</p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80">
              Are you sure you want to delete the record for <span className="font-semibold text-white">&quot;{recordToDelete.eventName}&quot;</span> ({recordToDelete.date})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
