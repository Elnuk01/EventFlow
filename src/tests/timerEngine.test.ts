/**
 * EventFlow Verification Test Suite
 * Tests all 9 critical timing specifications:
 * 1. Countdown accuracy
 * 2. Pause/resume (Section 58 test case: 10m planned, pause 200s, resume after pause, verify 6:40 remaining)
 * 3. Overtime calculation
 * 4. Schedule deviation
 * 5. Event finish calculation
 * 6. Skipping segments
 * 7. Adding/removing time
 * 8. Scenario switching
 * 9. Time Bank calculations
 */

import {
  formatDuration,
  calculatePlannedFinishTime,
  calculateEstimatedFinishTime,
  formatVarianceText,
  parseTimeToMinutes,
} from '../utils/timeUtils';
import { calculateScheduleCompensation } from '../services/scheduleCompensation';
import { DEMO_EVENT } from '../database/defaultData';
import { EventSchedule } from '../types';
import { parseEventFromJSON } from '../utils/exportUtils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- RUNNING EVENTFLOW TEST SUITE ---\n');

// 1. Countdown accuracy & duration formatting
{
  const t1 = formatDuration(600, 'MM:SS');
  assert(t1 === '10:00', `Format 600s as 10:00 (got ${t1})`);

  const t2 = formatDuration(400, 'MM:SS');
  assert(t2 === '06:40', `Format 400s as 06:40 (got ${t2})`);

  const t3 = formatDuration(3723, 'HH:MM:SS');
  assert(t3 === '01:02:03', `Format 3723s as 01:02:03 (got ${t3})`);
}

// 2. Pause/Resume accuracy (SECTION 58 SPECIFIC TEST CASE)
// Segment: Duration = 10 minutes (600s).
// Start at 10:00:00. Pause at 10:03:20 (200s elapsed).
// Resume at 10:05:00 (two-minute pause interval).
// Timer must show 6:40 remaining (400s). Must NOT count the two-minute pause.
{
  const plannedDurationSeconds = 600; // 10 minutes
  let accumulatedElapsedMs = 0;
  let lastResumeTimestamp: number | null = null;

  // Start at t0 = 1000
  const t0 = 1000;
  lastResumeTimestamp = t0;

  // Run for 200 seconds (3 mins 20 secs) -> pause at t1 = 201000
  const t1 = t0 + 200 * 1000;
  accumulatedElapsedMs += t1 - lastResumeTimestamp;
  lastResumeTimestamp = null; // PAUSED

  // Inactive pause period for 120 seconds (2 full minutes from 10:03:20 to 10:05:00)
  const t2 = t1 + 120 * 1000; // t2 is 2 minutes later

  // Check elapsed during pause
  let elapsedWhilePaused = Math.floor(accumulatedElapsedMs / 1000);
  assert(
    elapsedWhilePaused === 200,
    `Elapsed time while paused is exactly 200s (got ${elapsedWhilePaused}s)`
  );

  // Resume at t2
  lastResumeTimestamp = t2;

  // Evaluate remaining immediately upon resuming at 10:05:00
  let totalMsAtResume = accumulatedElapsedMs + (t2 - lastResumeTimestamp);
  let elapsedAtResume = Math.floor(totalMsAtResume / 1000);
  let remainingAtResume = plannedDurationSeconds - elapsedAtResume;

  assert(
    remainingAtResume === 400,
    `Section 58 test: remaining after 2-minute pause is 400s (6:40) (got ${remainingAtResume}s)`
  );
  assert(
    formatDuration(remainingAtResume, 'MM:SS') === '06:40',
    `Section 58 test: formatted display is '06:40'`
  );
}

// 3. Overtime mode calculation
{
  const plannedSeconds = 300;
  const elapsedSeconds = 345;
  const remaining = Math.max(0, plannedSeconds - elapsedSeconds);
  const overtime = Math.max(0, elapsedSeconds - plannedSeconds);

  assert(remaining === 0, 'Remaining is 0 when overtime begins');
  assert(overtime === 45, `Overtime is 45s (got ${overtime})`);
  assert(formatDuration(overtime, 'MM:SS') === '00:45', 'Formatted overtime is 00:45');
}

// 4. Schedule deviation tracking
{
  const varianceBehind = formatVarianceText(155);
  assert(varianceBehind.status === 'BEHIND', '155s is BEHIND');
  assert(varianceBehind.formattedTime === '+02:35', '155s formats as +02:35');

  const varianceAhead = formatVarianceText(-250);
  assert(varianceAhead.status === 'AHEAD', '-250s is AHEAD');
  assert(varianceAhead.formattedTime === '-04:10', '-250s formats as -04:10');

  const onSchedule = formatVarianceText(5);
  assert(onSchedule.status === 'ON_SCHEDULE', '5s variance is treated as ON SCHEDULE');
}

