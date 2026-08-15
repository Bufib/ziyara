import type { AuthError, PostgrestError, Session, User } from '@supabase/supabase-js';
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

import type { UserProfile } from '@/domain/database';
import { supabase } from '@/features/auth/supabase';

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
  profile: UserProfile | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  signUp: (
    displayName: string,
    email: string,
    password: string,
    partySize: number,
  ) => Promise<SignUpResult>;
  updatePartySize: (partySize: number) => Promise<ProfileUpdateResult>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
        setIsSessionLoading(false);

        if (!nextSession) {
          setProfile(null);
          setProfileUserId(null);
        }
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        setSession(error ? null : data.session);
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
  }, []);

  useEffect(() => {
    const userId = session?.user.id;

    if (!userId) {
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, user_id, display_name, party_size, role, created_at, updated_at')
          .eq('user_id', userId)
          .maybeSingle();

        if (isMounted) {
          setProfile(error ? null : data);
        }
      } catch {
        if (isMounted) {
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setProfileUserId(userId);
        }
      }
    };

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUp = useCallback(
    async (displayName: string, email: string, password: string, partySize: number) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, party_size: partySize },
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
    return { error };
  }, []);

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
        .select('id, user_id, display_name, party_size, role, created_at, updated_at')
        .single();

      if (!error) {
        setProfile(data);
      }

      return { error };
    },
    [session],
  );

  const currentProfile = profile?.user_id === session?.user.id ? profile : null;
  const isLoading = isSessionLoading || Boolean(session && profileUserId !== session.user.id);

  const value = useMemo<AuthContextValue>(
    () => ({
      changeEmail,
      changePassword,
      isAdmin: currentProfile?.role === 'admin',
      isLoading,
      profile: currentProfile,
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
      isLoading,
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
