import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { languageOptions, useI18n } from '@/features/i18n/i18n';
import { useReaderPreferences } from '@/features/storage/useReaderPreferences';
import { useThemeMode, type ThemeMode } from '@/features/theme/theme-mode';
import { useTheme } from '@/hooks/use-theme';

const themeModeOptions: ThemeMode[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const theme = useTheme();
  const { mode, resolvedTheme, setMode } = useThemeMode();
  const { language, setLanguage, t } = useI18n();
  const { preferences, setArabicFontScale, setLineByLine } = useReaderPreferences();

  return (
    <Screen>
      <Section title={t('settings.appearance')}>
        <ThemedView type="surface" style={[styles.panel, { borderColor: theme.border }]}>
          <View style={styles.rowText}>
            <ThemedText type="smallBold">{t('settings.themeTitle')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('settings.themeBody')}
            </ThemedText>
          </View>

          <View style={styles.segmentedControl}>
            {themeModeOptions.map((option) => {
              const selected = mode === option;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={option}
                  onPress={() => setMode(option)}
                  style={({ pressed }) => [
                    styles.segment,
                    {
                      backgroundColor: selected ? theme.accent : theme.backgroundElement,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={selected && { color: theme.background }}>
                    {t(`settings.theme.${option}`)}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {t('settings.activeMode', {
              mode: resolvedTheme === 'dark' ? t('settings.darkBlue') : t('settings.light'),
            })}
          </ThemedText>
        </ThemedView>
      </Section>

      <Section title={t('settings.languageTitle')}>
        <ThemedView type="surface" style={[styles.panel, { borderColor: theme.border }]}>
          <View style={styles.rowText}>
            <ThemedText type="smallBold">{t('settings.languageTitle')}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {t('settings.languageBody')}
            </ThemedText>
          </View>

          <View style={styles.segmentedControl}>
            {languageOptions.map((option) => {
              const selected = language === option.value;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={option.value}
                  onPress={() => setLanguage(option.value)}
                  style={({ pressed }) => [
                    styles.segment,
                    {
                      backgroundColor: selected ? theme.accent : theme.backgroundElement,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={selected && { color: theme.background }}>
                    {option.nativeLabel}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>
      </Section>

      <Section title={t('settings.reader')}>
        <ThemedView type="surface" style={[styles.panel, { borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">{t('settings.arabicFontTitle')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('settings.arabicFontBody')}
              </ThemedText>
            </View>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setArabicFontScale(Math.max(0.85, preferences.arabicFontScale - 0.1))}
                style={[styles.stepButton, { borderColor: theme.border }]}>
                <ThemedText type="heading">-</ThemedText>
              </Pressable>
              <ThemedText type="smallBold">{Math.round(preferences.arabicFontScale * 100)}%</ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setArabicFontScale(Math.min(1.6, preferences.arabicFontScale + 0.1))}
                style={[styles.stepButton, { borderColor: theme.border }]}>
                <ThemedText type="heading">+</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">{t('settings.lineByLineTitle')}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('settings.lineByLineBody')}
              </ThemedText>
            </View>
            <Switch
              onValueChange={setLineByLine}
              thumbColor={preferences.lineByLine ? theme.accent : theme.textSecondary}
              value={preferences.lineByLine}
            />
          </View>
        </ThemedView>
      </Section>

      <Section title={t('settings.appPrep')}>
        <View style={styles.actions}>
          <Button icon="info" label={t('common.disclaimer')} onPress={() => router.push('/disclaimer')} />
          <Button
            icon="book"
            label={t('common.sources')}
            variant="secondary"
            onPress={() => router.push('/sources')}
          />
          <Button
            icon="settings"
            label={t('common.aboutApp')}
            variant="secondary"
            onPress={() => router.push('/about')}
          />
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stepButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  actions: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
  segmentedControl: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  segment: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 92,
    paddingHorizontal: Spacing.three,
  },
});
