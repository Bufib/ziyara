import type { PostgrestError } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import type { GroupCheck } from '@/domain/database';
import { useAuth } from '@/features/auth/auth-context';
import { supabase } from '@/features/auth/supabase';

type GroupCheckActionResult = {
  error: PostgrestError | null;
};

type SyncState = 'error' | 'loading' | 'ready';

type GroupCheckContextValue = {
  activeCheck: GroupCheck | null;
  closeCheck: (checkId: number) => Promise<GroupCheckActionResult>;
  currentResponse: boolean | null;
  hasSyncError: boolean;
  isBlocking: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  respond: (checkId: number, answer: boolean) => Promise<GroupCheckActionResult>;
  startCheck: (question: string) => Promise<GroupCheckActionResult>;
};

const GroupCheckContext = createContext<GroupCheckContextValue | null>(null);

export function GroupCheckProvider({ children }: PropsWithChildren) {
  const { isAdmin, isLoading: isAuthLoading, profile, session } = useAuth();
  const [activeCheck, setActiveCheck] = useState<GroupCheck | null>(null);
  const [currentResponse, setCurrentResponse] = useState<boolean | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('loading');

  const refresh = useCallback(async () => {
    if (!session) {
      setActiveCheck(null);
      setCurrentResponse(null);
      setSyncState('ready');
      return;
    }

    try {
      const { data: check, error: checkError } = await supabase
        .from('group_checks')
        .select('id, question, created_by_profile_id, created_at, closed_at')
        .is('closed_at', null)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      let response: boolean | null = null;

      if (check && profile) {
        const { data: savedResponse, error: responseError } = await supabase
          .from('group_check_responses')
          .select('answer')
          .eq('check_id', check.id)
          .eq('profile_id', profile.id)
          .maybeSingle();

        if (responseError) {
          throw responseError;
        }

        response = savedResponse?.answer ?? null;
      }

      setActiveCheck(check);
      setCurrentResponse(response);
      setSyncState('ready');
    } catch {
      setSyncState('error');
    }
  }, [profile, session]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const initialRefreshTimeout = setTimeout(() => void refresh(), 0);

    if (!session) {
      return () => clearTimeout(initialRefreshTimeout);
    }

    const channel = supabase
      .channel(`group-check-state:${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_checks' },
        () => void refresh(),
      )
      .subscribe();

    const pollingInterval = setInterval(() => void refresh(), 15_000);
    const appStateSubscription =
      Platform.OS === 'web'
        ? null
        : AppState.addEventListener('change', (state) => {
            if (state === 'active') {
              void refresh();
            }
          });

    return () => {
      clearTimeout(initialRefreshTimeout);
      clearInterval(pollingInterval);
      appStateSubscription?.remove();
      void supabase.removeChannel(channel);
    };
  }, [isAuthLoading, refresh, session]);

  const startCheck = useCallback(
    async (question: string) => {
      const { error } = await supabase.rpc('start_group_check', { p_question: question });
      await refresh();

      return { error };
    },
    [refresh],
  );

  const closeCheck = useCallback(
    async (checkId: number) => {
      const { error } = await supabase.rpc('close_group_check', { p_check_id: checkId });
      await refresh();

      return { error };
    },
    [refresh],
  );

  const respond = useCallback(
    async (checkId: number, answer: boolean) => {
      const { error } = await supabase.rpc('respond_to_group_check', {
        p_answer: answer,
        p_check_id: checkId,
      });

      if (!error) {
        setCurrentResponse(answer);
      }

      return { error };
    },
    [],
  );

  const hasSyncError = syncState === 'error';
  const isLoading = syncState === 'loading';
  const isBlocking = Boolean(session && !isAdmin && (activeCheck || hasSyncError));

  const value = useMemo<GroupCheckContextValue>(
    () => ({
      activeCheck,
      closeCheck,
      currentResponse,
      hasSyncError,
      isBlocking,
      isLoading,
      refresh,
      respond,
      startCheck,
    }),
    [
      activeCheck,
      closeCheck,
      currentResponse,
      hasSyncError,
      isBlocking,
      isLoading,
      refresh,
      respond,
      startCheck,
    ],
  );

  return <GroupCheckContext.Provider value={value}>{children}</GroupCheckContext.Provider>;
}

export function useGroupCheck() {
  const value = useContext(GroupCheckContext);

  if (!value) {
    throw new Error('useGroupCheck muss innerhalb von GroupCheckProvider verwendet werden.');
  }

  return value;
}
