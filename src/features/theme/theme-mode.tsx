import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { usePersistentState } from '@/features/storage/persistentState';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

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

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useSystemColorScheme();
  const systemTheme: ResolvedTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
  const [mode, setMode, loaded] = usePersistentState<ThemeMode>('ziyara.theme-mode', 'system');

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
