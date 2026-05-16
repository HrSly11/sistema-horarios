import { SCHEDULING_CONFIG } from './config';

/**
 * Checks if adding a new hora to a docente's schedule on a given day
 * would exceed the maximum continuous hours limit.
 *
 * @param scheduledHoras - Already assigned horaInicio strings for the docente on this day
 * @param newHora - The candidate horaInicio string to add
 * @returns true if adding newHora would EXCEED the max continuous hours limit
 */
export function wouldExceedContinuousHours(
  scheduledHoras: string[],
  newHora: string
): boolean {
  const allHoras = [...scheduledHoras, newHora].sort();
  const maxRun = getLongestContinuousRun(allHoras);
  return maxRun > SCHEDULING_CONFIG.maxHorasContinuasDia;
}

/**
 * Finds the longest continuous run of hours in a sorted array.
 */
export function getLongestContinuousRun(sortedHoras: string[]): number {
  if (sortedHoras.length <= 1) return sortedHoras.length;

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
