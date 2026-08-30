import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
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
  const contents = dockerEnvPath
    ? readFileSync(dockerEnvPath, 'utf8')
    : execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
        encoding: 'utf8',
        env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
      });

  return Object.fromEntries(
    contents
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf('=');
        const rawValue = line.slice(separator + 1).trim();
        const value = rawValue.startsWith('"') ? JSON.parse(rawValue) : rawValue;
        return [line.slice(0, separator), value];
      }),
  );
}

const localSupabase = readLocalSupabaseEnv();
const child = spawn('npx', ['expo', 'start', '--web', '--port', '8097'], {
  env: {
    ...process.env,
    CI: '1',
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      localSupabase.SUPABASE_INTERNAL_PUBLISHABLE_KEY ??
      localSupabase.SUPABASE_ANON_KEY ??
      localSupabase.PUBLISHABLE_KEY ??
      localSupabase.ANON_KEY,
    EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}

child.on('exit', (code) => process.exit(code ?? 1));
