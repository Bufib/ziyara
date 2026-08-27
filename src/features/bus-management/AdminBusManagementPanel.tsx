import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SymbolIcon } from '@/components/ui/symbol-icon';
import { Spacing } from '@/constants/theme';
import type { AdminUserSummary, BusBoardingStatus } from '@/domain/database';
import { useAuth } from '@/features/auth/auth-context';
import { supabase } from '@/features/auth/supabase';
import { useBusManagement } from '@/features/bus-management/bus-management-context';
import {
  shouldRetryBusStatusAfterSessionRefresh,
  summarizeBusBoarding,
  type BusParticipantState,
} from '@/features/bus-management/bus-management-state';
import { useI18n } from '@/features/i18n/i18n';
import { supabaseReadFailureTranslationKey } from '@/features/network/supabase-read';
import { useTheme } from '@/hooks/use-theme';

const departureMinuteOptions = [15, 30, 60] as const;
const statusOptions: BusBoardingStatus[] = ['on_way', 'boarded', 'problem'];

export function AdminBusManagementPanel({ users }: { users: AdminUserSummary[] }) {
  const theme = useTheme();
  const { language, t } = useI18n();
  const { session } = useAuth();
  const {
    activeBoarding,
    activeTrip,
    buses,
    hasSyncError,
    isLoading,
    participants,
    refresh,
    syncErrorKind,
  } = useBusManagement();
  const [tripName, setTripName] = useState('');
  const [busName, setBusName] = useState('');
  const [participantCode, setParticipantCode] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [accountSearch, setAccountSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [boardingTitle, setBoardingTitle] = useState('');
  const [departureMinutes, setDepartureMinutes] = useState<(typeof departureMinuteOptions)[number]>(
    15,
  );
  const [isWorking, setIsWorking] = useState(false);
  const [hasActionError, setHasActionError] = useState(false);
  const summary = summarizeBusBoarding(participants);
  const selectedAccount = users.find((user) => user.user_id === selectedUserId) ?? null;
  const matchingAccounts = useMemo(() => {
    const normalized = accountSearch.trim().toLocaleLowerCase(language);
    if (!normalized) return [];
    return users
      .filter((user) => user.display_name.toLocaleLowerCase(language).includes(normalized))
      .slice(0, 6);
  }, [accountSearch, language, users]);

  const runAction = async (
    action: () => PromiseLike<{ error: unknown }>,
    onSuccess?: () => void,
  ) => {
    if (isWorking) return;
    setHasActionError(false);
    setIsWorking(true);

    try {
      let result = await action();

      if (result.error && shouldRetryBusStatusAfterSessionRefresh(result.error)) {
        const refreshedSession = await supabase.auth.refreshSession();

        if (
          !refreshedSession.error &&
          refreshedSession.data.session?.user.id === session?.user.id
        ) {
          result = await action();
        }
      }

      const { error } = result;
      if (error) {
        setHasActionError(true);
        await refresh();
      } else {
        onSuccess?.();
        await refresh();
      }
    } catch {
      setHasActionError(true);
    } finally {
      setIsWorking(false);
    }
  };

  const createTrip = () =>
    runAction(
      () => supabase.rpc('admin_create_trip', { p_name: tripName.trim() }),
      () => setTripName(''),
    );

  const createBus = () => {
    if (!activeTrip) return;
    void runAction(
      () =>
        supabase.rpc('admin_create_trip_bus', {
          p_name: busName.trim(),
          p_trip_id: activeTrip.id,
        }),
      () => setBusName(''),
    );
  };

  const saveParticipant = () => {
    if (!activeTrip || selectedBusId === null) return;
    void runAction(
      () =>
        supabase.rpc('admin_upsert_trip_participant', {
          p_bus_id: selectedBusId,
          p_display_name: participantName.trim(),
          p_participant_code: participantCode.trim(),
          p_trip_id: activeTrip.id,
          p_user_id: selectedUserId,
        }),
      () => {
        setParticipantCode('');
        setParticipantName('');
        setSelectedUserId(null);
        setAccountSearch('');
      },
    );
  };

  const startBoarding = () => {
    if (!activeTrip) return;
    const departureAt = new Date(Date.now() + departureMinutes * 60_000).toISOString();
    void runAction(
      () =>
        supabase.rpc('admin_start_bus_boarding', {
          p_departure_at: departureAt,
          p_title: boardingTitle.trim(),
          p_trip_id: activeTrip.id,
        }),
      () => setBoardingTitle(''),
    );
  };

  const closeBoarding = () => {
    if (!activeBoarding) return;
    void runAction(() =>
      supabase.rpc('admin_close_bus_boarding', { p_boarding_id: activeBoarding.id }),
    );
  };

  const setParticipantStatus = (participantId: number, status: BusBoardingStatus) => {
    if (!activeBoarding) return;
    void runAction(() =>
      supabase.rpc('admin_set_bus_boarding_status', {
        p_boarding_id: activeBoarding.id,
        p_participant_id: participantId,
        p_status: status,
      }),
    );
  };

  const confirmArchiveTrip = () => {
    if (!activeTrip) return;
    Alert.alert(t('bus.admin.archiveTitle'), t('bus.admin.archiveBody'), [
      { style: 'cancel', text: t('bus.admin.cancel') },
      {
        onPress: () =>
          void runAction(() =>
            supabase.rpc('admin_archive_trip', { p_trip_id: activeTrip.id }),
          ),
        style: 'destructive',
        text: t('bus.admin.archiveConfirm'),
      },
    ]);
  };

  if (isLoading) {
    return (
      <Card style={styles.stateCard}>
        <ActivityIndicator color={theme.accent} />
        <ThemedText themeColor="textSecondary">{t('bus.loading')}</ThemedText>
      </Card>
    );
  }

  if (hasSyncError && !activeTrip) {
    return (
      <Card style={styles.stateCard}>
        <ThemedText type="heading">{t('bus.syncErrorTitle')}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {t(supabaseReadFailureTranslationKey(syncErrorKind ?? 'server'))}
        </ThemedText>
        <Button icon="refresh" label={t('bus.retry')} onPress={() => void refresh()} />
      </Card>
    );
  }

  if (!activeTrip) {
    return (
      <Card style={styles.formCard}>
        <ThemedText type="heading">{t('bus.admin.createTripTitle')}</ThemedText>
        <ThemedText themeColor="textSecondary">{t('bus.admin.createTripBody')}</ThemedText>
        <LabeledInput
          label={t('bus.admin.tripName')}
          onChangeText={setTripName}
          placeholder={t('bus.admin.tripNamePlaceholder')}
          value={tripName}
        />
        <Button
          disabled={isWorking || tripName.trim().length < 3}
          icon="plus"
          label={t('bus.admin.createTrip')}
          onPress={() => void createTrip()}
        />
        {hasActionError ? <ActionError /> : null}
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.tripHeader}>
        <View style={styles.tripHeaderText}>
          <ThemedText type="heading">{activeTrip.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t('bus.admin.tripSummary', {
              buses: buses.length,
              participants: participants.length,
            })}
          </ThemedText>
        </View>
        <Button
          disabled={isWorking || Boolean(activeBoarding)}
          icon="close"
          label={t('bus.admin.archive')}
          onPress={confirmArchiveTrip}
          variant="ghost"
        />
      </Card>

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

      <Card style={styles.formCard}>
        <ThemedText type="heading">{t('bus.admin.busesTitle')}</ThemedText>
        <View style={styles.inlineForm}>
          <View style={styles.flexField}>
            <LabeledInput
              label={t('bus.admin.busName')}
              onChangeText={setBusName}
              placeholder={t('bus.admin.busNamePlaceholder')}
              value={busName}
            />
          </View>
          <Button
            disabled={isWorking || busName.trim().length < 2}
            icon="plus"
            label={t('bus.admin.addBus')}
            onPress={createBus}
          />
        </View>
        <View style={styles.chips}>
          {buses.map((bus) => (
            <View
              key={bus.id}
              style={[styles.readonlyChip, { backgroundColor: theme.accentSoft }]}>
              <SymbolIcon color={theme.accent} name="bus" size={18} />
              <ThemedText type="smallBold" themeColor="accent">
                {bus.name}
              </ThemedText>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.formCard}>
        <ThemedText type="heading">{t('bus.admin.participantTitle')}</ThemedText>
        <View style={styles.twoColumns}>
          <View style={styles.flexField}>
            <LabeledInput
              autoCapitalize="characters"
              label={t('bus.admin.participantCode')}
              onChangeText={setParticipantCode}
              placeholder="BER01"
              value={participantCode}
            />
          </View>
          <View style={styles.flexField}>
            <LabeledInput
              label={t('bus.admin.participantName')}
              onChangeText={setParticipantName}
              placeholder={t('bus.admin.participantNamePlaceholder')}
              value={participantName}
            />
          </View>
        </View>

        <ThemedText type="smallBold">{t('bus.admin.selectBus')}</ThemedText>
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {buses.map((bus) => (
            <SelectionChip
              key={bus.id}
              label={bus.name}
              onPress={() => setSelectedBusId(bus.id)}
              selected={selectedBusId === bus.id}
            />
          ))}
        </View>

        <LabeledInput
          label={t('bus.admin.accountSearch')}
          onChangeText={setAccountSearch}
          placeholder={t('bus.admin.accountSearchPlaceholder')}
          value={accountSearch}
        />
        {selectedAccount ? (
          <View style={[styles.selectedAccount, { borderColor: theme.success }]}>
            <ThemedText type="smallBold" themeColor="success">
              {t('bus.admin.linkedAccount', { name: selectedAccount.display_name })}
            </ThemedText>
            <Button
              icon="close"
              label={t('bus.admin.removeAccountLink')}
              onPress={() => setSelectedUserId(null)}
              variant="ghost"
            />
          </View>
        ) : matchingAccounts.length > 0 ? (
          <View style={styles.accountResults}>
            {matchingAccounts.map((user) => (
              <Pressable
                accessibilityRole="button"
                key={user.user_id}
                onPress={() => {
                  setSelectedUserId(user.user_id);
                  if (!participantName.trim()) setParticipantName(user.display_name);
                }}
                style={({ pressed }) => [
                  styles.accountResult,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold">{user.display_name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('bus.admin.accountPartySize', { count: user.party_size })}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {t('bus.admin.optionalAccountBody')}
        </ThemedText>

        <Button
          disabled={
            isWorking ||
            buses.length === 0 ||
            selectedBusId === null ||
            participantCode.trim().length < 2 ||
            participantName.trim().length < 2
          }
          icon="plus"
          label={t('bus.admin.saveParticipant')}
          onPress={saveParticipant}
        />
      </Card>

      <Card style={styles.formCard}>
        <ThemedText type="heading">
          {activeBoarding ? activeBoarding.title : t('bus.admin.startBoardingTitle')}
        </ThemedText>
        {activeBoarding ? (
          <>
            <ThemedText themeColor="textSecondary">
              {t('bus.departureAt', {
                date: new Intl.DateTimeFormat(language, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(activeBoarding.departure_at)),
              })}
            </ThemedText>
            <View style={styles.summaryGrid}>
              <SummaryValue color={theme.textSecondary} label={t('bus.status.not_confirmed')} value={summary.notConfirmed} />
              <SummaryValue color={theme.accent} label={t('bus.status.on_way')} value={summary.onWay} />
              <SummaryValue color={theme.success} label={t('bus.status.boarded')} value={summary.boarded} />
              <SummaryValue color={theme.danger} label={t('bus.status.problem')} value={summary.problem} />
            </View>
            <Button
              disabled={isWorking}
              icon="close"
              label={t('bus.admin.closeBoarding')}
              onPress={closeBoarding}
              variant="secondary"
            />
          </>
        ) : (
          <>
            <LabeledInput
              label={t('bus.admin.boardingTitle')}
              onChangeText={setBoardingTitle}
              placeholder={t('bus.admin.boardingTitlePlaceholder')}
              value={boardingTitle}
            />
            <ThemedText type="smallBold">{t('bus.admin.departureIn')}</ThemedText>
            <View accessibilityRole="radiogroup" style={styles.chips}>
              {departureMinuteOptions.map((minutes) => (
                <SelectionChip
                  key={minutes}
                  label={t('bus.admin.minutes', { count: minutes })}
                  onPress={() => setDepartureMinutes(minutes)}
                  selected={departureMinutes === minutes}
                />
              ))}
            </View>
            <Button
              disabled={isWorking || participants.length === 0 || boardingTitle.trim().length < 3}
              icon="bus"
              label={t('bus.admin.startBoarding')}
              onPress={startBoarding}
            />
          </>
        )}
      </Card>

      <View style={styles.participantList}>
        {participants.length === 0 ? (
          <Card style={styles.stateCard}>
            <ThemedText type="heading">{t('bus.admin.noParticipantsTitle')}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {t('bus.admin.noParticipantsBody')}
            </ThemedText>
          </Card>
        ) : (
          participants.map((participant) => (
            <AdminParticipantRow
              disabled={isWorking || !activeBoarding}
              key={participant.id}
              onStatus={(status) => setParticipantStatus(participant.id, status)}
              participant={participant}
            />
          ))
        )}
      </View>

      {isWorking ? <ActivityIndicator color={theme.accent} /> : null}
      {hasActionError ? <ActionError /> : null}
    </View>
  );
}

function LabeledInput({
  autoCapitalize = 'sentences',
  label,
  onChangeText,
  placeholder,
  value,
}: {
  autoCapitalize?: 'characters' | 'sentences';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text },
        ]}
        value={value}
      />
    </View>
  );
}

function SelectionChip({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectionChip,
        {
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.border,
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={selected ? { color: theme.background } : undefined}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function SummaryValue({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={[styles.summaryValue, { borderColor: color }]}>
      <ThemedText type="title" style={{ color }}>
        {value}
      </ThemedText>
      <ThemedText type="small" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

function AdminParticipantRow({
  disabled,
  onStatus,
  participant,
}: {
  disabled: boolean;
  onStatus: (status: BusBoardingStatus) => void;
  participant: BusParticipantState;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  const statusColor =
    participant.status === 'boarded'
      ? theme.success
      : participant.status === 'problem'
        ? theme.danger
        : participant.status === 'on_way'
          ? theme.accent
          : theme.textSecondary;

  return (
    <Card style={styles.participantRow}>
      <View style={styles.participantHeader}>
        <View style={styles.tripHeaderText}>
          <ThemedText type="heading">{participant.participant_code}</ThemedText>
          <ThemedText themeColor="textSecondary">{participant.display_name}</ThemedText>
          <ThemedText type="smallBold" themeColor="accent">
            {participant.bus_name ?? t('bus.unassignedBus')}
          </ThemedText>
        </View>
        <View style={[styles.currentStatus, { borderColor: statusColor }]}>
          <ThemedText type="smallBold" style={{ color: statusColor }}>
            {t(`bus.status.${participant.status ?? 'not_confirmed'}`)}
          </ThemedText>
        </View>
      </View>
      {!disabled ? (
        <View style={styles.rowActions}>
          {statusOptions.map((status) => (
            <Button
              icon={status === 'boarded' ? 'confirm' : status === 'problem' ? 'warning' : 'bus'}
              key={status}
              label={t(`bus.status.${status}`)}
              onPress={() => onStatus(status)}
              variant={participant.status === status ? 'primary' : 'secondary'}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function ActionError() {
  const { t } = useI18n();
  return (
    <ThemedText accessibilityLiveRegion="polite" themeColor="danger" type="small">
      {t('bus.admin.actionError')}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  accountResult: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.half,
    padding: Spacing.two,
  },
  accountResults: {
    gap: Spacing.one,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  container: {
    gap: Spacing.three,
  },
  currentStatus: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  field: {
    gap: Spacing.one,
  },
  flexField: {
    flex: 1,
    minWidth: 180,
  },
  formCard: {
    gap: Spacing.three,
  },
  inlineError: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  inlineForm: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  input: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  participantHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  participantList: {
    gap: Spacing.two,
  },
  participantRow: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
  readonlyChip: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  selectedAccount: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
    padding: Spacing.two,
  },
  selectionChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  stateCard: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  summaryValue: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexGrow: 1,
    minWidth: 110,
    padding: Spacing.two,
  },
  tripHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  tripHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  twoColumns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
