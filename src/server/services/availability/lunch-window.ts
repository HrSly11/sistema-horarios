import { SCHEDULING_CONFIG } from './config';

/**
 * Determines if a lunch break is required based on consecutive morning hours.
 *
 * Rule: If a docente has >= `umbralAlmuerzo` (default: 4) continuous hours
 * scheduled before 12:00, the system blocks 12:00-13:00 or 13:00-14:00.
 *
 * @param scheduledHoras - Array of horaInicio strings already assigned to the docente on a given day
 * @returns Array of hora strings that should be blocked for lunch (e.g., ['12:00'] or ['13:00'])
 */
export function getLunchBlockedHoras(scheduledHoras: string[]): string[] {
  if (scheduledHoras.length === 0) return [];

  // Sort and find continuous morning blocks (before 12:00)
  const morningHoras = scheduledHoras
    .filter((h) => h < '12:00')
    .sort();

  if (morningHoras.length < SCHEDULING_CONFIG.umbralAlmuerzo) return [];

  // Check if they are continuous
  const continuousCount = countContinuousHours(morningHoras);

  if (continuousCount < SCHEDULING_CONFIG.umbralAlmuerzo) return [];

  // Block both lunch window options
  // If 12:00 is already occupied, block 13:00 instead (and vice versa)
  const has12 = scheduledHoras.includes('12:00');
  const has13 = scheduledHoras.includes('13:00');

  if (!has12) return ['12:00'];
  if (!has13) return ['13:00'];

  // Both occupied — nothing to block (unusual case)
  return [];
}

/**
 * Counts the longest run of continuous hours in a sorted array.
 * Hours are continuous if they increment by 1 hour each.
 */
function countContinuousHours(sortedHoras: string[]): number {
  if (sortedHoras.length === 0) return 0;

  let maxRun = 1;
  let currentRun = 1;

  for (let i = 1; i < sortedHoras.length; i++) {
    const prevHour = parseInt(sortedHoras[i - 1].split(':')[0], 10);
    const currHour = parseInt(sortedHoras[i].split(':')[0], 10);

    if (currHour === prevHour + 1) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 1;
    }
  }

  return maxRun;
}
