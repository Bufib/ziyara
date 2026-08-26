import * as Sentry from '@sentry/react-native';

const genericErrorMessage = 'Unhandled application error';
let isInitialized = false;

function normalizeFrameFilename(filename: string | undefined) {
  if (!filename) {
    return undefined;
  }

  const withoutQuery = filename.split(/[?#]/u, 1)[0];
  const basename = withoutQuery.split(/[/\\]/u).at(-1);

  return basename && /^[a-zA-Z0-9_.-]{1,120}$/u.test(basename)
    ? basename
    : 'application.bundle';
}

/**
 * Reduces an event to technical exception data before Sentry transports it.
 * User/request data, messages, breadcrumbs, tags, contexts and arbitrary extras
 * are intentionally not copied into the returned event.
 */
export function sanitizeCrashEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  const values = event.exception?.values?.map((exception) => ({
    stacktrace: exception.stacktrace
      ? {
          frames: exception.stacktrace.frames?.map((frame) => ({
            colno: typeof frame.colno === 'number' ? frame.colno : undefined,
            filename: normalizeFrameFilename(frame.filename),
            in_app: frame.in_app,
            lineno: typeof frame.lineno === 'number' ? frame.lineno : undefined,
          })),
        }
      : undefined,
    type: 'Error',
    value: genericErrorMessage,
  }));

  return {
    event_id: event.event_id,
    exception: values?.length ? { values } : undefined,
    level: event.level ?? 'error',
    message: values?.length ? undefined : genericErrorMessage,
    platform: event.platform,
    timestamp: event.timestamp,
    type: undefined,
  };
}

function validSentryDsn(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.hostname && url.username ? value.trim() : null;
  } catch {
    return null;
  }
}

export function initializeCrashReporting(
  configuredDsn: string | null | undefined = process.env.EXPO_PUBLIC_SENTRY_DSN,
) {
  if (isInitialized) {
    return true;
  }

  const dsn = validSentryDsn(configuredDsn);

  if (!dsn) {
    return false;
  }

  Sentry.init({
    beforeSend: sanitizeCrashEvent,
    dsn,
    enableAppStartTracking: false,
    enableAutoSessionTracking: false,
    enableNativeFramesTracking: false,
    maxBreadcrumbs: 0,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
  isInitialized = true;
  return true;
}

export function reportCrash(error: Error) {
  if (!isInitialized) {
    return;
  }

  Sentry.captureException(error);
}

initializeCrashReporting();
