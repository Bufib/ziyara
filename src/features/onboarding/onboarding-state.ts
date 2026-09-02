import { useCallback, useMemo } from 'react';

import { createPersistentState } from '@/features/storage/persistentState';

export type OnboardingGateDecision = 'app' | 'loading' | 'onboarding';

export function parseOnboardingCompleted(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

export function getOnboardingGateDecision(
  loaded: boolean,
  hasCompletedOnboarding: boolean,
): OnboardingGateDecision {
  if (!loaded) {
    return 'loading';
  }

  return hasCompletedOnboarding ? 'app' : 'onboarding';
}

const useCompletedOnboardingState = createPersistentState<boolean>(
  'ziyara.onboarding.completed',
  false,
  parseOnboardingCompleted,
);

export function useOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding, loaded] =
    useCompletedOnboardingState();

  const completeOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true);
  }, [setHasCompletedOnboarding]);

  return useMemo(
    () => ({ completeOnboarding, hasCompletedOnboarding, loaded }),
    [completeOnboarding, hasCompletedOnboarding, loaded],
  );
}
