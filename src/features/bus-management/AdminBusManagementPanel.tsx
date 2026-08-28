import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SymbolIcon } from '@/components/ui/symbol-icon';
import { Spacing } from '@/constants/theme';
import type { AdminUserSummary } from '@/domain/database';
import { useAuth } from '@/features/auth/auth-context';
import { supabase } from '@/features/auth/supabase';
import { useBusManagement } from '@/features/bus-management/bus-management-context';
import { shouldRetryBusStatusAfterSessionRefresh } from '@/features/bus-management/bus-management-state';
import { useI18n } from '@/features/i18n/i18n';
import { supabaseReadFailureTranslationKey } from '@/features/network/supabase-read';
import { useTheme } from '@/hooks/use-theme';

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
  const [isWorking, setIsWorking] = useState(false);
  const [hasActionError, setHasActionError] = useState(false);
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
            <Card key={participant.id} style={styles.participantRow}>
              <ThemedText type="heading">{participant.participant_code}</ThemedText>
              <ThemedText themeColor="textSecondary">{participant.display_name}</ThemedText>
              <ThemedText type="smallBold" themeColor="accent">
                {participant.bus_name ?? t('bus.unassignedBus')}
              </ThemedText>
            </Card>
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
  alarmBanner: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  busClosureCard: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexGrow: 1,
    gap: Spacing.one,
    minWidth: 180,
    padding: Spacing.two,
  },
  busClosureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
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
  outstandingHeading: {
    gap: Spacing.one,
  },
  participantRow: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.72,
  },
  pushDispatchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pushDispatchText: {
    flex: 1,
    minWidth: 180,
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
