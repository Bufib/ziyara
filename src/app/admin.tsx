import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import type { AdminUserSummary } from '@/domain/database';
import { supabase } from '@/features/auth/supabase';
import { AdminGroupCheckPanel } from '@/features/group-check/AdminGroupCheckPanel';
import { AdminQuestionRoundPanel } from '@/features/question-round/AdminQuestionRoundPanel';
import { useI18n } from '@/features/i18n/i18n';
import { useTheme } from '@/hooks/use-theme';

const localeByLanguage = {
  ar: 'ar',
  de: 'de-DE',
  en: 'en-US',
} as const;

const adminPageSize = 200;

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
  const { language, t } = useI18n();
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(localeByLanguage[language], {
        dateStyle: 'medium',
      }),
    [language],
  );
  const representedPeople = useMemo(
    () => users.reduce((total, user) => total + user.party_size, 0),
    [users],
  );

  const loadUsers = useCallback(async () => {
    setHasError(false);
    setIsLoading(true);

    try {
      setUsers(await fetchAllAdminUsers());
    } catch {
      setHasError(true);
    } finally {
      setHasLoaded(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadInitialUsers = async () => {
      try {
        const data = await fetchAllAdminUsers();

        if (!isMounted) {
          return;
        }

        setUsers(data);
      } catch {
        if (isMounted) {
          setHasError(true);
        }
      } finally {
        if (isMounted) {
          setHasLoaded(true);
          setIsLoading(false);
        }
      }
    };

    void loadInitialUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (value: string) => dateFormatter.format(new Date(value));

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={users}
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
          <View style={styles.header}>
            <ThemedText type="title">{t('admin.title')}</ThemedText>
            <ThemedText themeColor="textSecondary">{t('admin.description')}</ThemedText>
            {hasLoaded && !hasError ? (
              <View style={styles.counts}>
                <ThemedText type="smallBold" themeColor="accent">
                  {t('admin.userCount', { count: users.length })}
                </ThemedText>
                <ThemedText type="smallBold" themeColor="accent">
                  {t('admin.personCount', { count: representedPeople })}
                </ThemedText>
              </View>
            ) : null}
            <AdminGroupCheckPanel />
            <AdminQuestionRoundPanel />
          </View>
        }
        ListEmptyComponent={
          isLoading && !hasLoaded ? (
            <View style={styles.state}>
              <ActivityIndicator color={theme.accent} size="large" />
              <ThemedText themeColor="textSecondary">{t('admin.loading')}</ThemedText>
            </View>
          ) : hasError ? (
            <Card style={styles.state}>
              <ThemedText type="heading">{t('admin.errorTitle')}</ThemedText>
              <ThemedText themeColor="textSecondary">{t('admin.errorBody')}</ThemedText>
              <Button icon="refresh" label={t('admin.retry')} onPress={() => void loadUsers()} />
            </Card>
          ) : (
            <Card style={styles.state}>
              <ThemedText type="heading">{t('admin.emptyTitle')}</ThemedText>
              <ThemedText themeColor="textSecondary">{t('admin.emptyBody')}</ThemedText>
            </Card>
          )
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

            <ThemedText>{item.email}</ThemedText>

            <View style={styles.metadata}>
              <ThemedText type="small" themeColor="textSecondary">
                {t('admin.partySize', { count: item.party_size })}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('admin.profileId', { id: item.profile_id })}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t('admin.registeredAt', { date: formatDate(item.created_at) })}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.last_sign_in_at
                  ? t('admin.lastSignIn', { date: formatDate(item.last_sign_in_at) })
                  : t('admin.neverSignedIn')}
              </ThemedText>
            </View>
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
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  counts: {
    gap: Spacing.half,
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
  metadata: {
    gap: Spacing.half,
  },
});
