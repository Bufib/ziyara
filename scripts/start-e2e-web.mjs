import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

function findFile(directory, filename) {
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

const localSupabase = readLocalSupabaseEnv();
const child = spawn('npx', ['expo', 'start', '--web', '--port', '8097'], {
  env: {
    ...process.env,
    CI: '1',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      localSupabase.SUPABASE_INTERNAL_PUBLISHABLE_KEY ?? localSupabase.SUPABASE_ANON_KEY,
    EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code) => process.exit(code ?? 1));
