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
import type { AdminUserSummary, AssignableAppRole } from '@/domain/database';
import { AdminSectionHeader } from '@/features/admin/AdminSectionHeader';
import { supabase } from '@/features/auth/supabase';
import { AdminGroupCheckPanel } from '@/features/group-check/AdminGroupCheckPanel';
import { useGroupCheck } from '@/features/group-check/group-check-context';
import { AdminQuestionRoundPanel } from '@/features/question-round/AdminQuestionRoundPanel';
import { useQuestionRound } from '@/features/question-round/question-round-context';
import { useI18n } from '@/features/i18n/i18n';
import { useTheme } from '@/hooks/use-theme';

const adminPageSize = 200;
const assignableRoles: AssignableAppRole[] = ['user', 'medical_staff', 'organization_team'];

type AdminSection = 'questions' | 'status' | 'users';
type RoleFeedback = {
  type: 'error' | 'success';
  userId: string;
};

async function fetchAllAdminUsers() {
  const allUsers: AdminUserSummary[] = [];

  for (let from = 0; ; from += adminPageSize) {
    const { data, error } = await supabase
      .rpc('admin_list_users')
      .range(from, from + adminPageSize - 1);

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
  const theme = useTheme();
  const { isRTL, language, t } = useI18n();
  const { activeCheck, hasSyncError: hasGroupCheckSyncError } = useGroupCheck();
  const { activeRound, hasSyncError: hasQuestionRoundSyncError } = useQuestionRound();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRoleUserId, setExpandedRoleUserId] = useState<string | null>(null);
  const [roleFeedback, setRoleFeedback] = useState<RoleFeedback | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const usersRequestSequence = useRef(0);
  const [expandedSections, setExpandedSections] = useState<Record<AdminSection, boolean>>({
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
    setHasError(false);
    setIsLoading(true);

    try {
      const nextUsers = await fetchAllAdminUsers();

      if (requestSequence === usersRequestSequence.current) {
        setUsers(nextUsers);
      }
    } catch {
      if (requestSequence === usersRequestSequence.current) {
        setHasError(true);
      }
    } finally {
      if (requestSequence === usersRequestSequence.current) {
        setHasLoaded(true);
        setIsLoading(false);
      }
    }
  }, []);

  const assignRole = useCallback(async (userId: string, role: AssignableAppRole) => {
    setRoleFeedback(null);
    setUpdatingRoleUserId(userId);

    try {
      const { error } = await supabase.rpc('admin_set_user_role', {
        p_role: role,
        p_user_id: userId,
      });

      if (error) {
        throw error;
      }

      setUsers((current) =>
        current.map((user) => (user.user_id === userId ? { ...user, role } : user)),
      );
      setRoleFeedback({ type: 'success', userId });
      setExpandedRoleUserId(null);
    } catch {
      setRoleFeedback({ type: 'error', userId });
    } finally {
      setUpdatingRoleUserId(null);
    }
  }, []);

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
                      <ThemedText themeColor="textSecondary">{t('admin.errorBody')}</ThemedText>
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

            {item.role !== 'admin' ? (
              <>
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
              </>
            ) : null}

            {roleFeedback?.userId === item.user_id ? (
              <ThemedText
                accessibilityLiveRegion="polite"
                type="small"
                themeColor={roleFeedback.type === 'error' ? 'danger' : 'success'}>
                {t(
                  roleFeedback.type === 'error'
                    ? 'admin.roleAssignment.error'
                    : 'admin.roleAssignment.saved',
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
