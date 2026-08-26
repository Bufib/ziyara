import { describe, expect, it, jest } from '@jest/globals';

import {
  handleDeleteAccountRequest,
  type DeleteAccountDependencies,
} from '../../../supabase/functions/delete-account/handler';

function createDependencies(
  overrides: Partial<DeleteAccountDependencies> = {},
): DeleteAccountDependencies {
  return {
    canDeleteCurrentUser: jest.fn(async () => true),
    deleteCurrentUser: jest.fn(async () => ({ errorCode: null })),
    getAuthenticatedUserId: jest.fn(async () => 'verified-user-id'),
    ...overrides,
  };
}

describe('delete-account Edge Function contract', () => {
  it('rejects methods other than POST', async () => {
    const result = await handleDeleteAccountRequest(
      { authorization: 'Bearer valid-token', body: null, method: 'DELETE' },
      createDependencies(),
    );

    expect(result).toMatchObject({
      body: { code: 'method_not_allowed' },
      status: 405,
    });
  });

  it('rejects every client-supplied target user ID', async () => {
    const dependencies = createDependencies();
    const result = await handleDeleteAccountRequest(
      {
        authorization: 'Bearer valid-token',
        body: { userId: 'some-other-user' },
        method: 'POST',
      },
      dependencies,
    );

    expect(result).toMatchObject({ body: { code: 'invalid_request' }, status: 400 });
    expect(dependencies.getAuthenticatedUserId).not.toHaveBeenCalled();
    expect(dependencies.deleteCurrentUser).not.toHaveBeenCalled();
  });

  it('requires a bearer user session', async () => {
    const dependencies = createDependencies();
    const result = await handleDeleteAccountRequest(
      { authorization: null, body: {}, method: 'POST' },
      dependencies,
    );

    expect(result).toMatchObject({ body: { code: 'unauthorized' }, status: 401 });
    expect(dependencies.getAuthenticatedUserId).not.toHaveBeenCalled();
  });

  it('rejects a bearer token that Auth cannot verify', async () => {
    const dependencies = createDependencies({
      getAuthenticatedUserId: jest.fn(async () => null),
    });
    const result = await handleDeleteAccountRequest(
      { authorization: 'Bearer invalid-token', body: {}, method: 'POST' },
      dependencies,
    );

    expect(result).toMatchObject({ body: { code: 'unauthorized' }, status: 401 });
    expect(dependencies.deleteCurrentUser).not.toHaveBeenCalled();
  });

  it('protects the final administrator before calling Auth deletion', async () => {
    const dependencies = createDependencies({
      canDeleteCurrentUser: jest.fn(async () => false),
    });
    const result = await handleDeleteAccountRequest(
      { authorization: 'Bearer valid-token', body: {}, method: 'POST' },
      dependencies,
    );

    expect(result).toMatchObject({ body: { code: 'last_admin' }, status: 409 });
    expect(dependencies.deleteCurrentUser).not.toHaveBeenCalled();
  });

  it('deletes exactly the user ID returned by verified Auth', async () => {
    const dependencies = createDependencies();
    const result = await handleDeleteAccountRequest(
      { authorization: 'Bearer valid-token', body: {}, method: 'POST' },
      dependencies,
    );

    expect(dependencies.getAuthenticatedUserId).toHaveBeenCalledWith('valid-token');
    expect(dependencies.deleteCurrentUser).toHaveBeenCalledWith('verified-user-id');
    expect(result).toMatchObject({ body: { code: 'account_deleted' }, status: 200 });
  });

  it('maps the transactional last-admin trigger result without reporting success', async () => {
    const result = await handleDeleteAccountRequest(
      { authorization: 'Bearer valid-token', body: {}, method: 'POST' },
      createDependencies({
        deleteCurrentUser: jest.fn(async () => ({ errorCode: 'last_admin' as const })),
      }),
    );

    expect(result).toMatchObject({ body: { code: 'last_admin' }, status: 409 });
  });
});
