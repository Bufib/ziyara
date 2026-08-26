import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { PostgrestError, type AuthChangeEvent, type Session, type User } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import type { Mock } from 'jest-mock';

import type { UserProfile } from '@/domain/database';
import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { supabase } from '@/features/auth/supabase';

jest.mock('@/features/auth/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
      updateUser: jest.fn(),
    },
    channel: jest.fn(),
    from: jest.fn(),
    removeChannel: jest.fn(),
  },
}));

type AuthValue = ReturnType<typeof useAuth>;
type AuthStateChangeCallback = (event: AuthChangeEvent, session: Session | null) => void;
type ProfileQueryResponse = {
  data: UserProfile | null;
  error: PostgrestError | null;
};
type MockFunction = Mock<(...args: never[]) => unknown>;
type MockChannel = {
  on: MockFunction;
  subscribe: MockFunction;
};
type MockSupabase = {
  auth: {
    getSession: MockFunction;
    onAuthStateChange: MockFunction;
    signInWithPassword: MockFunction;
    signOut: MockFunction;
    signUp: MockFunction;
    startAutoRefresh: MockFunction;
    stopAutoRefresh: MockFunction;
    updateUser: MockFunction;
  };
  channel: MockFunction;
  from: MockFunction;
  removeChannel: MockFunction;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const mockSupabase = supabase as unknown as MockSupabase;
const actEnvironmentGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalActEnvironment = actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT;

let appStateListeners: Set<(state: AppStateStatus) => void>;
let authStateChangeCallback: AuthStateChangeCallback | null;
let currentAuthValue: AuthValue | null;
let profileChangeCallback: (() => void) | null;
let profileResponses: Promise<ProfileQueryResponse>[];
let renderer: ReactTestRenderer | null;

function createDeferred<T>(): Deferred<T> {
  let resolvePromise: ((value: T) => void) | null = null;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: (value) => {
      if (!resolvePromise) {
        throw new Error('Deferred Promise wurde nicht initialisiert.');
      }

      resolvePromise(value);
    },
  };
}

function createSession(userId: string): Session {
  return {
    access_token: `access-${userId}`,
    expires_at: 2_000_000_000,
    expires_in: 3_600,
    refresh_token: `refresh-${userId}`,
    token_type: 'bearer',
    user: {
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2026-08-26T00:00:00.000Z',
      email: `${userId}@example.com`,
      id: userId,
      user_metadata: {},
    } as User,
  };
}

function createProfile(
  userId: string,
  overrides: Partial<UserProfile> = {},
): UserProfile {
  return {
    created_at: '2026-08-26T00:00:00.000Z',
    display_name: `Profil ${userId}`,
    id: userId === 'user-a' ? 1 : 2,
    member_type: 'brother',
    party_size: 1,
    role: 'user',
    updated_at: '2026-08-26T00:00:00.000Z',
    user_id: userId,
    ...overrides,
  };
}

function createPostgrestError(message: string): PostgrestError {
  return new PostgrestError({
    code: 'PGRST000',
    details: 'Testfehler',
    hint: '',
    message,
  });
}

function AuthProbe() {
  const authValue = useAuth();

  useEffect(() => {
    currentAuthValue = authValue;
  }, [authValue]);

  return null;
}

function getAuthValue() {
  if (!currentAuthValue) {
    throw new Error('AuthProvider wurde noch nicht gerendert.');
  }

  return currentAuthValue;
}

async function flushAsyncWork() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function waitForCondition(condition: () => boolean) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (condition()) {
      return;
    }

    await act(async () => {
      await flushAsyncWork();
    });
  }

  throw new Error('Der erwartete Auth-Testzustand wurde nicht erreicht.');
}

async function renderAuthProvider() {
  await act(async () => {
    renderer = create(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );
    await flushAsyncWork();
  });
}

async function emitAuthState(session: Session | null, event: AuthChangeEvent = 'SIGNED_IN') {
  if (!authStateChangeCallback) {
    throw new Error('Auth-State-Callback wurde nicht registriert.');
  }

  await act(async () => {
    authStateChangeCallback?.(event, session);
    await flushAsyncWork();
  });
}

async function loadInitialProfile(profile: UserProfile) {
  const previousRequestCount = mockSupabase.from.mock.calls.length;
  profileResponses.push(Promise.resolve({ data: profile, error: null }));
  await emitAuthState(createSession(profile.user_id));
  await waitForCondition(
    () =>
      mockSupabase.from.mock.calls.length === previousRequestCount + 1 &&
      getAuthValue().profile?.user_id === profile.user_id,
  );
}

