import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(
    process.cwd(),
    'supabase/migrations/20260826000000_expand_group_check_results.sql',
  ),
  'utf8',
).toLowerCase();

describe('group check migration contract', () => {
  it('serialisiert Antworten gegen das Schließen desselben Checks', () => {
    expect(migration).toMatch(/create or replace function public\.close_group_check[\s\S]*for update/);
    expect(migration).toMatch(
      /create or replace function public\.respond_to_group_check[\s\S]*for share/,
    );
  });

  it('liefert alle Profile einschließlich offener Antworten und party_size', () => {
    expect(migration).toContain('left join public.group_check_responses');
    expect(migration).toContain('profiles.party_size');
    expect(migration).toContain('responses.answer');
  });
});
