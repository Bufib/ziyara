import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SymbolIcon } from '@/components/ui/symbol-icon';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { AdminUserSummary, AppRole } from '@/domain/database';
import { AdminSectionHeader } from '@/features/admin/AdminSectionHeader';
import { useAuth } from '@/features/auth/auth-context';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { supabase } from '@/features/auth/supabase';
import { AdminBusManagementPanel } from '@/features/bus-management/AdminBusManagementPanel';
import { useBusManagement } from '@/features/bus-management/bus-management-context';
import { AdminDailyProgramPanel } from '@/features/daily-program/AdminDailyProgramPanel';
import { useDailyProgram } from '@/features/daily-program/daily-program-context';
import { AdminGeneralAlarmPanel } from '@/features/general-alarm/AdminGeneralAlarmPanel';
import { AdminGroupCheckPanel } from '@/features/group-check/AdminGroupCheckPanel';
import { useGroupCheck } from '@/features/group-check/group-check-context';
import { AdminQuestionRoundPanel } from '@/features/question-round/AdminQuestionRoundPanel';
import { useQuestionRound } from '@/features/question-round/question-round-context';
import { useI18n } from '@/features/i18n/i18n';
import {
  getSupabaseReadFailureKind,
  supabaseReadFailureTranslationKey,
  type SupabaseReadFailureKind,
  withSupabaseReadTimeout,
} from '@/features/network/supabase-read';
import { AdminMeetingPointPanel } from '@/features/trip-guidance/AdminMeetingPointPanel';
import { AdminTripGuidancePanel } from '@/features/trip-guidance/AdminTripGuidancePanel';
import { useTripGuidance } from '@/features/trip-guidance/trip-guidance-context';
import { useTheme } from '@/hooks/use-theme';

const adminPageSize = 200;
const assignableRoles: AppRole[] = ['user', 'medical_staff', 'organization_team', 'admin'];

type AdminSection =
  | 'alarm'
  | 'bus'
  | 'guidance'
  | 'navigation'
  | 'program'
  | 'questions'
  | 'status'
  | 'users';
type RoleFeedback = {
  type: 'error' | 'last-admin' | 'success';
  userId: string;
};

async function fetchAllAdminUsers() {
  const allUsers: AdminUserSummary[] = [];

  for (let from = 0; ; from += adminPageSize) {
    const { data, error } = await withSupabaseReadTimeout((signal) =>
      supabase
        .rpc('admin_list_users')
        .range(from, from + adminPageSize - 1)
        .abortSignal(signal),
    );

    if (error) {
      throw error;
    }

    const page = data ?? [];
    allUsers.push(...page);

    if (page.length < adminPageSize) {
      return allUsers;
    }
  }
}

export default function AdminScreen() {
  return (
    <RequireAuth admin returnTo="/admin">
      <AdminContent />
    </RequireAuth>
  );
}

