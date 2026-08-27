import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SymbolIcon } from '@/components/ui/symbol-icon';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { BusBoardingStatus } from '@/domain/database';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { useBusManagement } from '@/features/bus-management/bus-management-context';
import {
  getBusStatusSubmitFailureKind,
  type BusParticipantState,
  type BusStatusSubmitFailureKind,
} from '@/features/bus-management/bus-management-state';
import { useI18n } from '@/features/i18n/i18n';
import { supabaseReadFailureTranslationKey } from '@/features/network/supabase-read';
import { useTheme } from '@/hooks/use-theme';

const statusOptions: BusBoardingStatus[] = ['on_way', 'boarded', 'problem'];

export default function BusScreen() {
  return (
    <RequireAuth returnTo="/bus">
      <BusContent />
    </RequireAuth>
  );
}

function BusContent() {
  const theme = useTheme();
  const { language, t } = useI18n();
  const {
    activeBoarding,
    activeTrip,
    hasSyncError,
    isLoading,
    isRefreshing,
    participants,
    refresh,
    setStatus,
    syncErrorKind,
  } = useBusManagement();
  const [submittingParticipantId, setSubmittingParticipantId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<{
    kind: BusStatusSubmitFailureKind;
    participantId: number;
  } | null>(null);
  const departureLabel = activeBoarding
    ? new Intl.DateTimeFormat(language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(activeBoarding.departure_at))
    : null;

  const submitStatus = async (participantId: number, status: BusBoardingStatus) => {
    if (!activeBoarding || submittingParticipantId !== null) return;
    setSubmitError(null);
    setSubmittingParticipantId(participantId);

    try {
      const { error } = await setStatus(activeBoarding.id, participantId, status);
      if (error) {
        setSubmitError({ kind: getBusStatusSubmitFailureKind(error), participantId });
      }
    } catch {
      setSubmitError({ kind: 'server', participantId });
    } finally {
      setSubmittingParticipantId(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.accent} size="large" />
          <ThemedText themeColor="textSecondary">{t('bus.loading')}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (hasSyncError && !activeTrip) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.centered}>
          <Card style={styles.stateCard}>
            <ThemedText type="heading">{t('bus.syncErrorTitle')}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {t(supabaseReadFailureTranslationKey(syncErrorKind ?? 'server'))}
            </ThemedText>
            <Button icon="refresh" label={t('bus.retry')} onPress={() => void refresh()} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
        <View style={styles.heading}>
          <View style={styles.headingText}>
            <ThemedText type="title">{t('bus.title')}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {activeTrip?.name ?? t('bus.noAssignmentTitle')}
            </ThemedText>
          </View>
          {isRefreshing ? <ActivityIndicator color={theme.accent} /> : null}
        </View>

        {hasSyncError ? (
          <Card style={[styles.inlineError, { borderColor: theme.warning }]}>
            <ThemedText type="small" themeColor="warning">
              {t(supabaseReadFailureTranslationKey(syncErrorKind ?? 'server'))}
            </ThemedText>
            <Button
              icon="refresh"
              label={t('bus.retry')}
              onPress={() => void refresh()}
              variant="secondary"
            />
          </Card>
        ) : null}

        {!activeTrip || participants.length === 0 ? (
          <Card style={styles.stateCard}>
            <ThemedText type="heading">{t('bus.noAssignmentTitle')}</ThemedText>
            <ThemedText themeColor="textSecondary">{t('bus.noAssignmentBody')}</ThemedText>
          </Card>
        ) : (
          <>
            {activeBoarding ? (
              <Card style={[styles.boardingCard, { borderColor: theme.warning }]}>
                <ThemedText type="smallBold" themeColor="warning">
                  {t('bus.activeLabel')}
                </ThemedText>
                <ThemedText type="heading">{activeBoarding.title}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {t('bus.departureAt', { date: departureLabel ?? '—' })}
                </ThemedText>
              </Card>
            ) : (
              <Card style={styles.stateCard}>
                <ThemedText type="heading">{t('bus.noBoardingTitle')}</ThemedText>
                <ThemedText themeColor="textSecondary">{t('bus.noBoardingBody')}</ThemedText>
              </Card>
            )}

            <View style={styles.participantList}>
              {participants.map((participant) => (
                <ParticipantCard
                  active={Boolean(activeBoarding)}
                  disabled={submittingParticipantId !== null}
                  isSubmitting={submittingParticipantId === participant.id}
                  key={participant.id}
                  onStatus={(status) => void submitStatus(participant.id, status)}
                  participant={participant}
                  submitErrorKind={
                    submitError?.participantId === participant.id ? submitError.kind : null
                  }
                />
              ))}
            </View>
          </>
        )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ParticipantCard({
  active,
  disabled,
  isSubmitting,
  onStatus,
  participant,
  submitErrorKind,
}: {
  active: boolean;
  disabled: boolean;
  isSubmitting: boolean;
  onStatus: (status: BusBoardingStatus) => void;
  participant: BusParticipantState;
  submitErrorKind: BusStatusSubmitFailureKind | null;
}) {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Card style={styles.participantCard}>
      <View style={styles.participantHeader}>
        <View style={styles.participantText}>
          <ThemedText type="heading">{participant.participant_code}</ThemedText>
          <ThemedText themeColor="textSecondary">{participant.display_name}</ThemedText>
          <ThemedText type="smallBold" themeColor="accent">
            {participant.bus_name ?? t('bus.unassignedBus')}
          </ThemedText>
        </View>
        <StatusBadge status={participant.status} />
      </View>

      {active ? (
        <View accessibilityRole="radiogroup" style={styles.statusButtons}>
          {statusOptions.map((status) => {
            const selected = participant.status === status;
            const color =
              status === 'boarded'
                ? theme.success
                : status === 'problem'
                  ? theme.danger
                  : theme.accent;

            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected, disabled }}
                disabled={disabled}
                key={status}
                onPress={() => onStatus(status)}
                style={({ pressed }) => [
                  styles.statusButton,
                  {
                    backgroundColor: selected ? color : theme.backgroundElement,
                    borderColor: color,
                  },
                  pressed && styles.pressed,
                  disabled && styles.disabled,
                ]}>
                <ThemedText
                  type="smallBold"
                  style={selected ? { color: theme.background } : { color }}>
                  {t(`bus.status.${status}`)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {isSubmitting ? <ActivityIndicator color={theme.accent} /> : null}
      {submitErrorKind ? (
        <ThemedText accessibilityLiveRegion="polite" themeColor="danger" type="small">
          {t(`bus.submitError.${submitErrorKind}`)}
        </ThemedText>
      ) : participant.status ? (
        <ThemedText accessibilityLiveRegion="polite" themeColor="success" type="small">
          {t('bus.statusSaved')}
        </ThemedText>
      ) : null}
    </Card>
  );
}

function StatusBadge({ status }: { status: BusBoardingStatus | null }) {
  const theme = useTheme();
  const { t } = useI18n();
  const color =
    status === 'boarded'
      ? theme.success
      : status === 'problem'
        ? theme.danger
        : status === 'on_way'
          ? theme.accent
          : theme.textSecondary;

  return (
    <View style={[styles.statusBadge, { borderColor: color }]}>
      <SymbolIcon
        color={color}
        name={status === 'boarded' ? 'confirm' : status === 'problem' ? 'warning' : 'bus'}
        size={18}
      />
      <ThemedText type="smallBold" style={{ color }}>
        {t(`bus.status.${status ?? 'not_confirmed'}`)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  boardingCard: {
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.three,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  content: {
    alignSelf: 'center',
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: '100%',
  },
  disabled: {
    opacity: 0.48,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  headingText: {
    flex: 1,
    gap: Spacing.half,
  },
  inlineError: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  participantCard: {
    gap: Spacing.three,
  },
  participantHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  participantList: {
    gap: Spacing.three,
  },
  participantText: {
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.72,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stateCard: {
    gap: Spacing.two,
  },
  statusBadge: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  statusButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.two,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
