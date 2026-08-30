import { describe, expect, it } from '@jest/globals';

import type {
  TripGroup,
  TripGroupLocationRequest,
  TripGroupMemberSummary,
} from '@/domain/database';
import {
  buildTripGroupStates,
  getTripGroupMutationFailureKind,
  isCurrentLocationResponse,
  shouldRetryTripGroupMutationAfterSessionRefresh,
} from '@/features/trip-groups/trip-group-state';

const group: TripGroup = {
  created_at: '2026-08-30T08:00:00.000Z',
  created_by_profile_id: 1,
  id: 10,
  leader_participant_id: 101,
  name: 'Gruppe Abbas',
  trip_id: 5,
  updated_at: '2026-08-30T08:00:00.000Z',
};
const members: TripGroupMemberSummary[] = [
  {
    display_name: 'Anführer',
    group_id: 10,
    is_leader: true,
    participant_code: 'BER01',
    participant_id: 101,
    trip_id: 5,
  },
  {
    display_name: 'Mitglied',
    group_id: 10,
    is_leader: false,
    participant_code: 'BER02',
    participant_id: 102,
    trip_id: 5,
  },
];
const locationRequest: TripGroupLocationRequest = {
  accuracy_meters: null,
  group_id: 10,
  id: 50,
  latitude: null,
  location_expires_at: null,
  longitude: null,
  requested_at: '2026-08-30T08:30:00.000Z',
  requested_by_profile_id: 1,
  responded_at: null,
  status: 'pending',
  trip_id: 5,
};

describe('trip group state', () => {
  it('verknüpft Gruppen, Mitglieder, Anführer und Standortanfrage', () => {
    expect(
      buildTripGroupStates([group], members, [locationRequest], new Set([101])),
    ).toEqual([
      {
        ...group,
        is_current_user_leader: true,
        is_current_user_member: true,
        leader: members[0],
        location_request: locationRequest,
        members,
      },
    ]);
  });

  it('erkennt nur noch gültige Standortantworten als aktuell', () => {
    const shared = {
      ...locationRequest,
      latitude: 32.61,
      location_expires_at: '2026-08-30T09:15:00.000Z',
      longitude: 44.03,
      responded_at: '2026-08-30T09:00:00.000Z',
      status: 'shared' as const,
    };

    expect(isCurrentLocationResponse(shared, new Date('2026-08-30T09:14:59.000Z'))).toBe(true);
    expect(isCurrentLocationResponse(shared, new Date('2026-08-30T09:15:00.000Z'))).toBe(false);
    expect(isCurrentLocationResponse(locationRequest)).toBe(false);
  });

  it('klassifiziert Konflikte, Offlinefehler und abgelaufene Sitzungen', () => {
    expect(getTripGroupMutationFailureKind({ code: '23505', message: 'duplicate' })).toBe(
      'conflict',
    );
    expect(getTripGroupMutationFailureKind({ message: 'Failed to fetch' })).toBe('offline');
    const authError = {
      code: 'PGRST301',
      message: 'permission denied for function respond_to_trip_group_location',
    };
    expect(shouldRetryTripGroupMutationAfterSessionRefresh(authError)).toBe(true);
    expect(getTripGroupMutationFailureKind(authError)).toBe('auth');
  });
});
