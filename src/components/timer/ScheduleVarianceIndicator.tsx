import React, { useState } from 'react';
import { Clock, TrendingUp, Sparkles, Check, X, ArrowRight } from 'lucide-react';
import { CompensationProposal } from '../../types';
import { formatDuration } from '../../utils/timeUtils';

interface ScheduleVarianceIndicatorProps {
  originalPlannedFinish: string;
  estimatedFinish: string;
  scheduleVarianceSeconds: number;
  varianceStatus: 'ON_SCHEDULE' | 'AHEAD' | 'BEHIND';
  varianceText: string;
  compensationProposal: CompensationProposal | null;
  onApplyCompensation: () => void;
}

export const ScheduleVarianceIndicator: React.FC<ScheduleVarianceIndicatorProps> = ({
  originalPlannedFinish,
  estimatedFinish,
  scheduleVarianceSeconds,
  varianceStatus,
  varianceText,
  compensationProposal,
  onApplyCompensation,
}) => {
  const [showCompModal, setShowCompModal] = useState<boolean>(false);
  const isBehind = scheduleVarianceSeconds > 60;
  const isAhead = scheduleVarianceSeconds < -60;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 select-none">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
          Finish Estimation & Tracking
        </span>
        <span
          className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
            isBehind
              ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
              : isAhead
              ? 'bg-blue-950/40 text-blue-300 border-blue-800/60'
              : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60'
          }`}
        >
          {varianceText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Planned Finish */}
        <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800/60">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
            <Clock size={12} />
            <span>Planned Finish</span>
          </div>
          <span className="text-base font-mono font-bold text-neutral-200">
            {originalPlannedFinish}
          </span>
        </div>

        {/* Estimated Finish */}
        <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800/60">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] mb-1">
            <TrendingUp size={12} />
            <span>Estimated Finish</span>
          </div>
          <span
            className={`text-base font-mono font-bold ${
              isBehind ? 'text-amber-400' : isAhead ? 'text-blue-400' : 'text-emerald-400'
            }`}
          >
            {estimatedFinish}
          </span>
        </div>
      </div>

      {/* Smart Compensation Trigger Prompt */}
      {isBehind && compensationProposal && (
        <div className="mt-3 p-3 rounded-lg bg-amber-950/30 border border-amber-800/50">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                <Sparkles size={14} />
                <span>Smart Compensation Available</span>
              </div>
              <p className="text-[11px] text-neutral-300 mt-1">
                Event is delayed by{' '}
                <span className="font-mono font-bold text-amber-300">
                  {formatDuration(compensationProposal.currentDelaySeconds, 'MM:SS')}
                </span>
                . Propose adjustments to bring finish to{' '}
                <span className="font-mono font-bold text-emerald-400">
                  {compensationProposal.newEstimatedFinish}
                </span>
                .
              </p>
            </div>
            <button
              onClick={() => setShowCompModal(true)}
              className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shrink-0 transition-colors shadow"
            >
              Review Plan
            </button>
          </div>
        </div>
      )}

      {/* Compensation Review Modal */}
      {showCompModal && compensationProposal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-700 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-400" size={18} />
                <h3 className="text-base font-bold text-white">Smart Schedule Compensation</h3>
              </div>
              <button
                onClick={() => setShowCompModal(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              To recover the delay without extending the event past closing time, the following
              proportionate adjustments are proposed for remaining segments:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {compensationProposal.proposedAdjustments.map((adj) => (
                <div
                  key={adj.segmentId}
                  className="flex items-center justify-between p-2.5 rounded bg-neutral-950 border border-neutral-800 text-xs"
                >
                  <span className="font-medium text-neutral-200 truncate pr-2">
                    {adj.segmentName}
                  </span>
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span className="text-neutral-400 line-through">
                      {formatDuration(adj.currentPlannedDuration, 'MM:SS')}
                    </span>
                    <ArrowRight size={12} className="text-neutral-500" />
                    <span className="text-emerald-400 font-bold">
                      {formatDuration(adj.recommendedDuration, 'MM:SS')}
                    </span>
                    <span className="text-rose-400 text-[10px]">
                      (-{formatDuration(adj.reductionSeconds, 'MM:SS')})
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400">New Estimated Finish:</span>
              <span className="text-emerald-400 font-bold text-sm">
                {compensationProposal.newEstimatedFinish}
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCompModal(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
              >
                Ignore
              </button>
              <button
                onClick={() => {
                  onApplyCompensation();
                  setShowCompModal(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
              >
                <Check size={14} />
                <span>Apply Adjustment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
