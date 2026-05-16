import { describe, it, expect } from 'vitest';
import { wouldExceedContinuousHours, getLongestContinuousRun } from './continuous-hours';

describe('getLongestContinuousRun', () => {
  it('returns 0 for empty array', () => {
    expect(getLongestContinuousRun([])).toBe(0);
  });

  it('returns 1 for single hour', () => {
    expect(getLongestContinuousRun(['10:00'])).toBe(1);
  });

  it('counts 3 continuous hours', () => {
    expect(getLongestContinuousRun(['07:00', '08:00', '09:00'])).toBe(3);
  });

  it('handles gap — returns longest run', () => {
    // Two runs: 07-09 (3) and 14-16 (3)
    expect(getLongestContinuousRun(['07:00', '08:00', '09:00', '14:00', '15:00', '16:00'])).toBe(3);
  });

  it('handles single longer run', () => {
    expect(getLongestContinuousRun(['07:00', '08:00', '09:00', '10:00', '11:00'])).toBe(5);
  });
});

describe('wouldExceedContinuousHours', () => {
  it('returns false when adding first hour', () => {
    expect(wouldExceedContinuousHours([], '10:00')).toBe(false);
  });

  it('returns false for 7 continuous hours (below limit)', () => {
    const scheduled = ['07:00', '08:00', '09:00', '10:00', '11:00', '13:00'];
    expect(wouldExceedContinuousHours(scheduled, '14:00')).toBe(false);
  });

  it('returns false for exactly 8 continuous hours (at limit, allowed)', () => {
    const scheduled = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00'];
    expect(wouldExceedContinuousHours(scheduled, '14:00')).toBe(false);
  });

  it('returns true when adding would create 9 continuous hours', () => {
    const scheduled = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
    expect(wouldExceedContinuousHours(scheduled, '15:00')).toBe(true);
  });

  it('returns false when new hour is not adjacent to existing run', () => {
    const scheduled = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00'];
    // 7 continuous, adding 20:00 doesn't extend the run
    expect(wouldExceedContinuousHours(scheduled, '20:00')).toBe(false);
  });
});
