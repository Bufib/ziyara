import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SymbolIcon } from '@/components/ui/symbol-icon';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useGroupCheck } from '@/features/group-check/group-check-context';
import { useI18n } from '@/features/i18n/i18n';
import { useTheme } from '@/hooks/use-theme';

export default function CheckInScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    activeCheck,
    currentResponse,
    hasSyncError,
    refresh,
    respond,
  } = useGroupCheck();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const submitAnswer = async (answer: boolean) => {
    if (!activeCheck || isSubmitting) {
      return;
    }

    setSubmitError(false);
    setIsSubmitting(true);

    try {
      const { error } = await respond(activeCheck.id, answer);
      setSubmitError(Boolean(error));
    } catch {
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!activeCheck) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.centeredContent}>
          {hasSyncError ? (
            <Card style={styles.statusCard}>
              <ThemedText type="heading">{t('groupCheck.syncErrorTitle')}</ThemedText>
              <ThemedText themeColor="textSecondary">{t('groupCheck.syncErrorBody')}</ThemedText>
              <Button
                icon="refresh"
                label={t('groupCheck.retry')}
                onPress={() => void refresh()}
              />
            </Card>
          ) : (
            <ActivityIndicator color={theme.accent} size="large" />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={[styles.statusDot, { backgroundColor: theme.warning }]} />
        <ThemedText type="smallBold" themeColor="warning">
          {t('groupCheck.activeLabel')}
        </ThemedText>

        <Card style={styles.questionCard}>
          <ThemedText type="title" style={styles.question}>
            {activeCheck.question}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            {t('groupCheck.userBody')}
          </ThemedText>

          <View style={styles.answers}>
            <AnswerButton
              answer
              disabled={isSubmitting}
              label={t('groupCheck.yes')}
              onPress={() => void submitAnswer(true)}
              selected={currentResponse === true}
            />
            <AnswerButton
              answer={false}
              disabled={isSubmitting}
              label={t('groupCheck.no')}
              onPress={() => void submitAnswer(false)}
              selected={currentResponse === false}
            />
          </View>

          {isSubmitting ? <ActivityIndicator color={theme.accent} /> : null}

          {submitError ? (
            <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
              {t('groupCheck.submitError')}
            </ThemedText>
          ) : currentResponse !== null ? (
            <ThemedText type="smallBold" themeColor="success" accessibilityLiveRegion="polite">
              {t('groupCheck.answerSaved')}
            </ThemedText>
          ) : null}
        </Card>

        <ThemedText type="small" themeColor="textSecondary" style={styles.waitingText}>
          {t('groupCheck.lockedBody')}
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

function AnswerButton({
  answer,
  disabled,
  label,
  onPress,
  selected,
}: {
  answer: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useTheme();
  const color = answer ? theme.success : theme.danger;
  const backgroundColor = answer ? theme.successSoft : theme.dangerSoft;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.answerButton,
        {
          backgroundColor,
          borderColor: color,
          borderWidth: selected ? 3 : StyleSheet.hairlineWidth,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <SymbolIcon color={color} name={answer ? 'confirm' : 'decline'} size={32} />
      <ThemedText type="heading" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centeredContent: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: '100%',
  },
  statusCard: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  statusDot: {
    borderRadius: 6,
    height: 12,
    marginBottom: Spacing.two,
    width: 12,
  },
  questionCard: {
    alignItems: 'stretch',
    gap: Spacing.four,
    marginTop: Spacing.three,
    padding: Spacing.four,
    width: '100%',
  },
  question: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
  answers: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  answerButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    gap: Spacing.two,
    justifyContent: 'center',
    minHeight: 120,
    padding: Spacing.three,
  },
  waitingText: {
    marginTop: Spacing.three,
    maxWidth: 520,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
});
