import { useCallback } from 'react';

import { createPersistentState } from '@/features/storage/persistentState';

const bookmarkAliases: Record<string, string> = {
  'content:general-ziyarah-etiquette-placeholder': 'content:ziyarat-arbaeen-placeholder',
  'content:two-rakat-prayer-placeholder': 'content:dua-safwan-placeholder',
};

const useBookmarksState = createPersistentState<string[]>('ziyara.bookmarks', [], (value) =>
  Array.isArray(value) && value.every((item): item is string => typeof item === 'string')
    ? [...new Set(value.map((item) => bookmarkAliases[item] ?? item))]
    : undefined,
);

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useBookmarksState();

  const isBookmarked = useCallback(
    (key: string) => bookmarks.includes(key),
    [bookmarks],
  );

  const toggleBookmark = useCallback(
    (key: string) => {
      setBookmarks((current) =>
        current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
      );
    },
    [setBookmarks],
  );

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
  }, [setBookmarks]);

  return { bookmarks, clearBookmarks, isBookmarked, toggleBookmark };
}
