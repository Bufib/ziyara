import type { AdminUserSummary } from '@/domain/database';

export type AdminUserListItem =
  | {
      familyId: number;
      familyName: string | null;
      key: string;
      members: AdminUserSummary[];
      type: 'family';
    }
  | {
      key: string;
      type: 'user';
      user: AdminUserSummary;
    };

export type AdminUserStats = {
  brotherAccounts: number;
  luggageCount: number;
  representedPeople: number;
  simCardCount: number;
  sisterAccounts: number;
  unknownMemberTypeAccounts: number;
};

export function getAdminUserStats(users: AdminUserSummary[]): AdminUserStats {
  return users.reduce<AdminUserStats>(
    (stats, user) => ({
      brotherAccounts:
        stats.brotherAccounts + (user.member_type === 'brother' ? 1 : 0),
      luggageCount: stats.luggageCount + user.luggage_count,
      representedPeople: stats.representedPeople + user.party_size,
      simCardCount: stats.simCardCount + user.sim_card_count,
      sisterAccounts:
        stats.sisterAccounts + (user.member_type === 'sister' ? 1 : 0),
      unknownMemberTypeAccounts:
        stats.unknownMemberTypeAccounts + (user.member_type === null ? 1 : 0),
    }),
    {
      brotherAccounts: 0,
      luggageCount: 0,
      representedPeople: 0,
      simCardCount: 0,
      sisterAccounts: 0,
      unknownMemberTypeAccounts: 0,
    },
  );
}

export function buildAdminUserListItems(
  users: AdminUserSummary[],
  searchQuery: string,
  locale: string,
): AdminUserListItem[] {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase(locale);
  const families = new Map<
    number,
    { familyName: string | null; members: AdminUserSummary[] }
  >();
  const unassignedUsers: AdminUserSummary[] = [];

  for (const user of users) {
    if (user.family_id === null) {
      unassignedUsers.push(user);
      continue;
    }

    const family = families.get(user.family_id) ?? {
      familyName: user.family_name,
      members: [],
    };
    family.members.push(user);
    families.set(user.family_id, family);
  }

  const matches = (value: string | null) =>
    value?.toLocaleLowerCase(locale).includes(normalizedQuery) ?? false;

  const familyItems: AdminUserListItem[] = [...families.entries()]
    .filter(
      ([, family]) =>
        !normalizedQuery ||
        matches(family.familyName) ||
        family.members.some((member) => matches(member.display_name)),
    )
    .sort(([, left], [, right]) =>
      (left.familyName ?? '').localeCompare(right.familyName ?? '', locale),
    )
    .map(([familyId, family]) => ({
      familyId,
      familyName: family.familyName,
      key: `family:${familyId}`,
      members: [...family.members].sort((left, right) =>
        left.display_name.localeCompare(right.display_name, locale),
      ),
      type: 'family' as const,
    }));

  const userItems: AdminUserListItem[] = unassignedUsers
    .filter((user) => !normalizedQuery || matches(user.display_name))
    .sort((left, right) => left.display_name.localeCompare(right.display_name, locale))
    .map((user) => ({
      key: `user:${user.user_id}`,
      type: 'user' as const,
      user,
    }));

  return [...familyItems, ...userItems];
}
