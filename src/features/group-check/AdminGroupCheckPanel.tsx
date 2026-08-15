import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import type { AdminGroupCheckResult } from '@/domain/database';
import { supabase } from '@/features/auth/supabase';
import { useGroupCheck } from '@/features/group-check/group-check-context';
import { useI18n } from '@/features/i18n/i18n';
import { useTheme } from '@/hooks/use-theme';

export function AdminGroupCheckPanel() {
  const theme = useTheme();
  const { isRTL, t } = useI18n();
  const { activeCheck, closeCheck, startCheck } = useGroupCheck();
  const [results, setResults] = useState<AdminGroupCheckResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [hasActionError, setHasActionError] = useState(false);
  const [hasResultsError, setHasResultsError] = useState(false);
  const [question, setQuestion] = useState('');
  const [hasQuestionError, setHasQuestionError] = useState(false);

  const checkId = activeCheck?.id ?? null;

  const loadResults = useCallback(async () => {
    if (checkId === null) {
      setResults([]);
      setHasResultsError(false);
      setIsLoadingResults(false);
      return;
    }

    setIsLoadingResults(true);
    setHasResultsError(false);

    try {
      const { data, error } = await supabase.rpc('admin_group_check_results', {
        p_check_id: checkId,
      });

      if (error) {
        throw error;
      }

      setResults(data ?? []);
    } catch {
      setHasResultsError(true);
    } finally {
      setIsLoadingResults(false);
    }
  }, [checkId]);

  useEffect(() => {
    if (checkId === null) {
      return;
    }

    const initialLoadTimeout = setTimeout(() => void loadResults(), 0);

    const channel = supabase
      .channel(`admin-group-check-results:${checkId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          filter: `check_id=eq.${checkId}`,
          schema: 'public',
          table: 'group_check_responses',
        },
        () => void loadResults(),
      )
      .subscribe();

    return () => {
      clearTimeout(initialLoadTimeout);
      void supabase.removeChannel(channel);
    };
  }, [checkId, loadResults]);

  const handleStart = async () => {
    if (isWorking) {
      return;
    }

    const normalizedQuestion = question.trim();

    if (normalizedQuestion.length < 3) {
      setHasQuestionError(true);
      return;
    }

    setHasQuestionError(false);
    setHasActionError(false);
    setIsWorking(true);

    try {
      const { error } = await startCheck(normalizedQuestion);
      setHasActionError(Boolean(error));

      if (!error) {
        setQuestion('');
      }
    } catch {
      setHasActionError(true);
    } finally {
      setIsWorking(false);
    }
  };

  const handleClose = async () => {
    if (!activeCheck || isWorking) {
      return;
    }

    setHasActionError(false);
    setIsWorking(true);

    try {
      const { error } = await closeCheck(activeCheck.id);
      setHasActionError(Boolean(error));
    } catch {
      setHasActionError(true);
    } finally {
      setIsWorking(false);
    }
  };

  const confirmedNames = results.filter((result) => result.answer).map((result) => result.display_name);
  const declinedNames = results.filter((result) => !result.answer).map((result) => result.display_name);

  return (
    <Card style={styles.panel}>
      <ThemedText themeColor="textSecondary">
        {activeCheck ? t('groupCheck.adminActiveBody') : t('groupCheck.adminBody')}
      </ThemedText>

      {activeCheck ? (
        <>
          <View
            style={[
              styles.activeQuestion,
              { backgroundColor: theme.warningSoft, borderColor: theme.warning },
            ]}>
            <ThemedText type="smallBold" themeColor="warning">
              {t('groupCheck.activeLabel')}
            </ThemedText>
            <ThemedText type="heading">{activeCheck.question}</ThemedText>
          </View>

          {isLoadingResults ? (
            <ActivityIndicator color={theme.accent} />
          ) : hasResultsError ? (
            <View style={styles.errorBlock}>
              <ThemedText type="small" themeColor="danger">
                {t('groupCheck.resultsError')}
              </ThemedText>
              <Button
                icon="refresh"
                label={t('groupCheck.retry')}
                onPress={() => void loadResults()}
                variant="secondary"
              />
            </View>
          ) : (
            <View style={styles.resultsGrid}>
              <ResultColumn
                color={theme.success}
                emptyLabel={t('groupCheck.noConfirmed')}
                names={confirmedNames}
                title={t('groupCheck.confirmedCount', { count: confirmedNames.length })}
              />
              <ResultColumn
                color={theme.danger}
                emptyLabel={t('groupCheck.noDeclined')}
                names={declinedNames}
                title={t('groupCheck.declinedCount', { count: declinedNames.length })}
              />
            </View>
          )}

          <Button
            disabled={isWorking}
            icon="close"
            label={t('groupCheck.close')}
            onPress={() => void handleClose()}
            variant="secondary"
          />
        </>
      ) : (
        <View style={styles.actions}>
          <View style={styles.questionField}>
            <ThemedText type="smallBold">{t('groupCheck.questionLabel')}</ThemedText>
            <TextInput
              accessibilityLabel={t('groupCheck.questionLabel')}
              editable={!isWorking}
              maxLength={240}
              multiline
              onChangeText={(value) => {
                setQuestion(value);
                setHasQuestionError(false);
              }}
              placeholder={t('groupCheck.questionPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.questionInput,
                {
                  backgroundColor: theme.background,
                  borderColor: hasQuestionError ? theme.danger : theme.border,
                  color: theme.text,
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
              textAlignVertical="top"
              value={question}
            />
            <View style={styles.questionMeta}>
              {hasQuestionError ? (
                <ThemedText type="small" themeColor="danger">
                  {t('groupCheck.questionValidation')}
                </ThemedText>
              ) : (
                <View />
              )}
              <ThemedText type="small" themeColor="textSecondary">
                {question.length}/240
              </ThemedText>
            </View>
          </View>
          <Button
            disabled={isWorking}
            icon="people"
            label={t('groupCheck.start')}
            onPress={() => void handleStart()}
          />
        </View>
      )}

      {isWorking ? <ActivityIndicator color={theme.accent} /> : null}
      {hasActionError ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {t('groupCheck.actionError')}
        </ThemedText>
      ) : null}
    </Card>
  );
}

function ResultColumn({
  color,
  emptyLabel,
  names,
  title,
}: {
  color: string;
  emptyLabel: string;
  names: string[];
  title: string;
}) {
  return (
    <View style={styles.resultColumn}>
      <ThemedText type="smallBold" style={{ color }}>
        {title}
      </ThemedText>
      {names.length > 0 ? (
        names.map((name, index) => (
          <ThemedText key={`${name}-${index}`} style={styles.name}>
            {name}
          </ThemedText>
        ))
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyLabel}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.three,
  },
  activeQuestion: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  actions: {
    gap: Spacing.three,
  },
  questionField: {
    gap: Spacing.two,
  },
  questionInput: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 112,
    padding: Spacing.three,
  },
  questionMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  resultColumn: {
    flex: 1,
    gap: Spacing.two,
    minWidth: 180,
  },
  name: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.two,
  },
  errorBlock: {
    gap: Spacing.two,
  },
});