function emitAppResume() {
  for (const listener of appStateListeners) {
    listener('active');
  }
}

describe('AuthProvider profile synchronization', () => {
  beforeAll(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    appStateListeners = new Set();
    authStateChangeCallback = null;
    currentAuthValue = null;
    profileChangeCallback = null;
    profileResponses = [];
    renderer = null;

    jest.clearAllMocks();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, listener) => {
        appStateListeners.add(listener);

        return {
          remove: () => appStateListeners.delete(listener),
        } as NativeEventSubscription;
      });

    mockSupabase.auth.getSession.mockImplementation(() =>
      Promise.resolve({
        data: { session: null },
        error: null,
      }),
    );
    mockSupabase.auth.onAuthStateChange.mockImplementation(
      (callback: AuthStateChangeCallback) => {
        authStateChangeCallback = callback;

        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        };
      },
    );
    mockSupabase.auth.signInWithPassword.mockImplementation(() => Promise.resolve({ error: null }));
    mockSupabase.auth.signOut.mockImplementation(() => Promise.resolve({ error: null }));
    mockSupabase.removeChannel.mockImplementation(() => Promise.resolve('ok'));

    mockSupabase.from.mockImplementation((table: string) => {
      if (table !== 'profiles') {
        throw new Error(`Unerwartete Tabelle im Auth-Test: ${table}`);
      }

      const query = {
        abortSignal: jest.fn(),
        eq: jest.fn(),
        maybeSingle: jest.fn(),
        select: jest.fn(),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.abortSignal.mockReturnValue(query);
      query.maybeSingle.mockImplementation(() => {
        const nextResponse = profileResponses.shift();

        if (!nextResponse) {
          throw new Error('Für den Profilabruf fehlt eine Testantwort.');
        }

        return nextResponse;
      });

      return query;
    });

    mockSupabase.channel.mockImplementation(() => {
      const channel: MockChannel = {
        on: jest.fn(),
        subscribe: jest.fn(),
      };
      channel.on.mockImplementation(
        (_type: string, _filter: object, callback: () => void) => {
          profileChangeCallback = callback;
          return channel;
        },
      );
      channel.subscribe.mockReturnValue(channel);
      return channel;
    });
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => {
        renderer?.unmount();
      });
    }

    jest.restoreAllMocks();
  });

  afterAll(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  });

  it('blockiert beim initialen Login bis das Profil geladen ist', async () => {
    const session = createSession('user-a');
    const profile = createProfile('user-a');
    const initialProfile = createDeferred<ProfileQueryResponse>();
    profileResponses.push(initialProfile.promise);
    mockSupabase.auth.signInWithPassword.mockImplementation(async () => {
      authStateChangeCallback?.('SIGNED_IN', session);
      return { error: null };
    });

    await renderAuthProvider();

    await act(async () => {
      await getAuthValue().signIn('user-a@example.com', 'Passwort123');
      await flushAsyncWork();
    });

    expect(getAuthValue()).toMatchObject({
      hasProfileError: false,
      isLoading: true,
      isRefreshing: false,
      profile: null,
      session,
    });

    await act(async () => {
      initialProfile.resolve({ data: profile, error: null });
      await flushAsyncWork();
    });

    expect(getAuthValue()).toMatchObject({
      hasProfileError: false,
      isAdmin: false,
      isLoading: false,
      isRefreshing: false,
      profile,
      profileRefreshError: null,
    });
  });

  it('startet ohne Session ohne Profilabfrage', async () => {
    await renderAuthProvider();

    expect(getAuthValue()).toMatchObject({
      isLoading: false,
      profile: null,
      session: null,
    });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('behält Profil und Navigation während App-Resume erhalten', async () => {
    const profile = createProfile('user-a');
    const refresh = createDeferred<ProfileQueryResponse>();

    await renderAuthProvider();
    await loadInitialProfile(profile);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    expect(profileChangeCallback).not.toBeNull();
    profileResponses.push(refresh.promise);

    await act(async () => {
      emitAppResume();
      await Promise.resolve();
    });

    expect(mockSupabase.from).toHaveBeenCalledTimes(2);

    expect(getAuthValue()).toMatchObject({
      isLoading: false,
      isRefreshing: true,
      profile,
      profileRefreshError: null,
    });

    await act(async () => {
      refresh.resolve({ data: profile, error: null });
      await flushAsyncWork();
    });

    expect(getAuthValue()).toMatchObject({
      isLoading: false,
      isRefreshing: false,
      profile,
      profileRefreshError: null,
    });
  });

  it('übernimmt einen erfolgreichen Profilrefresh ohne blockierendes Laden', async () => {
    const profile = createProfile('user-a');
    const refreshedProfile = createProfile('user-a', { display_name: 'Aktualisiertes Profil' });
    const refresh = createDeferred<ProfileQueryResponse>();

    await renderAuthProvider();
    await loadInitialProfile(profile);
    profileResponses.push(refresh.promise);

    await act(async () => {
      void getAuthValue().refreshProfile();
      await Promise.resolve();
    });

    expect(getAuthValue()).toMatchObject({
      isLoading: false,
      isRefreshing: true,
      profile,
      profileRefreshError: null,
    });

    await act(async () => {
      refresh.resolve({ data: refreshedProfile, error: null });
      await flushAsyncWork();
    });

    expect(getAuthValue()).toMatchObject({
      isLoading: false,
      isRefreshing: false,
      profile: refreshedProfile,
      profileRefreshError: null,
    });
  });

  it('behält das Profil bei einem fehlgeschlagenen Hintergrundrefresh', async () => {
    const profile = createProfile('user-a');
    const refresh = createDeferred<ProfileQueryResponse>();

    await renderAuthProvider();
    await loadInitialProfile(profile);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    profileResponses.push(refresh.promise);

    await act(async () => {
      emitAppResume();
      await Promise.resolve();
    });
    await act(async () => {
      refresh.resolve({ data: null, error: createPostgrestError('Netzwerkfehler') });
      await flushAsyncWork();
    });

    expect(getAuthValue()).toMatchObject({
      hasProfileError: false,
      isLoading: false,
      isRefreshing: false,
      profile,
    });
    expect(getAuthValue().profileRefreshError?.message).toBe('Netzwerkfehler');
  });

  it('übernimmt Rollenänderungen aus Realtime ohne das bestehende Profil zu löschen', async () => {
    const profile = createProfile('user-a');
    const adminProfile = createProfile('user-a', { role: 'admin' });
    const refresh = createDeferred<ProfileQueryResponse>();

    await renderAuthProvider();
    await loadInitialProfile(profile);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    expect(profileChangeCallback).not.toBeNull();
    profileResponses.push(refresh.promise);

    await act(async () => {
      profileChangeCallback?.();
      await Promise.resolve();
    });

    expect(mockSupabase.from).toHaveBeenCalledTimes(2);

    expect(getAuthValue()).toMatchObject({
      isAdmin: false,
      isLoading: false,
      isRefreshing: true,
      profile,
    });

    await act(async () => {
      refresh.resolve({ data: adminProfile, error: null });
      await flushAsyncWork();
    });

    expect(getAuthValue()).toMatchObject({
      isAdmin: true,
      isLoading: false,
      isRefreshing: false,
      profile: adminProfile,
    });
  });

  it('entfernt alte Profildaten bei Benutzerwechsel und Logout sofort', async () => {
    const firstProfile = createProfile('user-a', { role: 'admin' });
    const secondSession = createSession('user-b');
    const secondProfile = createProfile('user-b');
    const switchedProfile = createDeferred<ProfileQueryResponse>();

    await renderAuthProvider();
    await loadInitialProfile(firstProfile);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    profileResponses.push(switchedProfile.promise);

    await emitAuthState(secondSession);
    await waitForCondition(() => mockSupabase.from.mock.calls.length === 2);

    expect(getAuthValue()).toMatchObject({
      isAdmin: false,
      isLoading: true,
      profile: null,
      session: secondSession,
    });

    await act(async () => {
      switchedProfile.resolve({ data: secondProfile, error: null });
      await flushAsyncWork();
    });

    expect(getAuthValue()).toMatchObject({
      isLoading: false,
      profile: secondProfile,
    });

    await act(async () => {
      await getAuthValue().signOut();
    });

    expect(getAuthValue()).toMatchObject({
      hasProfileError: false,
      isAdmin: false,
      isLoading: false,
      isRefreshing: false,
      profile: null,
      profileRefreshError: null,
      session: null,
    });
  });
});
