import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { Spacing } from '@/constants/theme';
import { useDailyProgram } from '@/features/daily-program/daily-program-context';
import {
  localISODate,
  parseLocalISODate,
  visibleDailyPrograms,
} from '@/features/daily-program/daily-program-state';
import { useI18n } from '@/features/i18n/i18n';
import { supabaseReadFailureTranslationKey } from '@/features/network/supabase-read';
import { useTheme } from '@/hooks/use-theme';

export function DailyProgramHome() {
  const theme = useTheme();
  const { language, t } = useI18n();
  const { hasSyncError, isLoading, programs, refresh, syncErrorKind } = useDailyProgram();
  const today = localISODate();
  const visiblePrograms = visibleDailyPrograms(programs, today);

  if (isLoading) {
    return (
      <Section title={t('dailyProgram.homeTitle')}>
        <Card style={styles.stateCard}>
          <ActivityIndicator color={theme.accent} />
          <ThemedText themeColor="textSecondary">{t('dailyProgram.loading')}</ThemedText>
        </Card>
      </Section>
    );
  }

  if (hasSyncError) {
    return (
      <Section title={t('dailyProgram.homeTitle')}>
        <Card style={[styles.stateCard, { borderColor: theme.warning }]}>
          <ThemedText type="heading">{t('dailyProgram.syncErrorTitle')}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {t(supabaseReadFailureTranslationKey(syncErrorKind ?? 'server'))}
          </ThemedText>
          <Button
            icon="refresh"
            label={t('dailyProgram.retry')}
            onPress={() => void refresh()}
            variant="secondary"
          />
        </Card>
      </Section>
    );
  }

  if (visiblePrograms.length === 0) return null;

  return (
    <Section title={t('dailyProgram.homeTitle')}>
      <View style={styles.programList}>
        {visiblePrograms.map((program) => {
          const isToday = program.program_date === today;
          return (
            <Card
              key={program.id}
              style={[
                styles.programCard,
                isToday && {
                  backgroundColor: theme.accentSoft,
                  borderColor: theme.accent,
                },
              ]}>
              <ThemedText type="smallBold" themeColor={isToday ? 'accent' : 'textSecondary'}>
                {isToday
                  ? t('dailyProgram.today')
                  : formatProgramDate(program.program_date, language)}
              </ThemedText>
              {program.title ? <ThemedText type="heading">{program.title}</ThemedText> : null}
              <ThemedText style={styles.details}>{program.details}</ThemedText>
            </Card>
          );
        })}
      </View>
    </Section>
  );
}

function formatProgramDate(value: string, language: string) {
  const date = parseLocalISODate(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date);
}

const styles = StyleSheet.create({
  details: {
    lineHeight: 24,
  },
  programCard: {
    gap: Spacing.one,
  },
  programList: {
    gap: Spacing.two,
  },
  stateCard: {
    alignItems: 'center',
    gap: Spacing.two,
  },
});
