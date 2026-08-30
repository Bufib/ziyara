import { describe, expect, it } from '@jest/globals';

import {
  getLuggageCount,
  maximumLuggageCount,
  minimumLuggageCount,
} from '@/features/auth/luggage-count';

describe('getLuggageCount', () => {
  it('accepts whole suitcase counts inside the supported range', () => {
    expect(getLuggageCount(String(minimumLuggageCount))).toBe(0);
    expect(getLuggageCount('4')).toBe(4);
    expect(getLuggageCount(String(maximumLuggageCount))).toBe(50);
  });

  it('rejects empty, fractional and out-of-range values', () => {
    expect(getLuggageCount('')).toBeNull();
    expect(getLuggageCount('-1')).toBeNull();
    expect(getLuggageCount('1.5')).toBeNull();
    expect(getLuggageCount('51')).toBeNull();
  });
});
