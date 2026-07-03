import { useCallback } from 'react';

import { usePersistentState } from '@/features/storage/persistentState';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = usePersistentState<string[]>('ziyara.bookmarks', []);

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
