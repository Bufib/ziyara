import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { Appearance, Platform, useColorScheme as useSystemColorScheme } from 'react-native';

import { createPersistentState } from '@/features/storage/persistentState';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const useThemeModeState = createPersistentState<ThemeMode>(
  'ziyara.theme-mode',
  'system',
  (value) => (value === 'system' || value === 'light' || value === 'dark' ? value : undefined),
);

type ThemeModeContextValue = {
  loaded: boolean;
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue>({
  loaded: false,
  mode: 'system',
  resolvedTheme: 'light',
  setMode: () => undefined,
});

function resolveTheme(mode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme {
  return mode === 'system' ? systemTheme : mode;
}

function nativeColorScheme(mode: ThemeMode) {
  return mode === 'system' ? 'unspecified' : mode;
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useSystemColorScheme();
  const systemTheme: ResolvedTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
  const [mode, setStoredMode, loaded] = useThemeModeState();
  const nativeModeRef = useRef<ThemeMode | null>(null);

  const syncNativeMode = useCallback((nextMode: ThemeMode) => {
    if (Platform.OS === 'web' || nativeModeRef.current === nextMode) {
      return;
    }

    Appearance.setColorScheme(nativeColorScheme(nextMode));
    nativeModeRef.current = nextMode;
  }, []);

  const setMode = useCallback(
    (nextMode: ThemeMode) => {
      // Native navigation controls read the app-level interface style. Apply it
      // before updating React so both layers change during the same interaction.
      syncNativeMode(nextMode);
      setStoredMode(nextMode);
    },
    [setStoredMode, syncNativeMode],
  );

  useLayoutEffect(() => {
    syncNativeMode(mode);
  }, [mode, syncNativeMode]);

  const value = useMemo(
    () => ({
      loaded,
      mode,
      resolvedTheme: resolveTheme(mode, systemTheme),
      setMode,
    }),
    [loaded, mode, setMode, systemTheme],
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

export function useResolvedTheme() {
  return useThemeMode().resolvedTheme;
}
