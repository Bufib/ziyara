import type { AuthError, PostgrestError, Session, User } from '@supabase/supabase-js';
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

import type { MemberType, UserProfile } from '@/domain/database';
import { supabase } from '@/features/auth/supabase';
import {
  getSupabaseReadFailureKind,
  type SupabaseReadFailureKind,
  withSupabaseReadTimeout,
} from '@/features/network/supabase-read';

type AuthResult = {
  error: AuthError | null;
};

type SignUpResult = AuthResult & {
  requiresEmailConfirmation: boolean;
};

type ProfileUpdateResult = {
  error: PostgrestError | null;
};

type AuthContextValue = {
  changeEmail: (currentPassword: string, newEmail: string) => Promise<AuthResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  isAdmin: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  hasProfileError: boolean;
  profile: UserProfile | null;
  profileRefreshError: Error | null;
  profileSyncErrorKind: SupabaseReadFailureKind | null;
  refreshProfile: () => Promise<void>;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  signUp: (
    displayName: string,
    email: string,
    password: string,
    memberType: MemberType,
    partySize: number,
  ) => Promise<SignUpResult>;
  updatePartySize: (partySize: number) => Promise<ProfileUpdateResult>;
  user: User | null;
};

type ProfileSyncState = {
  error: Error | null;
  profile: UserProfile | null;
  status: 'error' | 'idle' | 'loading' | 'ready' | 'refreshing';
  userId: string | null;
};

const initialProfileSyncState: ProfileSyncState = {
  error: null,
  profile: null,
  status: 'idle',
  userId: null,
};

