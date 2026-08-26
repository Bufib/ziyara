import AsyncStorage from '@react-native-async-storage/async-storage';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useBookmarks } from '@/features/storage/useBookmarks';
import { useReaderPreferences } from '@/features/storage/useReaderPreferences';

const actEnvironmentGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalActEnvironment = actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT;
let renderer: ReactTestRenderer | null;
let storageState: {
  bookmarks: string[];
  lineByLine: boolean;
  scale: number;
  setLineByLine: (value: boolean) => void;
  setScale: (value: number) => void;
  toggleBookmark: (key: string) => void;
} | null;

function StorageProbe() {
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { preferences, setArabicFontScale, setLineByLine } = useReaderPreferences();

  useEffect(() => {
    storageState = {
      bookmarks,
      lineByLine: preferences.lineByLine,
      scale: preferences.arabicFontScale,
      setLineByLine,
      setScale: setArabicFontScale,
      toggleBookmark,
    };
  }, [
    bookmarks,
    preferences.arabicFontScale,
    preferences.lineByLine,
    setArabicFontScale,
    setLineByLine,
    toggleBookmark,
  ]);

  return null;
}

function getStorageState() {
  if (!storageState) {
    throw new Error('Der lokale Speicherzustand wurde noch nicht gerendert.');
  }

  return storageState;
}

describe('offline storage', () => {
  beforeAll(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(async () => {
    renderer = null;
    storageState = null;
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer?.unmount());
    }
  });

  afterAll(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  });

  it('speichert Lesezeichen und Reader-Einstellungen ausschließlich lokal', async () => {
    await act(async () => {
      renderer = create(<StorageProbe />);
      await Promise.resolve();
    });

    await act(async () => {
      getStorageState().toggleBookmark('place:shrine-imam-hussain');
      getStorageState().setScale(1.3);
      getStorageState().setLineByLine(false);
      await Promise.resolve();
    });

    expect(getStorageState()).toMatchObject({
      bookmarks: ['place:shrine-imam-hussain'],
      lineByLine: false,
      scale: 1.3,
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'ziyara.bookmarks',
      JSON.stringify(['place:shrine-imam-hussain']),
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'ziyara.reader.preferences',
      JSON.stringify({ arabicFontScale: 1.3, lineByLine: false }),
    );
  });
});
