import type {
  TripGroup,
  TripGroupLocationRequest,
  TripGroupMemberSummary,
} from '@/domain/database';

export type TripGroupState = TripGroup & {
  is_current_user_leader: boolean;
  is_current_user_member: boolean;
  leader: TripGroupMemberSummary | null;
  location_request: TripGroupLocationRequest | null;
  members: TripGroupMemberSummary[];
};

export type TripGroupMutationFailureKind =
  | 'auth'
  | 'conflict'
  | 'not_found'
  | 'offline'
  | 'server';

export function isCurrentLocationResponse(
  request: TripGroupLocationRequest | null,
  now = new Date(),
) {
  if (!request || request.status === 'pending' || !request.location_expires_at) {
    return false;
  }

  return new Date(request.location_expires_at).getTime() > now.getTime();
}

export function buildTripGroupStates(
  groups: TripGroup[],
  members: TripGroupMemberSummary[],
  locationRequests: TripGroupLocationRequest[],
  ownParticipantIds: ReadonlySet<number>,
): TripGroupState[] {
  const membersByGroup = new Map<number, TripGroupMemberSummary[]>();
  const requestsByGroup = new Map(
    locationRequests.map((request) => [request.group_id, request]),
  );

  for (const member of members) {
    const groupMembers = membersByGroup.get(member.group_id) ?? [];
    groupMembers.push(member);
    membersByGroup.set(member.group_id, groupMembers);
  }

  return [...groups]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((group) => {
      const groupMembers = membersByGroup.get(group.id) ?? [];
      return {
        ...group,
        is_current_user_leader: ownParticipantIds.has(group.leader_participant_id),
        is_current_user_member: groupMembers.some((member) =>
          ownParticipantIds.has(member.participant_id),
        ),
        leader:
          groupMembers.find(
            (member) => member.participant_id === group.leader_participant_id,
          ) ?? null,
        location_request: requestsByGroup.get(group.id) ?? null,
        members: groupMembers,
      };
    });
}

export function shouldRetryTripGroupMutationAfterSessionRefresh(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';

  return (
    code === 'PGRST301' ||
    code === 'PGRST302' ||
    /permission denied for function (admin_upsert_trip_group|admin_delete_trip_group|admin_request_trip_group_location|respond_to_trip_group_location)/i.test(
      message,
    )
  );
}

export function getTripGroupMutationFailureKind(
  error: unknown,
): TripGroupMutationFailureKind {
  if (!error || typeof error !== 'object') return 'server';
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';

  if (
    shouldRetryTripGroupMutationAfterSessionRefresh(error) ||
    /admin access required|authentication required|user profile is required/i.test(message)
  ) {
    return 'auth';
  }
  if (code === '23505' || /only one trip group|must be unique/i.test(message)) {
    return 'conflict';
  }
  if (code === 'P0002' || /not found/i.test(message)) return 'not_found';
  if (/failed to fetch|fetch failed|load failed|network/i.test(message)) return 'offline';
  return 'server';
}
