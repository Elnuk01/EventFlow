import React, { useState } from 'react';
import { Layers, Plus, Clock, Play, ChevronRight, Check } from 'lucide-react';
import { EventTemplate, EventSchedule } from '../types';
import { formatDuration } from '../utils/timeUtils';
import { db } from '../database/db';

interface TemplatesPageProps {
  onUseTemplate: (template: EventTemplate) => void;
}

export const TemplatesPage: React.FC<TemplatesPageProps> = ({ onUseTemplate }) => {
  const [templates, setTemplates] = useState<EventTemplate[]>(() => db.getAllTemplates());
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(
    templates[0] || null
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto max-h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-white">Event Templates</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Standardized stage run orders for liturgies, keynotes, galas, and live productions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Templates List */}
        <div className="lg:col-span-5 space-y-3">
          {templates.map((tpl) => {
            const isSelected = selectedTemplate?.id === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-neutral-800 border-emerald-500/80 shadow-md'
                    : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800 font-bold uppercase">
                    {tpl.category}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    {formatDuration(tpl.estimatedTotalDurationSeconds, 'HH:MM:SS')}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-1">{tpl.name}</h3>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{tpl.description}</p>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400 font-mono">
                  <span>{tpl.segments.length} Segments</span>
                  <ChevronRight size={14} className={isSelected ? 'text-emerald-400' : 'text-neutral-600'} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column (7 cols): Selected Template Details & Segments */}
        <div className="lg:col-span-7">
          {selectedTemplate ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-5 sticky top-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold block mb-1">
                    {selectedTemplate.category} TEMPLATE
                  </span>
                  <h2 className="text-xl font-bold text-white">{selectedTemplate.name}</h2>
                  <p className="text-xs text-neutral-400 mt-1">{selectedTemplate.description}</p>
                </div>

                <button
                  onClick={() => onUseTemplate(selectedTemplate)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition-colors shrink-0"
                >
                  <Plus size={14} />
                  <span>Use Template</span>
                </button>
              </div>

              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400">Total Estimated Duration:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {formatDuration(selectedTemplate.estimatedTotalDurationSeconds, 'HH:MM:SS')}
                </span>
              </div>

              {/* Segments Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase text-neutral-400 tracking-wider">
                  Timeline Breakdown ({selectedTemplate.segments.length} Segments)
                </h4>

                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {selectedTemplate.segments.map((seg, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-neutral-950 border border-neutral-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <span className="font-mono text-neutral-400 w-5">
                          {(idx + 1).toString().padStart(2, '0')}
                        </span>
                        <div className="truncate">
                          <span className="font-semibold text-neutral-200 block truncate">
                            {seg.name}
                          </span>
                          {seg.speaker && (
                            <span className="text-[11px] text-neutral-400 block truncate">
                              {seg.speaker}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="font-mono text-neutral-300 font-semibold shrink-0">
                        {formatDuration(seg.plannedDurationSeconds, 'MM:SS')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-10 text-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400">
              Select a template to view timeline details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
