import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { AppI18nProvider, useI18n } from '@/features/i18n/i18n';
import { AppThemeProvider, useResolvedTheme } from '@/features/theme/theme-mode';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <AppI18nProvider>
      <AppThemeProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </AppThemeProvider>
    </AppI18nProvider>
  );
}

function RootNavigation() {
  const scheme = useResolvedTheme();
  const colors = Colors[scheme];
  const { t } = useI18n();
  const { isLoading, session } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerBackTitle: '',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="login" options={{ headerShown: false, title: t('auth.loginTitle') }} />
            <Stack.Screen
              name="register"
              options={{ headerShown: false, title: t('auth.registerTitle') }}
            />
          </Stack.Protected>

          <Stack.Protected guard={Boolean(session)}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('nav.home') }} />
            <Stack.Screen name="city/[city]" options={{ title: t('nav.city') }} />
            <Stack.Screen name="place/[slug]" options={{ title: t('nav.placeDetails') }} />
            <Stack.Screen name="reader/[slug]" options={{ title: t('nav.reader') }} />
            <Stack.Screen name="about" options={{ title: t('nav.about') }} />
            <Stack.Screen name="sources" options={{ title: t('nav.sources') }} />
            <Stack.Screen name="disclaimer" options={{ title: t('nav.disclaimer') }} />
          </Stack.Protected>
        </Stack>
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}
