import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SymbolIcon } from '@/components/ui/symbol-icon';
import { Spacing } from '@/constants/theme';
import type { AnonymousQuestion, QuestionRound } from '@/domain/database';
import { supabase } from '@/features/auth/supabase';
import { useI18n } from '@/features/i18n/i18n';
import { useTheme } from '@/hooks/use-theme';

export function AdminQuestionRoundPanel() {
  const theme = useTheme();
  const { t } = useI18n();
  const [latestRound, setLatestRound] = useState<QuestionRound | null>(null);
  const [questions, setQuestions] = useState<AnonymousQuestion[]>([]);
  const [isLoadingRound, setIsLoadingRound] = useState(true);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [updatingQuestionId, setUpdatingQuestionId] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const roundId = latestRound?.id ?? null;
  const isOpen = Boolean(latestRound && !latestRound.closed_at);

  const loadLatestRound = useCallback(async () => {
    setIsLoadingRound(true);
    setHasError(false);

    try {
      const { data, error } = await supabase
        .from('question_rounds')
        .select('id, created_at, closed_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setLatestRound(data);
    } catch {
      setHasError(true);
    } finally {
      setIsLoadingRound(false);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    if (roundId === null) {
      return;
    }

    setIsLoadingQuestions(true);
    setHasError(false);

    try {
      const { data, error } = await supabase
        .from('anonymous_questions')
        .select('id, round_id, question, is_checked, created_at, checked_at')
        .eq('round_id', roundId)
        .order('is_checked', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      setQuestions(data ?? []);
    } catch {
      setHasError(true);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [roundId]);

  useEffect(() => {
    const initialLoadTimeout = setTimeout(() => void loadLatestRound(), 0);
    const channel = supabase
      .channel('admin-question-rounds')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'question_rounds' },
        () => void loadLatestRound(),
      )
      .subscribe();

    return () => {
      clearTimeout(initialLoadTimeout);
      void supabase.removeChannel(channel);
    };
  }, [loadLatestRound]);

  useEffect(() => {
    if (roundId === null) {
      return;
    }

    const initialLoadTimeout = setTimeout(() => void loadQuestions(), 0);
    const channel = supabase
      .channel(`admin-anonymous-questions:${roundId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `round_id=eq.${roundId}`,
          schema: 'public',
          table: 'anonymous_questions',
        },
        () => void loadQuestions(),
      )
      .subscribe();

    return () => {
      clearTimeout(initialLoadTimeout);
      void supabase.removeChannel(channel);
    };
  }, [loadQuestions, roundId]);

  const openRound = async () => {
    if (isWorking) {
      return;
    }

    setIsWorking(true);
    setHasError(false);

    try {
      const { error } = await supabase.rpc('open_question_round');

      if (error) {
        throw error;
      }

      await loadLatestRound();
    } catch {
      setHasError(true);
    } finally {
      setIsWorking(false);
    }
  };

  const closeRound = async () => {
    if (!latestRound || !isOpen || isWorking) {
      return;
    }

    setIsWorking(true);
    setHasError(false);

    try {
      const { error } = await supabase.rpc('close_question_round', {
        p_round_id: latestRound.id,
      });

      if (error) {
        throw error;
      }

      await loadLatestRound();
    } catch {
      setHasError(true);
    } finally {
      setIsWorking(false);
    }
  };

  const toggleQuestion = async (question: AnonymousQuestion) => {
    if (updatingQuestionId !== null) {
      return;
    }

    setUpdatingQuestionId(question.id);
    setHasError(false);

    try {
      const { error } = await supabase.rpc('set_anonymous_question_checked', {
        p_is_checked: !question.is_checked,
        p_question_id: question.id,
      });

      if (error) {
        throw error;
      }

      await loadQuestions();
    } catch {
      setHasError(true);
    } finally {
      setUpdatingQuestionId(null);
    }
  };

  return (
    <Card style={styles.panel}>
      <View style={styles.headingBlock}>
        <ThemedText type="heading">{t('questionRound.adminTitle')}</ThemedText>
        <ThemedText themeColor="textSecondary">{t('questionRound.adminBody')}</ThemedText>
      </View>

      {isLoadingRound ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <>
          {latestRound ? (
            <View
              style={[
                styles.status,
                {
                  backgroundColor: isOpen ? theme.successSoft : theme.backgroundElement,
                  borderColor: isOpen ? theme.success : theme.border,
                },
              ]}>
              <ThemedText type="smallBold" themeColor={isOpen ? 'success' : 'textSecondary'}>
                {t(isOpen ? 'questionRound.statusOpen' : 'questionRound.statusClosed')}
              </ThemedText>
            </View>
          ) : null}

          {latestRound ? (
            <View style={styles.questionList}>
              <ThemedText type="smallBold">
                {t('questionRound.questionCount', { count: questions.length })}
              </ThemedText>
              {isLoadingQuestions ? (
                <ActivityIndicator color={theme.accent} />
              ) : questions.length > 0 ? (
                questions.map((question) => (
                  <QuestionItem
                    disabled={updatingQuestionId !== null}
                    key={question.id}
                    onPress={() => void toggleQuestion(question)}
                    question={question}
                  />
                ))
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  {t('questionRound.empty')}
                </ThemedText>
              )}
            </View>
          ) : null}

          {isOpen ? (
            <Button
              disabled={isWorking}
              icon="close"
              label={t('questionRound.close')}
              onPress={() => void closeRound()}
              variant="secondary"
            />
          ) : (
            <Button
              disabled={isWorking}
              icon="question"
              label={t('questionRound.open')}
              onPress={() => void openRound()}
            />
          )}
        </>
      )}

      {isWorking ? <ActivityIndicator color={theme.accent} /> : null}
      {hasError ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {t('questionRound.adminError')}
        </ThemedText>
      ) : null}
    </Card>
  );
}

function QuestionItem({
  disabled,
  onPress,
  question,
}: {
  disabled: boolean;
  onPress: () => void;
  question: AnonymousQuestion;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Pressable
      accessibilityLabel={t(
        question.is_checked ? 'questionRound.markOpen' : 'questionRound.markChecked',
      )}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: question.is_checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.questionItem,
        {
          backgroundColor: question.is_checked ? theme.successSoft : theme.background,
          borderColor: question.is_checked ? theme.success : theme.border,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <SymbolIcon
        color={question.is_checked ? theme.success : theme.textSecondary}
        name={question.is_checked ? 'confirm' : 'unchecked'}
        size={24}
      />
      <View style={styles.questionText}>
        <ThemedText style={question.is_checked && styles.checkedText}>{question.question}</ThemedText>
        {question.is_checked ? (
          <ThemedText type="tinyBold" themeColor="success">
            {t('questionRound.checked')}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.three,
  },
  headingBlock: {
    gap: Spacing.two,
  },
  status: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  questionList: {
    gap: Spacing.two,
  },
  questionItem: {
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.three,
    minHeight: 56,
    padding: Spacing.three,
  },
  questionText: {
    flex: 1,
    gap: Spacing.one,
  },
  checkedText: {
    textDecorationLine: 'line-through',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
});
