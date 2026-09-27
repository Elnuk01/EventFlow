import { EventSchedule, CompensationProposal } from '../types';
import { calculateEstimatedFinishTime, calculatePlannedFinishTime } from '../utils/timeUtils';

export function calculateScheduleCompensation(
  event: EventSchedule,
  currentSegmentIndex: number,
  scheduleVarianceSeconds: number
): CompensationProposal | null {
  // Only offer compensation if noticeably behind schedule (e.g. >= 60 seconds)
  if (scheduleVarianceSeconds < 60) {
    return null;
  }

  // Get remaining segments from current onwards that are not skipped and have duration
  const remainingSegments = event.segments.slice(currentSegmentIndex).filter((s) => !s.isSkipped && s.plannedDurationSeconds > 60);

  if (remainingSegments.length === 0) {
    return null;
  }

  const delaySeconds = Math.round(scheduleVarianceSeconds);
  const totalRemainingPlannedSeconds = remainingSegments.reduce(
    (sum, s) => sum + s.plannedDurationSeconds,
    0
  );

  if (totalRemainingPlannedSeconds <= 120) {
    return null;
  }

  // Target reduction is up to the delay, but cap at 50% of remaining time to keep segments viable
  const targetReduction = Math.min(delaySeconds, Math.floor(totalRemainingPlannedSeconds * 0.45));

  const proposedAdjustments = remainingSegments.map((seg) => {
    // Proportional weighting based on segment duration
    const weight = seg.plannedDurationSeconds / totalRemainingPlannedSeconds;
    let reduction = Math.round(targetReduction * weight);

    // Round reduction to nearest 30 seconds for clean human times
    reduction = Math.round(reduction / 30) * 30;

    // Minimum floor: segment must retain at least 40% of its planned duration or 2 minutes
    const minAllowed = Math.max(120, Math.floor(seg.plannedDurationSeconds * 0.4));
    if (seg.plannedDurationSeconds - reduction < minAllowed) {
      reduction = Math.max(0, seg.plannedDurationSeconds - minAllowed);
    }

    const recommended = seg.plannedDurationSeconds - reduction;

    return {
      segmentId: seg.id,
      segmentName: seg.name,
      currentPlannedDuration: seg.plannedDurationSeconds,
      recommendedDuration: recommended,
      reductionSeconds: reduction,
    };
  }).filter((adj) => adj.reductionSeconds > 0);

  const totalCompensated = proposedAdjustments.reduce((sum, a) => sum + a.reductionSeconds, 0);

  if (totalCompensated < 30) {
    return null;
  }

  const origFinish = calculatePlannedFinishTime(event.startTime, event.totalPlannedDurationSeconds);
  const newEstimatedFinish = calculateEstimatedFinishTime(
    origFinish,
    scheduleVarianceSeconds - totalCompensated
  );

  return {
    currentDelaySeconds: delaySeconds,
    proposedAdjustments,
    totalCompensatedSeconds: totalCompensated,
    newEstimatedFinish,
  };
}

export function applyCompensationToEvent(
  event: EventSchedule,
  proposal: CompensationProposal
): EventSchedule {
  const adjustmentMap = new Map(
    proposal.proposedAdjustments.map((a) => [a.segmentId, a.recommendedDuration])
  );

  const updatedSegments = event.segments.map((seg) => {
    if (adjustmentMap.has(seg.id)) {
      return {
        ...seg,
        plannedDurationSeconds: adjustmentMap.get(seg.id)!,
      };
    }
    return seg;
  });

  const newTotalDuration = updatedSegments.reduce(
    (sum, s) => sum + (s.isSkipped ? 0 : s.plannedDurationSeconds),
    0
  );

  return {
    ...event,
    segments: updatedSegments,
    totalPlannedDurationSeconds: newTotalDuration,
    updatedAt: new Date().toISOString(),
  };
}
