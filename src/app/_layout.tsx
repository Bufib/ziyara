import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { AppThemeProvider, useResolvedTheme } from '@/features/theme/theme-mode';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootNavigation />
    </AppThemeProvider>
  );
}

function RootNavigation() {
  const scheme = useResolvedTheme();
  const colors = Colors[scheme];

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="city/[city]" options={{ title: 'Stadt' }} />
          <Stack.Screen name="place/[slug]" options={{ title: 'Ortsdetails' }} />
          <Stack.Screen name="reader/[slug]" options={{ title: 'Lesemodus' }} />
          <Stack.Screen name="about" options={{ title: 'Über die App' }} />
          <Stack.Screen name="sources" options={{ title: 'Quellen' }} />
          <Stack.Screen name="disclaimer" options={{ title: 'Inhaltlicher Hinweis' }} />
        </Stack>
      </NavigationThemeProvider>
    </GestureHandlerRootView>
  );
}
