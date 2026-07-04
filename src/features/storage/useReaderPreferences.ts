import { useCallback } from 'react';

import { usePersistentState } from '@/features/storage/persistentState';

type ReaderPreferences = {
  arabicFontScale: number;
  lineByLine: boolean;
};

const defaultPreferences: ReaderPreferences = {
  arabicFontScale: 1,
  lineByLine: true,
};

export function useReaderPreferences() {
  const [preferences, setPreferences] = usePersistentState<ReaderPreferences>(
    'ziyara.reader.preferences',
    defaultPreferences,
  );

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
