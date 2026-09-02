import { describe, expect, it } from '@jest/globals';

import {
  getOnboardingGateDecision,
  parseOnboardingCompleted,
} from '@/features/onboarding/onboarding-state';

describe('onboarding state', () => {
  it('akzeptiert ausschließlich persistierte Wahrheitswerte', () => {
    expect(parseOnboardingCompleted(true)).toBe(true);
    expect(parseOnboardingCompleted(false)).toBe(false);
    expect(parseOnboardingCompleted('true')).toBeUndefined();
    expect(parseOnboardingCompleted(null)).toBeUndefined();
  });

  it('wartet auf die Hydrierung, bevor eine Route gewählt wird', () => {
    expect(getOnboardingGateDecision(false, false)).toBe('loading');
    expect(getOnboardingGateDecision(false, true)).toBe('loading');
  });

  it('zeigt das Onboarding genau bis zu seinem Abschluss', () => {
    expect(getOnboardingGateDecision(true, false)).toBe('onboarding');
    expect(getOnboardingGateDecision(true, true)).toBe('app');
  });
});
