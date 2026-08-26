export type DeleteAccountCode =
  | 'account_deleted'
  | 'deletion_failed'
  | 'invalid_request'
  | 'last_admin'
  | 'method_not_allowed'
  | 'unauthorized';

export type DeleteAccountRequest = {
  authorization: string | null;
  body: unknown;
  method: string;
};

export type DeleteAccountResponse = {
  body: {
    code: DeleteAccountCode;
    message: string;
  };
  status: number;
};

export type DeleteAccountDependencies = {
  canDeleteCurrentUser: (userId: string) => Promise<boolean>;
  deleteCurrentUser: (
    userId: string,
  ) => Promise<{ errorCode: 'last_admin' | 'unknown' | null }>;
  getAuthenticatedUserId: (accessToken: string) => Promise<string | null>;
};

function getBearerToken(authorization: string | null) {
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

function hasClientSuppliedDeletionTarget(body: unknown) {
  if (body === null || body === undefined) {
    return false;
  }

  return (
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body as Record<string, unknown>).length > 0
  );
}

export async function handleDeleteAccountRequest(
  request: DeleteAccountRequest,
  dependencies: DeleteAccountDependencies,
): Promise<DeleteAccountResponse> {
  if (request.method !== 'POST') {
    return {
      body: { code: 'method_not_allowed', message: 'POST is required.' },
      status: 405,
    };
  }

  if (hasClientSuppliedDeletionTarget(request.body)) {
    return {
      body: {
        code: 'invalid_request',
        message: 'Account deletion does not accept a target user ID.',
      },
      status: 400,
    };
  }

  const accessToken = getBearerToken(request.authorization);

  if (!accessToken) {
    return {
      body: { code: 'unauthorized', message: 'Authentication is required.' },
      status: 401,
    };
  }

  try {
    const authenticatedUserId =
      await dependencies.getAuthenticatedUserId(accessToken);

    if (!authenticatedUserId) {
      return {
        body: { code: 'unauthorized', message: 'Authentication is required.' },
        status: 401,
      };
    }

    if (!(await dependencies.canDeleteCurrentUser(authenticatedUserId))) {
      return {
        body: {
          code: 'last_admin',
          message: 'The last administrator cannot delete their account.',
        },
        status: 409,
      };
    }

    const deletion = await dependencies.deleteCurrentUser(authenticatedUserId);

    if (deletion.errorCode) {
      return deletion.errorCode === 'last_admin'
        ? {
            body: {
              code: 'last_admin',
              message: 'The last administrator cannot delete their account.',
            },
            status: 409,
          }
        : {
            body: {
              code: 'deletion_failed',
              message: 'The account could not be deleted.',
            },
            status: 500,
          };
    }

    return {
      body: {
        code: 'account_deleted',
        message: 'The authenticated account was deleted.',
      },
      status: 200,
    };
  } catch {
    return {
      body: {
        code: 'deletion_failed',
        message: 'The account could not be deleted.',
      },
      status: 500,
    };
  }
}
