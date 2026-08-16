import { useCallback } from 'react';

import { createPersistentState } from '@/features/storage/persistentState';

type ReaderPreferences = {
  arabicFontScale: number;
  lineByLine: boolean;
};

const defaultPreferences: ReaderPreferences = {
  arabicFontScale: 1,
  lineByLine: true,
};

const useReaderPreferencesState = createPersistentState(
  'ziyara.reader.preferences',
  defaultPreferences,
  (value) => {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    const candidate = value as Partial<ReaderPreferences>;

    if (
      typeof candidate.arabicFontScale !== 'number' ||
      !Number.isFinite(candidate.arabicFontScale) ||
      typeof candidate.lineByLine !== 'boolean'
    ) {
      return undefined;
    }

    return {
      arabicFontScale: Math.min(1.6, Math.max(0.85, candidate.arabicFontScale)),
      lineByLine: candidate.lineByLine,
    };
  },
);

export function useReaderPreferences() {
  const [preferences, setPreferences] = useReaderPreferencesState();

  const setArabicFontScale = useCallback(
    (arabicFontScale: number) => {
      setPreferences((current) => ({ ...current, arabicFontScale }));
    },
    [setPreferences],
  );

  const setLineByLine = useCallback(
    (lineByLine: boolean) => {
      setPreferences((current) => ({ ...current, lineByLine }));
    },
    [setPreferences],
  );

  return { preferences, setArabicFontScale, setLineByLine };
}
