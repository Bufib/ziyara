import { describe, expect, it } from '@jest/globals';

import type { TripNavigationDestination } from '@/domain/database';
import { parseTripNavigationCache } from '@/features/trip-guidance/trip-navigation-cache';

const destination: TripNavigationDestination = {
  archived_at: null,
  created_at: '2026-08-30T10:00:00Z',
  created_by_profile_id: 1,
  details: 'Neben dem Haupteingang',
  id: 4,
  latitude: 32.616,
  longitude: 44.032,
  name: 'Hotel',
  sort_order: 0,
  trip_id: 10,
  updated_at: '2026-08-30T10:00:00Z',
};

describe('parseTripNavigationCache', () => {
  it('übernimmt einen validen benutzerspezifischen Kartenort-Cache', () => {
    const cached = {
      destinations: [destination],
      tripId: 10,
      userId: 'guidance-user',
    };

    expect(parseTripNavigationCache(cached)).toEqual(cached);
  });

  it.each([
    undefined,
    [],
    { destinations: [destination], tripId: 10, userId: '' },
    {
      destinations: [{ ...destination, latitude: 91 }],
      tripId: 10,
      userId: 'guidance-user',
    },
    {
      destinations: [{ ...destination, trip_id: 11 }],
      tripId: 10,
      userId: 'guidance-user',
    },
  ])('verwirft einen ungültigen Cache %#', (value) => {
    expect(parseTripNavigationCache(value)).toBeUndefined();
  });

  it('akzeptiert einen bewusst geleerten Cache', () => {
    expect(parseTripNavigationCache(null)).toBeNull();
  });
});
