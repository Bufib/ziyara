import { router } from 'expo-router';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useReaderPreferences } from '@/features/storage/useReaderPreferences';
import { useThemeMode, type ThemeMode } from '@/features/theme/theme-mode';
import { useTheme } from '@/hooks/use-theme';

const themeOptions: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Hell', value: 'light' },
  { label: 'Dunkel', value: 'dark' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { mode, resolvedTheme, setMode } = useThemeMode();
  const { preferences, setArabicFontScale, setLineByLine } = useReaderPreferences();

  return (
    <Screen>
      <Section title="Darstellung">
        <ThemedView type="surface" style={[styles.panel, { borderColor: theme.border }]}>
          <View style={styles.rowText}>
            <ThemedText type="smallBold">Farbmodus</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Der Dunkelmodus nutzt ein ruhiges Dunkelblau statt reinem Schwarz.
            </ThemedText>
          </View>

          <View style={styles.segmentedControl}>
            {themeOptions.map((option) => {
              const selected = mode === option.value;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={option.value}
                  onPress={() => setMode(option.value)}
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
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Aktiver Modus: {resolvedTheme === 'dark' ? 'Dunkelblau' : 'Hell'}.
          </ThemedText>
        </ThemedView>
      </Section>

      <Section title="Lesemodus">
        <ThemedView type="surface" style={[styles.panel, { borderColor: theme.border }]}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">Arabische Schriftgröße</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Gilt für Platzhalter und geprüfte arabische Inhalte.
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
              <ThemedText type="smallBold">Zeilenweise Ansicht</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Gruppiert Arabisch, Transliteration und Übersetzung.
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

      <Section title="App-Vorbereitung">
        <View style={styles.actions}>
          <Button icon="info" label="Inhaltlicher Hinweis" onPress={() => router.push('/disclaimer')} />
          <Button
            icon="book"
            label="Quellen"
            variant="secondary"
            onPress={() => router.push('/sources')}
          />
          <Button
            icon="settings"
            label="Über die App"
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
