export type ProtectedRouteDecision = 'allow' | 'loading' | 'login' | 'unauthorized';

export function getProtectedRouteDecision({
  admin,
  hasSession,
  isAdmin,
  isLoading,
}: {
  admin: boolean;
  hasSession: boolean;
  isAdmin: boolean;
  isLoading: boolean;
}): ProtectedRouteDecision {
  if (isLoading) {
    return 'loading';
  }

  if (!hasSession) {
    return 'login';
  }

  return admin && !isAdmin ? 'unauthorized' : 'allow';
}
