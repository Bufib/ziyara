import * as Linking from 'expo-linking';

export type PasswordRecoveryLink =
  | {
      accessToken: string;
      kind: 'implicit';
      refreshToken: string;
    }
  | {
      code: string;
      flowId?: string;
      kind: 'pkce';
    }
  | {
      errorCode: string;
      errorDescription: string;
      kind: 'error';
    }
  | {
      kind: 'token_hash';
      tokenHash: string;
    };

function isPasswordResetRoute(url: URL) {
  const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';
  return (
    (url.hostname === 'reset-password' && normalizedPath === '/') ||
    normalizedPath === '/reset-password'
  );
}

function getLinkParams(url: URL) {
  const params = new URLSearchParams(url.search);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));

  hashParams.forEach((value, key) => params.set(key, value));
  return params;
}

export function parsePasswordRecoveryLink(
  rawUrl: string,
): PasswordRecoveryLink | null {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!isPasswordResetRoute(url)) {
    return null;
  }

  const params = getLinkParams(url);
  const errorCode = params.get('error_code') ?? params.get('error');

  if (errorCode) {
    return {
      errorCode,
      errorDescription:
        params.get('error_description') ?? 'The password recovery link is invalid.',
      kind: 'error',
    };
  }

  const linkType = params.get('type');

  if (linkType && linkType !== 'recovery') {
    return null;
  }

  const code = params.get('code');

  if (code) {
    return {
      code,
      flowId: params.get('sb_flow_id') ?? undefined,
      kind: 'pkce',
    };
  }

  if (linkType !== 'recovery') {
    return null;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    return { accessToken, kind: 'implicit', refreshToken };
  }

  const tokenHash = params.get('token_hash');

  return tokenHash ? { kind: 'token_hash', tokenHash } : null;
}

export function passwordRecoveryRedirectUrl() {
  return Linking.createURL('/reset-password');
}
