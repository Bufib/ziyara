import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

export const adminEmail = 'e2e-admin@example.invalid';
export const adminName = 'E2E Administrator';
export const adminPassword = 'AdminPasswort123';
export const memberEmail = 'e2e-member@example.invalid';
export const memberName = 'E2E Mitglied';
export const memberPassword = 'MitgliedPasswort123';
export const memberResetPassword = 'NeuesMitgliedPasswort123';

function findFile(directory: string, filename: string): string | null {
  if (!existsSync(directory)) {
    return null;
  }

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isFile() && entry.name === filename) {
      return path;
    }

    if (entry.isDirectory()) {
      const nested = findFile(path, filename);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function readLocalSupabaseEnv() {
  const dockerEnvPath = findFile('supabase/.temp/start-secrets', 'docker.env');

  if (!dockerEnvPath) {
    throw new Error('Lokale Supabase-Konfiguration fehlt. Starte zuerst `npx supabase start`.');
  }

  return Object.fromEntries(
    readFileSync(dockerEnvPath, 'utf8')
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

const localSupabaseEnv = readLocalSupabaseEnv();
const localSupabaseUrl = 'http://127.0.0.1:54321';
const publishableKey =
  localSupabaseEnv.SUPABASE_INTERNAL_PUBLISHABLE_KEY ?? localSupabaseEnv.SUPABASE_ANON_KEY;
const serviceRoleKey = localSupabaseEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!publishableKey || !serviceRoleKey) {
  throw new Error('Die lokalen Supabase-Testschlüssel konnten nicht gelesen werden.');
}

export function createPublicTestClient() {
  return createClient(localSupabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

function createServiceRoleTestClient() {
  return createClient(localSupabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

function runLocalSql(sql: string) {
  execFileSync(
    'docker',
    [
      'exec',
      '-i',
      'supabase_db_ziyara',
      'psql',
      '--dbname=postgres',
      '--username=postgres',
      '--set=ON_ERROR_STOP=1',
      '--command',
      sql,
    ],
    { stdio: 'ignore' },
  );
}

export async function resetE2EAccounts() {
  const serviceClient = createServiceRoleTestClient();
  runLocalSql(
    "update public.group_checks set closed_at = coalesce(closed_at, now()) where closed_at is null; update public.question_rounds set closed_at = coalesce(closed_at, now()) where closed_at is null; delete from public.question_submission_limits where round_id in (select id from public.question_rounds where closed_at is not null); delete from public.trips;",
  );
  runLocalSql(
    "update public.profiles set role = 'user' where user_id in (select id from auth.users where email in ('e2e-admin@example.invalid', 'e2e-member@example.invalid'));",
  );
  const { data, error } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (error) {
    throw error;
  }

  for (const user of data.users.filter((candidate) =>
    candidate.email === adminEmail || candidate.email === memberEmail
  )) {
    const result = await serviceClient.auth.admin.deleteUser(user.id);

    if (result.error) {
      throw result.error;
    }
  }
}

export async function createE2EAdmin() {
  const serviceClient = createServiceRoleTestClient();
  const { data, error } = await serviceClient.auth.admin.createUser({
    email: adminEmail,
    email_confirm: true,
    password: adminPassword,
    user_metadata: {
      display_name: adminName,
      member_type: 'brother',
      party_size: 1,
    },
  });

  if (error || !data.user) {
    throw error ?? new Error('Der lokale E2E-Admin konnte nicht erstellt werden.');
  }

  if (!/^[0-9a-f-]{36}$/u.test(data.user.id)) {
    throw new Error('Die lokale E2E-Admin-ID ist ungültig.');
  }

  runLocalSql(`update public.profiles set role = 'admin' where user_id = '${data.user.id}';`);
}

export async function getLatestRecoveryRedirect(email: string) {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const listResponse = await fetch('http://127.0.0.1:54324/api/v1/messages');
    const list = (await listResponse.json()) as {
      messages: { Created: string; ID: string; To: unknown }[];
    };
    const message = list.messages
      .filter((candidate) => JSON.stringify(candidate.To).includes(email))
      .sort((left, right) => right.Created.localeCompare(left.Created))[0];

    if (message) {
      const mailResponse = await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`);
      const mail = (await mailResponse.json()) as { HTML?: string; Text?: string };
      const content = `${mail.Text ?? ''} ${mail.HTML ?? ''}`;
      const verificationUrl = content.match(/https?:\/\/[^\s<>"']*\/auth\/v1\/verify[^\s<>"']*/u)?.[0];

      if (!verificationUrl) {
        throw new Error('Die Recovery-Mail enthält keinen Verifikationslink.');
      }

      const verificationResponse = await fetch(verificationUrl.replaceAll('&amp;', '&'), {
        redirect: 'manual',
      });
      const redirect = verificationResponse.headers.get('location');

      if (!redirect) {
        throw new Error('Der Recovery-Link enthält kein App-Redirect.');
      }

      return redirect;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Die lokale Recovery-Mail wurde nicht rechtzeitig zugestellt.');
}
