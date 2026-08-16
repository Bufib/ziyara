import { useCallback } from 'react';

import { createPersistentState } from '@/features/storage/persistentState';

type ReadingPositions = Record<string, number>;

const useReadingPositionsState = createPersistentState<ReadingPositions>(
  'ziyara.reader.positions',
  {},
  (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    const positions = Object.entries(value).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= 0,
    );

    return Object.fromEntries(positions);
  },
);

export function useReadingPosition() {
  const [positions, setPositions, loaded] = useReadingPositionsState();

  const saveReadingPosition = useCallback(
    (slug: string, offset: number) => {
      setPositions((current) => ({ ...current, [slug]: offset }));
    },
    [setPositions],
  );

  return { loaded, positions, saveReadingPosition };
}
