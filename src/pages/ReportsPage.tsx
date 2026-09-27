import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  Award,
  CheckCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { EventHistoryRecord } from '../types';
import { formatDuration } from '../utils/timeUtils';
import { exportHistoryToCSV } from '../utils/exportUtils';

interface ReportsPageProps {
  history: EventHistoryRecord[];
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ history }) => {
  // Aggregate report calculations
  const totalEvents = history.length;
  const totalPlannedSeconds = history.reduce((sum, h) => sum + h.plannedDurationSeconds, 0);
  const totalActualSeconds = history.reduce((sum, h) => sum + h.actualDurationSeconds, 0);
  const totalVariance = totalActualSeconds - totalPlannedSeconds;

  const avgDelaySeconds =
    totalEvents > 0 ? Math.round(totalVariance / totalEvents) : 0;

  // Segments analysis
  let longestSegmentName = 'None';
  let longestSegmentDuration = 0;
  let mostDelayedSegmentName = 'None';
  let mostDelayedVariance = 0;
  let overtimeSegmentsCount = 0;
  let skippedSegmentsCount = 0;

  history.forEach((h) => {
    h.segmentRecords.forEach((s) => {
      if (s.actualDurationSeconds > longestSegmentDuration) {
        longestSegmentDuration = s.actualDurationSeconds;
        longestSegmentName = `${s.segmentName} (${h.eventName})`;
      }
      if (s.varianceSeconds > mostDelayedVariance) {
        mostDelayedVariance = s.varianceSeconds;
        mostDelayedSegmentName = `${s.segmentName} (+${formatDuration(s.varianceSeconds, 'MM:SS')})`;
      }
      if (s.overtimeSeconds > 0) {
        overtimeSegmentsCount++;
      }
      if (s.isSkipped) {
        skippedSegmentsCount++;
      }
    });
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto overflow-y-auto max-h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Event Timing Reports</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Production benchmarks, variance distribution, and overtime trends.
          </p>
        </div>

        {history[0] && (
          <button
            onClick={() => exportHistoryToCSV(history[0])}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow shrink-0"
          >
            <FileSpreadsheet size={15} />
            <span>Export Latest CSV</span>
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
            <Clock size={14} className="text-blue-400" />
            <span>Total Events</span>
          </div>
          <span className="text-2xl font-bold font-mono text-white">{totalEvents}</span>
          <span className="text-[11px] text-neutral-400 block mt-1 font-mono">
            {formatDuration(totalActualSeconds, 'HH:MM:SS')} recorded
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
            <TrendingUp size={14} className="text-amber-400" />
            <span>Avg Event Variance</span>
          </div>
          <span
            className={`text-2xl font-bold font-mono ${
              avgDelaySeconds <= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {avgDelaySeconds <= 0 ? '-' : '+'}
            {formatDuration(Math.abs(avgDelaySeconds), 'MM:SS')}
          </span>
          <span className="text-[11px] text-neutral-400 block mt-1">Average per event run</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
            <AlertTriangle size={14} className="text-rose-400" />
            <span>Overtime Occurrences</span>
          </div>
          <span className="text-2xl font-bold font-mono text-white">{overtimeSegmentsCount}</span>
          <span className="text-[11px] text-neutral-400 block mt-1">Segments exceeding zero</span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
            <CheckCircle size={14} className="text-purple-400" />
            <span>Skipped Segments</span>
          </div>
          <span className="text-2xl font-bold font-mono text-white">{skippedSegmentsCount}</span>
          <span className="text-[11px] text-neutral-400 block mt-1">Smart-skipped items</span>
        </div>
      </div>

      {/* Insights Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">
            LONGEST SEGMENT RUN
          </span>
          <h3 className="text-base font-bold text-white truncate">{longestSegmentName}</h3>
          <span className="text-xs font-mono text-emerald-400 font-semibold block">
            Duration: {formatDuration(longestSegmentDuration, 'HH:MM:SS')}
          </span>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-2">
          <span className="text-[11px] font-mono uppercase text-neutral-400 tracking-wider">
            MOST DELAYED SEGMENT
          </span>
          <h3 className="text-base font-bold text-white truncate">{mostDelayedSegmentName}</h3>
          <span className="text-xs font-mono text-amber-400 font-semibold block">
            Max schedule slippage recorded
          </span>
        </div>
      </div>

      {/* Historical Events Run Comparison Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-mono uppercase text-neutral-400 tracking-wider font-bold">
          Historical Production Runs Breakdown
        </h2>

        <div className="space-y-2">
          {history.map((h) => {
            const plannedMins = Math.round(h.plannedDurationSeconds / 60);
            const actualMins = Math.round(h.actualDurationSeconds / 60);
            const varianceMins = Math.round(h.scheduleVarianceSeconds / 60);

            return (
              <div
                key={h.id}
                className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="font-bold text-white">{h.eventName}</h4>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {h.date} · {h.segmentRecords.length} segments
                  </span>
                </div>

                {/* Planned vs Actual visual bar */}
                <div className="flex items-center gap-4 font-mono">
                  <div className="text-right">
                    <span className="text-neutral-400 block text-[10px]">PLANNED</span>
                    <span className="text-neutral-200 font-semibold">{plannedMins}m</span>
                  </div>

                  <div className="text-right">
                    <span className="text-neutral-400 block text-[10px]">ACTUAL</span>
                    <span className="text-neutral-200 font-semibold">{actualMins}m</span>
                  </div>

                  <div className="text-right pl-2 border-l border-neutral-800">
                    <span className="text-neutral-400 block text-[10px]">VARIANCE</span>
                    <span
                      className={`font-bold ${
                        varianceMins <= 0 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {varianceMins <= 0 ? '' : '+'}
                      {varianceMins}m
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
