import { describe, expect, it } from '@jest/globals';

import { getProtectedRouteDecision } from '@/features/auth/protected-route-policy';
import {
  getProtectedReturnRoute,
  loginRoute,
  protectedRoutePaths,
} from '@/features/navigation/routes';

describe('protected navigation', () => {
  it('leitet Gäste geschützter Screens gezielt zum Login', () => {
    expect(
      getProtectedRouteDecision({
        admin: false,
        hasSession: false,
        isAdmin: false,
        isLoading: false,
      }),
    ).toBe('login');
    expect(loginRoute('/account')).toEqual({
      params: { returnTo: '/account' },
      pathname: '/login',
    });
  });

  it('erlaubt geschützte Inhalte nur mit passender Session und Rolle', () => {
    expect(
      getProtectedRouteDecision({
        admin: false,
        hasSession: true,
        isAdmin: false,
        isLoading: false,
      }),
    ).toBe('allow');
    expect(
      getProtectedRouteDecision({
        admin: true,
        hasSession: true,
        isAdmin: false,
        isLoading: false,
      }),
    ).toBe('unauthorized');
  });

  it('akzeptiert nur bekannte interne Rücksprungziele', () => {
    for (const route of protectedRoutePaths) {
      expect(getProtectedReturnRoute(route)).toBe(route);
    }

    expect(getProtectedReturnRoute('https://example.com')).toBe('/');
    expect(getProtectedReturnRoute('//example.com')).toBe('/');
  });
});
