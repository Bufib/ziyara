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

import type { QuestionRound } from '@/domain/database';
import { useAuth } from '@/features/auth/auth-context';
import { supabase } from '@/features/auth/supabase';

type QuestionRoundActionResult = {
  error: PostgrestError | null;
};

type QuestionRoundContextValue = {
  activeRound: QuestionRound | null;
  hasSyncError: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  submitQuestion: (roundId: number, question: string) => Promise<QuestionRoundActionResult>;
};

type SyncState = 'error' | 'loading' | 'ready';

const QuestionRoundContext = createContext<QuestionRoundContextValue | null>(null);

export function QuestionRoundProvider({ children }: PropsWithChildren) {
  const { isLoading: isAuthLoading, session } = useAuth();
  const [activeRound, setActiveRound] = useState<QuestionRound | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('loading');

  const refresh = useCallback(async () => {
    if (!session) {
      setActiveRound(null);
      setSyncState('ready');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('question_rounds')
        .select('id, created_at, closed_at')
        .is('closed_at', null)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setActiveRound(data);
      setSyncState('ready');
    } catch {
      setSyncState('error');
    }
  }, [session]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const initialRefreshTimeout = setTimeout(() => void refresh(), 0);

    if (!session) {
      return () => clearTimeout(initialRefreshTimeout);
    }

    const channel = supabase
      .channel(`question-round-state:${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'question_rounds' },
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

  const submitQuestion = useCallback(async (roundId: number, question: string) => {
    const { error } = await supabase.rpc('submit_anonymous_question', {
      p_question: question,
      p_round_id: roundId,
    });

    return { error };
  }, []);

  const value = useMemo<QuestionRoundContextValue>(
    () => ({
      activeRound,
      hasSyncError: syncState === 'error',
      isLoading: syncState === 'loading',
      refresh,
      submitQuestion,
    }),
    [activeRound, refresh, submitQuestion, syncState],
  );

  return <QuestionRoundContext.Provider value={value}>{children}</QuestionRoundContext.Provider>;
}

export function useQuestionRound() {
  const value = useContext(QuestionRoundContext);

  if (!value) {
    throw new Error('useQuestionRound muss innerhalb von QuestionRoundProvider verwendet werden.');
  }

  return value;
}
