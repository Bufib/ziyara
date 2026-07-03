import { useCallback } from 'react';

import { usePersistentState } from '@/features/storage/persistentState';

type ReadingPositions = Record<string, number>;

export function useReadingPosition() {
  const [positions, setPositions] = usePersistentState<ReadingPositions>(
    'ziyara.reader.positions',
    {},
  );

  const saveReadingPosition = useCallback(
    (slug: string, offset: number) => {
      setPositions((current) => ({ ...current, [slug]: offset }));
    },
    [setPositions],
  );

  return { positions, saveReadingPosition };
}
