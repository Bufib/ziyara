import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { BottomTabInset, Colors, Spacing } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { BusManagementProvider } from '@/features/bus-management/bus-management-context';
import { DailyProgramProvider } from '@/features/daily-program/daily-program-context';
import { AppErrorBoundary } from '@/features/errors/AppErrorBoundary';
import { GroupCheckProvider, useGroupCheck } from '@/features/group-check/group-check-context';
import { GeneralAlarmNotificationsProvider } from '@/features/general-alarm/general-alarm-notifications-context';
import { AppI18nProvider, useI18n } from '@/features/i18n/i18n';
import { supabaseReadFailureTranslationKey } from '@/features/network/supabase-read';
import { QuestionRoundProvider } from '@/features/question-round/question-round-context';
import { AppThemeProvider, useThemeMode } from '@/features/theme/theme-mode';
import { TripGuidanceProvider } from '@/features/trip-guidance/trip-guidance-context';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <AppI18nProvider>
        <AppThemeProvider>
          <AuthProvider>
            <BusManagementProvider>
              <DailyProgramProvider>
                <GeneralAlarmNotificationsProvider>
                  <TripGuidanceProvider>
                    <GroupCheckProvider>
                      <QuestionRoundProvider>
                        <RootNavigation />
                      </QuestionRoundProvider>
                    </GroupCheckProvider>
                  </TripGuidanceProvider>
                </GeneralAlarmNotificationsProvider>
              </DailyProgramProvider>
            </BusManagementProvider>
          </AuthProvider>
        </AppThemeProvider>
      </AppI18nProvider>
    </AppErrorBoundary>
  );
}

function RootNavigation() {
  const { loaded: isThemeLoaded, resolvedTheme: scheme } = useThemeMode();
  const colors = Colors[scheme];
  const { loaded: isLanguageLoaded, t } = useI18n();
  const { profileSyncErrorKind, refreshProfile } = useAuth();
  const { isBlocking } = useGroupCheck();

  useEffect(() => {
    if (isLanguageLoaded && isThemeLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLanguageLoaded, isThemeLoaded]);

  if (!isLanguageLoaded || !isThemeLoaded) {
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
          <Stack.Screen
            name="login"
            options={{ headerShown: false, title: t('auth.loginTitle') }}
          />
          <Stack.Screen
            name="register"
            options={{ headerShown: false, title: t('auth.registerTitle') }}
          />
          <Stack.Screen
            name="forgot-password"
            options={{ title: t('nav.forgotPassword') }}
          />
          <Stack.Screen
            name="reset-password"
            options={{ title: t('nav.resetPassword') }}
          />

          <Stack.Protected guard={!isBlocking}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t('nav.home') }} />
            <Stack.Screen name="city/[city]" options={{ title: t('nav.city') }} />
            <Stack.Screen name="place/[slug]" options={{ title: t('nav.placeDetails') }} />
            <Stack.Screen name="reader/[slug]" options={{ title: t('nav.reader') }} />
            <Stack.Screen name="about" options={{ title: t('nav.about') }} />
            <Stack.Screen name="account" options={{ title: t('nav.account') }} />
            <Stack.Screen name="bus" options={{ title: t('bus.navTitle') }} />
            <Stack.Screen name="guide" options={{ title: t('guide.navTitle') }} />
            <Stack.Screen name="sources" options={{ title: t('nav.sources') }} />
            <Stack.Screen
              name="question-round"
              options={{ title: t('questionRound.navTitle') }}
            />
          </Stack.Protected>

          <Stack.Screen
            name="check-in"
            options={{ headerShown: !isBlocking, title: t('groupCheck.navTitle') }}
          />
          <Stack.Screen name="admin" options={{ title: t('nav.admin') }} />
        </Stack>
      </NavigationThemeProvider>
      {profileSyncErrorKind ? (
        <View
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[
            styles.profileRefreshError,
            { backgroundColor: colors.warningSoft, borderColor: colors.warning },
          ]}>
          <ThemedText style={styles.profileRefreshErrorText} themeColor="warning" type="small">
            {t(supabaseReadFailureTranslationKey(profileSyncErrorKind))}
          </ThemedText>
          <Button
            icon="refresh"
            label={t('auth.profileRetry')}
            onPress={() => void refreshProfile()}
            variant="secondary"
          />
        </View>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  profileRefreshError: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: BottomTabInset + Spacing.three,
    flexDirection: 'row',
    gap: Spacing.two,
    left: Spacing.three,
    marginHorizontal: 'auto',
    maxWidth: 640,
    padding: Spacing.two,
    position: 'absolute',
    right: Spacing.three,
    zIndex: 10,
  },
  profileRefreshErrorText: {
    flex: 1,
  },
});
