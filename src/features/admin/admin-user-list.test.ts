import { describe, expect, it } from '@jest/globals';

import type { AdminUserSummary } from '@/domain/database';
import {
  buildAdminUserListItems,
  getAdminUserStats,
} from '@/features/admin/admin-user-list';

const users: AdminUserSummary[] = [
  {
    display_name: 'Zainab Ali',
    emergency_on_duty: false,
    family_id: 3,
    family_name: 'Familie Ali',
    luggage_count: 2,
    member_type: 'sister',
    party_size: 2,
    role: 'user',
    sim_card_count: 3,
    user_id: 'zainab',
  },
  {
    display_name: 'Abbas Ali',
    emergency_on_duty: false,
    family_id: 3,
    family_name: 'Familie Ali',
    luggage_count: 1,
    member_type: 'brother',
    party_size: 1,
    role: 'user',
    sim_card_count: 1,
    user_id: 'abbas',
  },
  {
    display_name: 'Mariam Hassan',
    emergency_on_duty: true,
    family_id: null,
    family_name: null,
    luggage_count: 1,
    member_type: null,
    party_size: 1,
    role: 'medical_staff',
    sim_card_count: 0,
    user_id: 'mariam',
  },
];

describe('admin user list', () => {
  it('fasst Familien zusammen und sortiert ihre Mitglieder nach Namen', () => {
    expect(buildAdminUserListItems(users, '', 'de')).toEqual([
      {
        familyId: 3,
        familyName: 'Familie Ali',
        key: 'family:3',
        members: [users[1], users[0]],
        type: 'family',
      },
      {
        key: 'user:mariam',
        type: 'user',
        user: users[2],
      },
    ]);
  });

  it('zeigt bei einem passenden Mitglied weiterhin das vollständige Familienpaket', () => {
    expect(buildAdminUserListItems(users, 'zainab', 'de')).toEqual([
      {
        familyId: 3,
        familyName: 'Familie Ali',
        key: 'family:3',
        members: [users[1], users[0]],
        type: 'family',
      },
    ]);
  });

  it('findet Familiennamen und nicht zugeordnete Personen', () => {
    expect(buildAdminUserListItems(users, 'familie ali', 'de')).toHaveLength(1);
    expect(buildAdminUserListItems(users, 'mariam', 'de')).toEqual([
      {
        key: 'user:mariam',
        type: 'user',
        user: users[2],
      },
    ]);
  });

  it('summiert Personen, Geschlechter, Koffer und SIM-Karten', () => {
    expect(getAdminUserStats(users)).toEqual({
      brotherAccounts: 1,
      luggageCount: 4,
      representedPeople: 4,
      simCardCount: 4,
      sisterAccounts: 1,
      unknownMemberTypeAccounts: 1,
    });
  });
});
