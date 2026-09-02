import { describe, expect, it } from '@jest/globals';

import {
  getSimCardCount,
  maximumSimCardCount,
  minimumSimCardCount,
} from '@/features/auth/sim-card-count';

describe('getSimCardCount', () => {
  it('accepts whole SIM-card counts inside the supported range', () => {
    expect(getSimCardCount(String(minimumSimCardCount))).toBe(0);
    expect(getSimCardCount('4')).toBe(4);
    expect(getSimCardCount(String(maximumSimCardCount))).toBe(50);
  });

  it('rejects empty, fractional and out-of-range values', () => {
    expect(getSimCardCount('')).toBeNull();
    expect(getSimCardCount('-1')).toBeNull();
    expect(getSimCardCount('1.5')).toBeNull();
    expect(getSimCardCount('51')).toBeNull();
  });
});
