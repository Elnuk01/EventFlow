import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EventSchedule,
  EventSegment,
  EventNote,
  EventHistoryRecord,
  SegmentHistoryRecord,
  AppSettings,
  EventScenario,
  CompensationProposal,
} from '../types';
import { db } from '../database/db';
import { timerEngine, TimerSnapshot } from '../services/timerEngine';
import {
  calculatePlannedFinishTime,
  calculateEstimatedFinishTime,
  formatVarianceText,
} from '../utils/timeUtils';
import {
  calculateScheduleCompensation,
  applyCompensationToEvent,
} from '../services/scheduleCompensation';

export function useEventFlow() {
  const [activeEvent, setActiveEvent] = useState<EventSchedule>(() => {
    const id = db.getActiveEventId();
    if (id) {
      const found = db.getEvent(id);
      if (found) return found;
    }
    const all = db.getAllEvents();
    return all[0];
  });

  const [settings, setSettings] = useState<AppSettings>(() => db.getSettings());
  const [timerSnapshot, setTimerSnapshot] = useState<TimerSnapshot>(() => timerEngine.getSnapshot());
  const [notes, setNotes] = useState<EventNote[]>(() => {
    return activeEvent ? db.getNotesForEvent(activeEvent.id) : [];
  });

  // Track segment actual runtimes: Map<segmentIndex, actualSeconds>
  const [segmentActuals, setSegmentActuals] = useState<Record<number, number>>({});
  const [eventStartedTimestamp, setEventStartedTimestamp] = useState<number | null>(null);

  // Subscribe to timer engine
  useEffect(() => {
    const unsub = timerEngine.subscribe((snap) => {
      setTimerSnapshot(snap);
    });
    return unsub;
  }, []);

  // Sync active event if id changes
  const selectEvent = useCallback((event: EventSchedule) => {
    db.setActiveEventId(event.id);
    setActiveEvent(event);
    setNotes(db.getNotesForEvent(event.id));
    setSegmentActuals({});
    setEventStartedTimestamp(null);
    if (event.segments.length > 0) {
      timerEngine.loadSegment(event.segments[0], 0, false);
    }
  }, []);

  // Update active event
  const updateActiveEvent = useCallback((updated: EventSchedule) => {
    const saved = db.saveEvent(updated);
    setActiveEvent(saved);
    // If current segment was modified, update timer engine planned duration
    const current = saved.segments[timerEngine.getCurrentSegmentIndex()];
    if (current) {
      // If idle, refresh segment
      if (timerEngine.getState() === 'IDLE') {
        timerEngine.loadSegment(current, timerEngine.getCurrentSegmentIndex(), false);
      }
    }
  }, []);

  // Load a specific segment in Live Control
  const loadSegment = useCallback(
    (index: number, autoStart: boolean = false) => {
      if (!activeEvent || !activeEvent.segments[index]) return;

      // Save previous segment actual run time if transitioning
      const prevIndex = timerEngine.getCurrentSegmentIndex();
      if (prevIndex !== index) {
        setSegmentActuals((prev) => ({
          ...prev,
          [prevIndex]: timerEngine.getElapsedSeconds(),
        }));
      }

      if (eventStartedTimestamp === null && autoStart) {
        setEventStartedTimestamp(Date.now());
      }

      const segment = activeEvent.segments[index];
      timerEngine.loadSegment(segment, index, autoStart);

      // Update activeEvent.currentSegmentIndex
      const updated = {
        ...activeEvent,
        currentSegmentIndex: index,
        status: autoStart ? ('LIVE' as const) : activeEvent.status,
      };
      updateActiveEvent(updated);
    },
    [activeEvent, eventStartedTimestamp, updateActiveEvent]
  );

  // Next segment
  const nextSegment = useCallback(
    (autoStart: boolean = true) => {
      if (!activeEvent) return;
      const currentIndex = timerEngine.getCurrentSegmentIndex();
      let nextIndex = currentIndex + 1;

      // Skip segments marked as skipped
      while (nextIndex < activeEvent.segments.length && activeEvent.segments[nextIndex].isSkipped) {
        nextIndex++;
      }

      if (nextIndex < activeEvent.segments.length) {
        loadSegment(nextIndex, autoStart);
      } else {
        // Event finished!
        timerEngine.pause();
        const updated = { ...activeEvent, status: 'COMPLETED' as const };
        updateActiveEvent(updated);
      }
    },
    [activeEvent, loadSegment, updateActiveEvent]
  );

  // Previous segment
  const prevSegment = useCallback(() => {
    if (!activeEvent) return;
    const currentIndex = timerEngine.getCurrentSegmentIndex();
    let prevIndex = currentIndex - 1;

    while (prevIndex >= 0 && activeEvent.segments[prevIndex].isSkipped) {
      prevIndex--;
    }

    if (prevIndex >= 0) {
      loadSegment(prevIndex, false);
    }
  }, [activeEvent, loadSegment]);

  // Skip current segment
  const skipCurrentSegment = useCallback(() => {
    if (!activeEvent) return;
    const currentIndex = timerEngine.getCurrentSegmentIndex();
    const current = activeEvent.segments[currentIndex];
    if (!current) return;

    const updatedSegments = activeEvent.segments.map((seg, idx) => {
      if (idx === currentIndex) {
        return { ...seg, isSkipped: true };
      }
      return seg;
    });

    const updated = { ...activeEvent, segments: updatedSegments };
    updateActiveEvent(updated);
    nextSegment(false);
  }, [activeEvent, nextSegment, updateActiveEvent]);

  // Switch scenario (Normal, Short, Emergency)
  const switchScenario = useCallback(
    (scenario: EventScenario) => {
      if (!activeEvent) return;
      const currentIndex = timerEngine.getCurrentSegmentIndex();

      let reductionFactor = 1.0;
      if (scenario === 'SHORT') {
        reductionFactor = 1 - (activeEvent.scenarioAdjustments?.shortReductionPercent || 15) / 100;
      } else if (scenario === 'EMERGENCY') {
        reductionFactor = 1 - (activeEvent.scenarioAdjustments?.emergencyReductionPercent || 35) / 100;
      }

      // Adjust remaining uncompleted segments
      const updatedSegments = activeEvent.segments.map((seg, idx) => {
        if (idx < currentIndex || seg.isSkipped) return seg;
        // Don't reduce below 60 seconds
        const newDuration = Math.max(60, Math.round((seg.plannedDurationSeconds * reductionFactor) / 30) * 30);
        return {
          ...seg,
          plannedDurationSeconds: newDuration,
        };
      });

      const updated = {
        ...activeEvent,
        activeScenario: scenario,
        segments: updatedSegments,
      };
      updateActiveEvent(updated);

      // If current segment was adjusted and not running, reload duration
      if (timerEngine.getState() === 'IDLE' && updatedSegments[currentIndex]) {
        timerEngine.loadSegment(updatedSegments[currentIndex], currentIndex, false);
      }
    },
    [activeEvent, updateActiveEvent]
  );

  // Add in-event note
  const addNote = useCallback(
    (text: string) => {
      if (!activeEvent || !text.trim()) return;
      const currentIndex = timerEngine.getCurrentSegmentIndex();
      const currentSegment = activeEvent.segments[currentIndex];
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newNote: EventNote = {
        id: `note-${Date.now()}`,
        eventId: activeEvent.id,
        timestamp: timeStr,
        segmentIndex: currentIndex,
        segmentName: currentSegment ? currentSegment.name : 'Event Note',
        text: text.trim(),
        createdAt: Date.now(),
      };

      const updated = db.addNote(newNote);
      setNotes(updated);
    },
    [activeEvent]
  );

  const deleteNote = useCallback(
    (noteId: string) => {
      if (!activeEvent) return;
      const updated = db.deleteNote(activeEvent.id, noteId);
      setNotes(updated);
    },
    [activeEvent]
  );

  // Complete and save to Event History (Time Capsule)
  const completeEventAndSaveHistory = useCallback((): EventHistoryRecord | null => {
    if (!activeEvent) return null;

    const currentIndex = timerEngine.getCurrentSegmentIndex();
    const finalSegmentActuals = {
      ...segmentActuals,
      [currentIndex]: timerEngine.getElapsedSeconds(),
    };

    let totalActualSeconds = 0;
    const segmentRecords: SegmentHistoryRecord[] = activeEvent.segments.map((seg, idx) => {
      const actual = finalSegmentActuals[idx] || (seg.isSkipped ? 0 : seg.plannedDurationSeconds);
      totalActualSeconds += actual;
      const overtime = Math.max(0, actual - seg.plannedDurationSeconds);
      const variance = actual - seg.plannedDurationSeconds;

      return {
        segmentId: seg.id,
        segmentName: seg.name,
        speaker: seg.speaker,
        category: seg.category,
        plannedDurationSeconds: seg.plannedDurationSeconds,
        actualDurationSeconds: actual,
        overtimeSeconds: overtime,
        isSkipped: seg.isSkipped,
        varianceSeconds: variance,
      };
    });

    const plannedTotal = activeEvent.totalPlannedDurationSeconds;
    const scheduleVariance = totalActualSeconds - plannedTotal;

    const historyRecord: EventHistoryRecord = {
      id: `hist-${Date.now()}`,
      eventId: activeEvent.id,
      eventName: activeEvent.name,
      date: activeEvent.date || new Date().toISOString().split('T')[0],
      startedAt: eventStartedTimestamp || Date.now() - totalActualSeconds * 1000,
      endedAt: Date.now(),
      plannedDurationSeconds: plannedTotal,
      actualDurationSeconds: totalActualSeconds,
      scheduleVarianceSeconds: scheduleVariance,
      segmentRecords,
      notes: [...notes],
    };

    db.saveHistoryRecord(historyRecord);

    const completedEvent = { ...activeEvent, status: 'COMPLETED' as const };
    updateActiveEvent(completedEvent);
    timerEngine.pause();

    return historyRecord;
  }, [activeEvent, eventStartedTimestamp, notes, segmentActuals, updateActiveEvent]);

  // Compute Schedule Variance and Planned vs Estimated finish
  const scheduleCalculations = useMemo(() => {
    if (!activeEvent || activeEvent.segments.length === 0) {
      return {
        originalPlannedFinish: '12:00 PM',
        estimatedFinish: '12:00 PM',
        scheduleVarianceSeconds: 0,
        varianceStatus: 'ON_SCHEDULE' as const,
        varianceText: 'ON SCHEDULE',
        totalElapsedSeconds: 0,
        totalPlannedSeconds: 0,
        timeBankRemainingSeconds: 0,
        timeBankTotalSeconds: 0,
      };
    }

    const currentIndex = timerEngine.getCurrentSegmentIndex();
    const currentElapsed = timerSnapshot.elapsedSeconds;

    // Cumulative planned time of past segments
    let pastPlanned = 0;
    let pastActual = 0;

    activeEvent.segments.forEach((seg, idx) => {
      if (idx < currentIndex) {
        if (!seg.isSkipped) {
          pastPlanned += seg.plannedDurationSeconds;
          pastActual += segmentActuals[idx] ?? seg.plannedDurationSeconds;
        }
      }
    });

    // Current segment
    const currentPlanned = activeEvent.segments[currentIndex]
      ? activeEvent.segments[currentIndex].plannedDurationSeconds
      : 0;

    // Schedule variance = (actual time spent so far) - (planned time so far)
    // If currentElapsed > currentPlanned, variance is positive (behind)
    const cumulativePlannedSoFar = pastPlanned + currentPlanned;
    const cumulativeActualSoFar = pastActual + currentElapsed;
    const scheduleVarianceSeconds = cumulativeActualSoFar - cumulativePlannedSoFar;

    const origFinish = calculatePlannedFinishTime(
      activeEvent.startTime,
      activeEvent.totalPlannedDurationSeconds
    );

    const estFinish = calculateEstimatedFinishTime(origFinish, scheduleVarianceSeconds);
    const varianceInfo = formatVarianceText(scheduleVarianceSeconds);

    // Time Bank: Total event planned time vs total elapsed
    const timeBankTotalSeconds = activeEvent.totalPlannedDurationSeconds;
    const totalElapsedSeconds = pastActual + currentElapsed;
    const timeBankRemainingSeconds = Math.max(0, timeBankTotalSeconds - totalElapsedSeconds);

    return {
      originalPlannedFinish: origFinish,
      estimatedFinish: estFinish,
      scheduleVarianceSeconds,
      varianceStatus: varianceInfo.status,
      varianceText: varianceInfo.text,
      totalElapsedSeconds,
      totalPlannedSeconds: timeBankTotalSeconds,
      timeBankRemainingSeconds,
      timeBankTotalSeconds,
    };
  }, [activeEvent, segmentActuals, timerSnapshot.elapsedSeconds]);

  // Smart Compensation Proposal
  const compensationProposal = useMemo<CompensationProposal | null>(() => {
    if (!activeEvent) return null;
    return calculateScheduleCompensation(
      activeEvent,
      timerEngine.getCurrentSegmentIndex(),
      scheduleCalculations.scheduleVarianceSeconds
    );
  }, [activeEvent, scheduleCalculations.scheduleVarianceSeconds]);

  // Apply compensation
  const applyCompensation = useCallback(() => {
    if (!activeEvent || !compensationProposal) return;
    const compensated = applyCompensationToEvent(activeEvent, compensationProposal);
    updateActiveEvent(compensated);
    // Update timer engine planned duration for current segment
    const currIndex = timerEngine.getCurrentSegmentIndex();
    if (compensated.segments[currIndex]) {
      const newDuration = compensated.segments[currIndex].plannedDurationSeconds;
      timerEngine.adjustTime(newDuration - timerEngine.getPlannedDurationSeconds());
    }
  }, [activeEvent, compensationProposal, updateActiveEvent]);

  // Save settings
  const updateSettings = useCallback((newSettings: AppSettings) => {
    db.saveSettings(newSettings);
    setSettings(newSettings);
    timerEngine.setSoundEnabled(newSettings.alerts.soundEnabled);
  }, []);

  return {
    activeEvent,
    settings,
    timerSnapshot,
    notes,
    scheduleCalculations,
    compensationProposal,
    selectEvent,
    updateActiveEvent,
    loadSegment,
    nextSegment,
    prevSegment,
    skipCurrentSegment,
    switchScenario,
    addNote,
    deleteNote,
    applyCompensation,
    completeEventAndSaveHistory,
    updateSettings,
  };
}