function getProfileRefreshError(error: unknown) {
  if (error instanceof Error) {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return new Error(error.message);
  }

  return new Error('Das Profil konnte nicht geladen werden.');
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [profileSyncState, setProfileSyncState] = useState(initialProfileSyncState);
  const [session, setSession] = useState<Session | null>(null);
  const profileSyncStateRef = useRef(initialProfileSyncState);
  const profileRequestSequence = useRef(0);
  const sessionUserIdRef = useRef<string | null>(null);

  const updateProfileSyncState = useCallback(
    (update: (current: ProfileSyncState) => ProfileSyncState) => {
      const nextState = update(profileSyncStateRef.current);
      profileSyncStateRef.current = nextState;
      setProfileSyncState(nextState);
    },
    [],
  );

  const applySession = useCallback(
    (nextSession: Session | null) => {
      const nextUserId = nextSession?.user.id ?? null;

      if (sessionUserIdRef.current !== nextUserId) {
        sessionUserIdRef.current = nextUserId;
        profileRequestSequence.current += 1;
        updateProfileSyncState(() => ({
          error: null,
          profile: null,
          status: nextUserId ? 'loading' : 'idle',
          userId: nextUserId,
        }));
      }

      setSession(nextSession);
    },
    [updateProfileSyncState],
  );

  useEffect(() => {
    let isMounted = true;
    let hasReceivedAuthEvent = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        hasReceivedAuthEvent = true;
        applySession(nextSession);
        setIsSessionLoading(false);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (!hasReceivedAuthEvent) {
          applySession(error ? null : data.session);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsSessionLoading(false);
        }
      });

    const appStateSubscription =
      Platform.OS === 'web'
        ? null
        : AppState.addEventListener('change', (state) => {
            if (state === 'active') {
              supabase.auth.startAutoRefresh();
            } else {
              supabase.auth.stopAutoRefresh();
            }
          });

    if (Platform.OS !== 'web' && AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      appStateSubscription?.remove();

      if (Platform.OS !== 'web') {
        supabase.auth.stopAutoRefresh();
      }
    };
  }, [applySession]);

  const refreshProfile = useCallback(async () => {
    const userId = sessionUserIdRef.current;
    const requestSequence = ++profileRequestSequence.current;

    if (!userId) {
      return;
    }

    const hasCurrentProfile =
      profileSyncStateRef.current.userId === userId &&
      profileSyncStateRef.current.profile?.user_id === userId;

    updateProfileSyncState((current) => {
      if (current.userId !== userId) {
        return current;
      }

      return {
        ...current,
        error: null,
        profile: hasCurrentProfile ? current.profile : null,
        status: hasCurrentProfile ? 'refreshing' : 'loading',
      };
    });

    try {
      const { data, error } = await withSupabaseReadTimeout((signal) =>
        supabase
          .from('profiles')
          .select('id, user_id, display_name, member_type, party_size, role, created_at, updated_at')
          .eq('user_id', userId)
          .abortSignal(signal)
          .maybeSingle(),
      );

      if (error) {
        throw error;
      }

      if (
        requestSequence === profileRequestSequence.current &&
        sessionUserIdRef.current === userId
      ) {
        updateProfileSyncState((current) => {
          if (current.userId !== userId) {
            return current;
          }

          if (!data) {
            return {
              error: new Error('Das Profil wurde nicht gefunden.'),
              profile: null,
              status: 'error',
              userId,
            };
          }

          return { error: null, profile: data, status: 'ready', userId };
        });
      }
    } catch (error) {
      if (
        requestSequence === profileRequestSequence.current &&
        sessionUserIdRef.current === userId
      ) {
        const profileRefreshError = getProfileRefreshError(error);

        updateProfileSyncState((current) => {
          if (current.userId !== userId) {
            return current;
          }

          const canKeepProfile = current.profile?.user_id === userId;

          return {
            ...current,
            error: profileRefreshError,
            profile: canKeepProfile ? current.profile : null,
            status: canKeepProfile ? 'ready' : 'error',
          };
        });
      }
    }
  }, [updateProfileSyncState]);

  useEffect(() => {
    if (!session?.user.id || isSessionLoading) {
      return;
    }

    const profileLoadTimeout = setTimeout(() => void refreshProfile(), 0);

    return () => {
      clearTimeout(profileLoadTimeout);
      profileRequestSequence.current += 1;
    };
  }, [isSessionLoading, refreshProfile, session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;

    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`own-profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          filter: `user_id=eq.${userId}`,
          schema: 'public',
          table: 'profiles',
        },
        () => void refreshProfile(),
      )
      .subscribe();
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshProfile();
      }
    });

    return () => {
      appStateSubscription.remove();
      void supabase.removeChannel(channel);
    };
  }, [refreshProfile, session?.user.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(
    async (
      displayName: string,
      email: string,
      password: string,
      memberType: MemberType,
      partySize: number,
    ) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, member_type: memberType, party_size: partySize },
        },
      });

      return {
        error,
        requiresEmailConfirmation: !error && !data.session,
      };
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      applySession(null);
    }

    return { error };
  }, [applySession]);

  const verifyCurrentPassword = useCallback(
    async (currentPassword: string) => {
      if (!session?.user.email) {
        return { error: null, verified: false };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      });

      return { error, verified: !error };
    },
    [session],
  );

  const changeEmail = useCallback(
    async (currentPassword: string, newEmail: string) => {
      const verification = await verifyCurrentPassword(currentPassword);

      if (!verification.verified) {
        if (!verification.error) {
          throw new Error('Das Konto hat keine E-Mail-Adresse.');
        }

        return { error: verification.error };
      }

      const { error } = await supabase.auth.updateUser({ email: newEmail });
      return { error };
    },
    [verifyCurrentPassword],
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const verification = await verifyCurrentPassword(currentPassword);

      if (!verification.verified) {
        if (!verification.error) {
          throw new Error('Das Konto hat keine E-Mail-Adresse.');
        }

        return { error: verification.error };
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error };
    },
    [verifyCurrentPassword],
  );

  const updatePartySize = useCallback(
    async (partySize: number) => {
      const userId = session?.user.id;

      if (!userId) {
        throw new Error('Für die Änderung ist eine Anmeldung erforderlich.');
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ party_size: partySize })
        .eq('user_id', userId)
        .select('id, user_id, display_name, member_type, party_size, role, created_at, updated_at')
        .single();

      if (!error && sessionUserIdRef.current === userId) {
        profileRequestSequence.current += 1;
        updateProfileSyncState((current) =>
          current.userId === userId
            ? { error: null, profile: data, status: 'ready', userId }
            : current,
        );
      }

      return { error };
    },
    [session, updateProfileSyncState],
  );

  const currentProfile =
    profileSyncState.userId === session?.user.id &&
    profileSyncState.profile?.user_id === session?.user.id
      ? profileSyncState.profile
      : null;
  const isLoading =
    isSessionLoading ||
    Boolean(
      session &&
        (profileSyncState.userId !== session.user.id || profileSyncState.status === 'loading'),
    );
  const isRefreshing = Boolean(currentProfile && profileSyncState.status === 'refreshing');
  const hasProfileError = Boolean(session && !isLoading && currentProfile === null);
  const profileRefreshError = currentProfile ? profileSyncState.error : null;
  const profileSyncErrorKind =
    session && profileSyncState.error
      ? getSupabaseReadFailureKind(profileSyncState.error)
      : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      changeEmail,
      changePassword,
      hasProfileError,
      isAdmin: currentProfile?.role === 'admin',
      isLoading,
      isRefreshing,
      profile: currentProfile,
      profileRefreshError,
      profileSyncErrorKind,
      refreshProfile,
      session,
      signIn,
      signOut,
      signUp,
      user: session?.user ?? null,
      updatePartySize,
    }),
    [
      changeEmail,
      changePassword,
      currentProfile,
      hasProfileError,
      isLoading,
      isRefreshing,
      profileRefreshError,
      profileSyncErrorKind,
      refreshProfile,
      session,
      signIn,
      signOut,
      signUp,
      updatePartySize,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden.');
  }

  return value;
}

export function getAuthErrorTranslationKey(error: AuthError) {
  switch (error.code) {
    case 'email_not_confirmed':
      return 'auth.error.emailNotConfirmed';
    case 'invalid_credentials':
      return 'auth.error.invalidCredentials';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'auth.error.rateLimit';
    case 'signup_disabled':
      return 'auth.error.signupDisabled';
    case 'user_already_exists':
    case 'email_exists':
      return 'auth.error.userExists';
    case 'weak_password':
      return 'auth.error.weakPassword';
    default:
      return 'auth.error.generic';
  }
}
