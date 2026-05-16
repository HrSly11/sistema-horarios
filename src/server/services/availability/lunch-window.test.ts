import { describe, it, expect } from 'vitest';
import { getLunchBlockedHoras } from './lunch-window';

describe('getLunchBlockedHoras', () => {
  it('returns empty when no hours are scheduled', () => {
    expect(getLunchBlockedHoras([])).toEqual([]);
  });

  it('returns empty when less than 4 morning hours', () => {
    expect(getLunchBlockedHoras(['07:00', '08:00', '09:00'])).toEqual([]);
  });

  it('blocks 12:00 when 4+ continuous morning hours', () => {
    expect(getLunchBlockedHoras(['07:00', '08:00', '09:00', '10:00'])).toEqual(['12:00']);
  });

  it('blocks 12:00 when 5 continuous morning hours', () => {
    expect(getLunchBlockedHoras(['07:00', '08:00', '09:00', '10:00', '11:00'])).toEqual(['12:00']);
  });

  it('blocks 13:00 when 12:00 is already occupied', () => {
    expect(getLunchBlockedHoras(['07:00', '08:00', '09:00', '10:00', '12:00'])).toEqual(['13:00']);
  });

  it('returns empty when morning hours are NOT continuous', () => {
    // 4 hours but not continuous (gap at 09:00)
    expect(getLunchBlockedHoras(['07:00', '08:00', '10:00', '11:00'])).toEqual([]);
  });

  it('does not count afternoon hours toward the threshold', () => {
    expect(getLunchBlockedHoras(['07:00', '08:00', '14:00', '15:00'])).toEqual([]);
  });
});