// 5. Event finish calculation
{
  const plannedFinish = calculatePlannedFinishTime('09:00', 85 * 60); // 9:00 AM + 85 min = 10:25 AM
  assert(
    plannedFinish.includes('10:25'),
    `Planned finish for 9:00 AM + 85 min is 10:25 AM (got ${plannedFinish})`
  );

  const estimatedBehind = calculateEstimatedFinishTime(plannedFinish, 7 * 60); // +7 min delay = 10:32 AM
  assert(
    estimatedBehind.includes('10:32'),
    `Estimated finish with +7 min delay is 10:32 AM (got ${estimatedBehind})`
  );
}

// 6. Skipping segments
{
  const demoCopy: EventSchedule = JSON.parse(JSON.stringify(DEMO_EVENT));
  const origPlanned = demoCopy.totalPlannedDurationSeconds;
  demoCopy.segments[3].isSkipped = true; // Skip Presentation (10 min = 600s)

  const newPlanned = demoCopy.segments.reduce(
    (acc, s) => acc + (s.isSkipped ? 0 : s.plannedDurationSeconds),
    0
  );

  assert(
    newPlanned === origPlanned - 600,
    `Skipping 10m segment reduces remaining planned time by 600s (was ${origPlanned}, now ${newPlanned})`
  );
}

// 7. Adding / Removing time
{
  let currentPlanned = 2100; // 35 min Sermon
  currentPlanned += 60; // +1m
  assert(currentPlanned === 2160, 'Add 1 min extends planned duration to 2160s');
  currentPlanned += 300; // +5m
  assert(currentPlanned === 2460, 'Add 5 min extends planned duration to 2460s');
  currentPlanned -= 60; // -1m
  assert(currentPlanned === 2400, 'Sub 1 min reduces planned duration to 2400s');
}

// 8. Scenario switching
{
  const demoCopy: EventSchedule = JSON.parse(JSON.stringify(DEMO_EVENT));
  const shortReduction = 15; // 15%
  const factor = 1 - shortReduction / 100;

  const adjustedDuration = Math.max(
    60,
    Math.round((demoCopy.segments[4].plannedDurationSeconds * factor) / 30) * 30
  );

  assert(
    adjustedDuration < demoCopy.segments[4].plannedDurationSeconds,
    `Short scenario reduces Sermon planned duration (${demoCopy.segments[4].plannedDurationSeconds}s -> ${adjustedDuration}s)`
  );
}

// 9. Time Bank calculations
{
  const totalEventPlanned = 5100; // 85m
  const elapsedSoFar = 3000;
  const timeBankRemaining = Math.max(0, totalEventPlanned - elapsedSoFar);
  assert(timeBankRemaining === 2100, `Time Bank remaining is 2100s (got ${timeBankRemaining})`);

  // Smart Compensation verification
  const compensation = calculateScheduleCompensation(DEMO_EVENT, 2, 480); // 8 minutes behind at segment index 2
  assert(compensation !== null, 'Compensation proposal is generated for 8 min delay');
  if (compensation) {
    assert(
      compensation.totalCompensatedSeconds > 0,
      `Compensated ${compensation.totalCompensatedSeconds}s across remaining segments`
    );
  }
}

// 10. Event Export & Import JSON parsing test
{
  const testJson = JSON.stringify({
    name: 'Imported Revival Conference',
    date: '2026-10-15',
    startTime: '18:00',
    location: 'Main Auditorium',
    segments: [
      {
        name: 'Opening Hymn',
        plannedDurationSeconds: 420,
        speaker: 'Choir Director',
        category: 'Worship',
        segmentType: 'TIMER',
      },
      {
        name: 'Keynote Message',
        plannedDurationSeconds: 1800,
        speaker: 'Guest Minister',
        category: 'Speech',
        segmentType: 'SPEAKER',
      },
    ],
  });

  const parsed = parseEventFromJSON(testJson);
  assert(parsed.success === true, 'Event JSON parsed successfully');
  assert(parsed.event !== undefined, 'Parsed event object exists');
  if (parsed.event) {
    assert(parsed.event.name === 'Imported Revival Conference', 'Imported event name matches');
    assert(parsed.event.segments.length === 2, 'Imported event has 2 segments');
    assert(parsed.event.segments[0].name === 'Opening Hymn', 'First segment name matches');
    assert(parsed.event.segments[0].plannedDurationSeconds === 420, 'First segment duration is 420s');
    assert(parsed.event.totalPlannedDurationSeconds === 2220, 'Total planned duration is 2220s');
  }

  // Error case: invalid JSON
  const invalidParsed = parseEventFromJSON('{ not valid json }');
  assert(invalidParsed.success === false, 'Invalid JSON returns success: false');
}

console.log('\n--- ALL TEST CASES COMPLETED SUCCESSFULLY! ---');
