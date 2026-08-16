import type { PostgrestError } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
const fallbackRefreshIntervalMs = 60_000;
const fallbackRefreshJitterMs = 30_000;

export function GroupCheckProvider({ children }: PropsWithChildren) {
  const { isAdmin, isLoading: isAuthLoading, profile, session } = useAuth();
  const [activeCheck, setActiveCheck] = useState<GroupCheck | null>(null);
  const [currentResponse, setCurrentResponse] = useState<boolean | null>(null);
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('loading');
  const refreshSequence = useRef(0);
  const profileId = profile?.id ?? null;
  const userId = session?.user.id ?? null;

  const refresh = useCallback(async () => {
    const requestSequence = ++refreshSequence.current;

    if (!userId) {
      setActiveCheck(null);
      setCurrentResponse(null);
      setSyncedUserId(null);
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

      if (check && profileId !== null) {
        const { data: savedResponse, error: responseError } = await supabase
          .from('group_check_responses')
          .select('answer')
          .eq('check_id', check.id)
          .eq('profile_id', profileId)
          .maybeSingle();

        if (responseError) {
          throw responseError;
        }

        response = savedResponse?.answer ?? null;
      }

      if (requestSequence === refreshSequence.current) {
        setActiveCheck(check);
        setCurrentResponse(response);
        setSyncedUserId(userId);
        setSyncState('ready');
      }
    } catch {
      if (requestSequence === refreshSequence.current) {
        setSyncedUserId(userId);
        setSyncState('error');
      }
    }
  }, [profileId, userId]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const initialRefreshTimeout = setTimeout(() => void refresh(), 0);

    if (!userId) {
      return () => clearTimeout(initialRefreshTimeout);
    }

    const channel = supabase
      .channel(`group-check-state:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_checks' },
        () => void refresh(),
      )
      .subscribe();

    let pollingTimeout: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const scheduleFallbackRefresh = () => {
      if (stopped) {
        return;
      }

      const delay = fallbackRefreshIntervalMs + Math.random() * fallbackRefreshJitterMs;
      pollingTimeout = setTimeout(() => {
        void refresh().finally(scheduleFallbackRefresh);
      }, delay);
    };
    scheduleFallbackRefresh();
    const appStateSubscription =
      Platform.OS === 'web'
        ? null
        : AppState.addEventListener('change', (state) => {
            if (state === 'active') {
              void refresh();
            }
          });

    return () => {
      stopped = true;
      clearTimeout(initialRefreshTimeout);
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
      appStateSubscription?.remove();
      void supabase.removeChannel(channel);
    };
  }, [isAuthLoading, refresh, userId]);

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
  const isLoading = isAuthLoading || syncedUserId !== userId || syncState === 'loading';
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