function AdminContent() {
  const theme = useTheme();
  const { isRTL, language, t } = useI18n();
  const { profile, refreshProfile } = useAuth();
  const { activeBoarding, hasSyncError: hasBusSyncError } = useBusManagement();
  const {
    hasSyncError: hasDailyProgramSyncError,
    programs: dailyPrograms,
  } = useDailyProgram();
  const { activeCheck, hasSyncError: hasGroupCheckSyncError } = useGroupCheck();
  const { activeRound, hasSyncError: hasQuestionRoundSyncError } = useQuestionRound();
  const {
    activeGuidance,
    hasSyncError: hasTripGuidanceSyncError,
    navigationDestinations,
  } = useTripGuidance();
  const hasNavigationTarget = navigationDestinations.length > 0;
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [readErrorKind, setReadErrorKind] = useState<SupabaseReadFailureKind | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRoleUserId, setExpandedRoleUserId] = useState<string | null>(null);
  const [roleFeedback, setRoleFeedback] = useState<RoleFeedback | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const usersRequestSequence = useRef(0);
  const hasError = readErrorKind !== null;
  const [expandedSections, setExpandedSections] = useState<Record<AdminSection, boolean>>({
    alarm: false,
    bus: false,
    guidance: false,
    navigation: false,
    program: false,
    questions: false,
    status: false,
    users: false,
  });

  const representedPeople = useMemo(
    () => users.reduce((total, user) => total + user.party_size, 0),
    [users],
  );
  const filteredUsers = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase(language);

    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) =>
      user.display_name.toLocaleLowerCase(language).includes(normalizedQuery),
    );
  }, [language, searchQuery, users]);

  const loadUsers = useCallback(async () => {
    const requestSequence = ++usersRequestSequence.current;
    setReadErrorKind(null);
    setIsLoading(true);

    try {
      const nextUsers = await fetchAllAdminUsers();

      if (requestSequence === usersRequestSequence.current) {
        setUsers(nextUsers);
      }
    } catch (error) {
      if (requestSequence === usersRequestSequence.current) {
        setReadErrorKind(getSupabaseReadFailureKind(error));
      }
    } finally {
      if (requestSequence === usersRequestSequence.current) {
        setHasLoaded(true);
        setIsLoading(false);
      }
    }
  }, []);

  const assignRole = useCallback(
    async (userId: string, role: AppRole) => {
      setRoleFeedback(null);
      setUpdatingRoleUserId(userId);

      try {
        const { error } = await supabase.rpc('admin_set_user_role', {
          p_role: role,
          p_user_id: userId,
        });

        if (error) {
          setRoleFeedback({
            type:
              error.code === 'P0001' &&
              error.message === 'At least one administrator must remain.'
                ? 'last-admin'
                : 'error',
            userId,
          });
          return;
        }

        setUsers((current) =>
          current.map((user) => (user.user_id === userId ? { ...user, role } : user)),
        );
        setRoleFeedback({ type: 'success', userId });
        setExpandedRoleUserId(null);

        if (profile?.user_id === userId) {
          await refreshProfile();
        }
      } catch {
        setRoleFeedback({ type: 'error', userId });
      } finally {
        setUpdatingRoleUserId(null);
      }
    },
    [profile, refreshProfile],
  );

  useEffect(() => {
    const initialLoadTimeout = setTimeout(() => void loadUsers(), 0);

    return () => {
      clearTimeout(initialLoadTimeout);
      usersRequestSequence.current += 1;
    };
  }, [loadUsers]);

  const toggleSection = (section: AdminSection) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={expandedSections.users && hasLoaded && !hasError ? filteredUsers : []}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.user_id}
        refreshControl={
          <RefreshControl
            colors={[theme.accent]}
            onRefresh={() => void loadUsers()}
            refreshing={isLoading && hasLoaded}
            tintColor={theme.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.intro}>
              <ThemedText type="title">{t('admin.title')}</ThemedText>
              <ThemedText themeColor="textSecondary">{t('admin.description')}</ThemedText>
            </View>

            <View style={styles.sections}>
              <View style={styles.section}>
                <AdminSectionHeader
                  description={t('admin.section.bus.description')}
                  expanded={expandedSections.bus}
                  icon="bus"
                  onToggle={() => toggleSection('bus')}
                  status={t('admin.section.bus.status')}
                  statusColor="accent"
                  title={t('admin.section.bus.title')}
                />
                {expandedSections.bus ? <AdminBusManagementPanel users={users} /> : null}
              </View>

              <View style={styles.section}>
                <AdminSectionHeader
                  description={t('admin.section.alarm.description')}
                  expanded={expandedSections.alarm}
                  icon="warning"
                  onToggle={() => toggleSection('alarm')}
                  status={t(
                    hasBusSyncError
                      ? 'admin.section.alarm.error'
                      : activeBoarding
                        ? 'admin.section.alarm.active'
                        : 'admin.section.alarm.inactive',
                  )}
                  statusColor={
                    hasBusSyncError ? 'danger' : activeBoarding ? 'warning' : 'textSecondary'
                  }
                  title={t('admin.section.alarm.title')}
                />
                {expandedSections.alarm ? <AdminGeneralAlarmPanel /> : null}
              </View>

              <View style={styles.section}>
                <AdminSectionHeader
                  description={t('admin.section.program.description')}
                  expanded={expandedSections.program}
                  icon="book"
                  onToggle={() => toggleSection('program')}
                  status={t(
                    hasDailyProgramSyncError
                      ? 'admin.section.program.error'
                      : dailyPrograms.length > 0
                        ? 'admin.section.program.active'
                        : 'admin.section.program.inactive',
                    { count: dailyPrograms.length },
                  )}
                  statusColor={
                    hasDailyProgramSyncError
                      ? 'danger'
                      : dailyPrograms.length > 0
                        ? 'success'
                        : 'textSecondary'
                  }
                  title={t('admin.section.program.title')}
                />
                {expandedSections.program ? <AdminDailyProgramPanel /> : null}
              </View>

              <View style={styles.section}>
                <AdminSectionHeader
                  description={t('admin.section.guidance.description')}
                  expanded={expandedSections.guidance}
                  icon="map"
                  onToggle={() => toggleSection('guidance')}
                  status={t(
                    hasTripGuidanceSyncError
                      ? 'admin.section.guidance.error'
                      : activeGuidance
                        ? 'admin.section.guidance.active'
                        : 'admin.section.guidance.inactive',
                  )}
                  statusColor={
                    hasTripGuidanceSyncError
                      ? 'danger'
                      : activeGuidance
                        ? 'success'
                        : 'textSecondary'
                  }
                  title={t('admin.section.guidance.title')}
                />
                {expandedSections.guidance ? <AdminTripGuidancePanel /> : null}
              </View>

              <View style={styles.section}>
                <AdminSectionHeader
                  description={t('admin.section.navigation.description')}
                  expanded={expandedSections.navigation}
                  icon="external-link"
                  onToggle={() => toggleSection('navigation')}
                  status={t(
                    hasTripGuidanceSyncError
                      ? 'admin.section.navigation.error'
                      : hasNavigationTarget
                        ? 'admin.section.navigation.active'
                        : 'admin.section.navigation.inactive',
                    { count: navigationDestinations.length },
                  )}
                  statusColor={
                    hasTripGuidanceSyncError
                      ? 'danger'
                      : hasNavigationTarget
                        ? 'success'
                        : 'textSecondary'
                  }
                  title={t('admin.section.navigation.title')}
                />
                {expandedSections.navigation ? <AdminMeetingPointPanel /> : null}
              </View>

              <View style={styles.section}>
                <AdminSectionHeader
                  description={t('admin.section.status.description')}
                  expanded={expandedSections.status}
                  icon="confirm"
                  onToggle={() => toggleSection('status')}
                  status={t(
                    hasGroupCheckSyncError
                      ? 'admin.section.status.error'
                      : activeCheck
                        ? 'admin.section.status.active'
                        : 'admin.section.status.inactive',
                  )}
                  statusColor={
                    hasGroupCheckSyncError ? 'danger' : activeCheck ? 'warning' : 'textSecondary'
                  }
                  title={t('admin.section.status.title')}
                />
                {expandedSections.status ? <AdminGroupCheckPanel /> : null}
              </View>

              <View style={styles.section}>
                <AdminSectionHeader
                  description={t('admin.section.questions.description')}
                  expanded={expandedSections.questions}
                  icon="question"
                  onToggle={() => toggleSection('questions')}
                  status={t(
                    hasQuestionRoundSyncError
                      ? 'admin.section.questions.error'
                      : activeRound
                        ? 'admin.section.questions.open'
                        : 'admin.section.questions.closed',
                  )}
                  statusColor={
                    hasQuestionRoundSyncError
                      ? 'danger'
                      : activeRound
                        ? 'success'
                        : 'textSecondary'
                  }
                  title={t('admin.section.questions.title')}
                />
                {expandedSections.questions ? <AdminQuestionRoundPanel /> : null}
              </View>

              <View style={styles.section}>
                <AdminSectionHeader
                  description={t('admin.section.users.description')}
                  expanded={expandedSections.users}
                  icon="people"
                  onToggle={() => toggleSection('users')}
                  status={
                    hasError
                      ? t('admin.section.users.error')
                      : !hasLoaded
                        ? t('admin.section.users.loading')
                        : t('admin.section.users.count', { count: users.length })
                  }
                  statusColor={hasError ? 'danger' : 'accent'}
                  title={t('admin.section.users.title')}
                />

                {expandedSections.users ? (
                  isLoading && !hasLoaded ? (
                    <Card style={styles.state}>
                      <ActivityIndicator color={theme.accent} size="large" />
                      <ThemedText themeColor="textSecondary">{t('admin.loading')}</ThemedText>
                    </Card>
                  ) : hasError ? (
                    <Card style={styles.state}>
                      <ThemedText type="heading">{t('admin.errorTitle')}</ThemedText>
                      <ThemedText themeColor="textSecondary">
                        {t(supabaseReadFailureTranslationKey(readErrorKind ?? 'server'))}
                      </ThemedText>
                      <Button
                        icon="refresh"
                        label={t('admin.retry')}
                        onPress={() => void loadUsers()}
                      />
                    </Card>
                  ) : users.length === 0 ? (
                    <Card style={styles.state}>
                      <ThemedText type="heading">{t('admin.emptyTitle')}</ThemedText>
                      <ThemedText themeColor="textSecondary">{t('admin.emptyBody')}</ThemedText>
                    </Card>
                  ) : (
                    <View style={styles.usersTools}>
                      <Card style={styles.overviewCard}>
                        <ThemedText type="smallBold" themeColor="accent">
                          {t('admin.userCount', { count: users.length })}
                        </ThemedText>
                        <ThemedText type="smallBold" themeColor="accent">
                          {t('admin.personCount', { count: representedPeople })}
                        </ThemedText>
                      </Card>

                      <View
                        style={[
                          styles.searchField,
                          { backgroundColor: theme.surface, borderColor: theme.border },
                        ]}>
                        <SymbolIcon color={theme.textSecondary} name="search" size={18} />
                        <TextInput
                          accessibilityLabel={t('admin.searchA11y')}
                          autoCapitalize="words"
                          autoCorrect={false}
                          onChangeText={setSearchQuery}
                          placeholder={t('admin.searchPlaceholder')}
                          placeholderTextColor={theme.textSecondary}
                          returnKeyType="search"
                          style={[
                            styles.searchInput,
                            {
                              color: theme.text,
                              textAlign: isRTL ? 'right' : 'left',
                              writingDirection: isRTL ? 'rtl' : 'ltr',
                            },
                          ]}
                          value={searchQuery}
                        />
                      </View>
                    </View>
                  )
                ) : null}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          expandedSections.users &&
          hasLoaded &&
          !hasError &&
          users.length > 0 &&
          searchQuery.trim() ? (
            <Card style={styles.state}>
              <ThemedText type="heading">{t('admin.searchEmptyTitle')}</ThemedText>
              <ThemedText themeColor="textSecondary">{t('admin.searchEmptyBody')}</ThemedText>
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.userCard}>
            <View style={styles.userHeader}>
              <ThemedText type="heading" style={styles.userName}>
                {item.display_name}
              </ThemedText>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: item.role === 'admin' ? theme.accentSoft : theme.backgroundElement,
                    borderColor: item.role === 'admin' ? theme.accent : theme.border,
                  },
                ]}>
                <ThemedText type="tinyBold">{t(`admin.role.${item.role}`)}</ThemedText>
              </View>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {t('admin.partySize', { count: item.party_size })}
            </ThemedText>

            <Button
              icon={expandedRoleUserId === item.user_id ? 'close' : 'settings'}
              label={t(
                expandedRoleUserId === item.user_id
                  ? 'admin.roleAssignment.close'
                  : 'admin.roleAssignment.title',
              )}
              onPress={() => {
                setRoleFeedback(null);
                setExpandedRoleUserId((current) =>
                  current === item.user_id ? null : item.user_id,
                );
              }}
              style={styles.roleAssignmentButton}
              variant="secondary"
            />

            {expandedRoleUserId === item.user_id ? (
              <View style={[styles.roleAssignment, { borderColor: theme.border }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t('admin.roleAssignment.body')}
                </ThemedText>
                <View accessibilityRole="radiogroup" style={styles.roleChoices}>
                  {assignableRoles.map((role) => (
                    <RoleChoice
                      disabled={updatingRoleUserId !== null}
                      key={role}
                      label={t(`admin.role.${role}`)}
                      onPress={() => void assignRole(item.user_id, role)}
                      selected={item.role === role}
                    />
                  ))}
                </View>

                {updatingRoleUserId === item.user_id ? (
                  <View style={styles.roleProgress}>
                    <ActivityIndicator color={theme.accent} size="small" />
                    <ThemedText type="small" themeColor="textSecondary">
                      {t('admin.roleAssignment.saving')}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            ) : null}

            {roleFeedback?.userId === item.user_id ? (
              <ThemedText
                accessibilityLiveRegion="polite"
                type="small"
                themeColor={roleFeedback.type === 'success' ? 'success' : 'danger'}>
                {t(
                  roleFeedback.type === 'success'
                    ? 'admin.roleAssignment.saved'
                    : roleFeedback.type === 'last-admin'
                      ? 'admin.roleAssignment.lastAdmin'
                      : 'admin.roleAssignment.error',
                )}
              </ThemedText>
            ) : null}
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    width: '100%',
  },
  headerContent: {
    gap: Spacing.four,
  },
  intro: {
    gap: Spacing.two,
  },
  sections: {
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  overviewCard: {
    gap: Spacing.half,
  },
  usersTools: {
    gap: Spacing.two,
  },
  searchField: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 42,
    paddingVertical: Spacing.two,
  },
  state: {
    alignItems: 'center',
    gap: Spacing.three,
    justifyContent: 'center',
    minHeight: 180,
  },
  userCard: {
    gap: Spacing.three,
  },
  userHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  userName: {
    flex: 1,
  },
  roleBadge: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 28,
    paddingHorizontal: Spacing.two,
  },
  roleAssignment: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  roleAssignmentButton: {
    alignSelf: 'flex-start',
  },
  roleChoices: {
    gap: Spacing.two,
  },
  roleProgress: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  roleChoice: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  roleChoiceLabel: {
    flex: 1,
  },
  roleRadio: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  roleRadioDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.55,
  },
});

function RoleChoice({
  disabled,
  label,
  onPress,
  selected,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useTheme();
  const isDisabled = disabled || selected;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleChoice,
        {
          backgroundColor: selected ? theme.accentSoft : theme.background,
          borderColor: selected ? theme.accent : theme.border,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <View
        style={[
          styles.roleRadio,
          { borderColor: selected ? theme.accent : theme.textSecondary },
        ]}>
        {selected ? (
          <View style={[styles.roleRadioDot, { backgroundColor: theme.accent }]} />
        ) : null}
      </View>
      <ThemedText type="smallBold" style={styles.roleChoiceLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
