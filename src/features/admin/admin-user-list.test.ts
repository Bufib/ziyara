import { describe, expect, it } from '@jest/globals';

import type { AdminUserSummary } from '@/domain/database';
import { buildAdminUserListItems } from '@/features/admin/admin-user-list';

const users: AdminUserSummary[] = [
  {
    display_name: 'Zainab Ali',
    family_id: 3,
    family_name: 'Familie Ali',
    luggage_count: 2,
    party_size: 2,
    role: 'user',
    user_id: 'zainab',
  },
  {
    display_name: 'Abbas Ali',
    family_id: 3,
    family_name: 'Familie Ali',
    luggage_count: 1,
    party_size: 1,
    role: 'user',
    user_id: 'abbas',
  },
  {
    display_name: 'Mariam Hassan',
    family_id: null,
    family_name: null,
    luggage_count: 1,
    party_size: 1,
    role: 'medical_staff',
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
});
