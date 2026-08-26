import { describe, expect, it } from '@jest/globals';

import { parsePasswordRecoveryLink } from '@/features/auth/password-recovery-link';

describe('parsePasswordRecoveryLink', () => {
  it('parses an implicit recovery session from a native deep link', () => {
    expect(
      parsePasswordRecoveryLink(
        'ziyara:///reset-password#access_token=access&refresh_token=refresh&type=recovery',
      ),
    ).toEqual({
      accessToken: 'access',
      kind: 'implicit',
      refreshToken: 'refresh',
    });
  });

  it('accepts the custom-scheme host form used by mobile redirects', () => {
    expect(
      parsePasswordRecoveryLink(
        'ziyara://reset-password#access_token=access&refresh_token=refresh&type=recovery',
      ),
    ).toMatchObject({ kind: 'implicit' });
  });

  it('parses PKCE recovery codes only on the dedicated route', () => {
    expect(
      parsePasswordRecoveryLink(
        'ziyara:///reset-password?code=recovery-code&sb_flow_id=flow-id',
      ),
    ).toEqual({ code: 'recovery-code', flowId: 'flow-id', kind: 'pkce' });
    expect(parsePasswordRecoveryLink('ziyara:///login?code=login-code')).toBeNull();
  });

  it('parses recovery token hashes for customized email templates', () => {
    expect(
      parsePasswordRecoveryLink(
        'https://example.test/reset-password?token_hash=hash&type=recovery',
      ),
    ).toEqual({ kind: 'token_hash', tokenHash: 'hash' });
  });

  it('does not treat signup or normal login links as password recovery', () => {
    expect(
      parsePasswordRecoveryLink(
        'ziyara:///reset-password#access_token=access&refresh_token=refresh&type=signup',
      ),
    ).toBeNull();
    expect(
      parsePasswordRecoveryLink(
        'ziyara:///login#access_token=access&refresh_token=refresh&type=recovery',
      ),
    ).toBeNull();
  });

  it('surfaces recovery link errors without accepting credentials', () => {
    expect(
      parsePasswordRecoveryLink(
        'ziyara:///reset-password#error=access_denied&error_code=otp_expired&error_description=Expired',
      ),
    ).toEqual({
      errorCode: 'otp_expired',
      errorDescription: 'Expired',
      kind: 'error',
    });
  });

  it('rejects malformed or incomplete recovery URLs', () => {
    expect(parsePasswordRecoveryLink('not a url')).toBeNull();
    expect(parsePasswordRecoveryLink('ziyara:///reset-password?type=recovery')).toBeNull();
  });
});
