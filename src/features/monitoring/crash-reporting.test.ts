import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ErrorEvent } from '@sentry/react-native';

import * as Sentry from '@sentry/react-native';
import {
  initializeCrashReporting,
  reportCrash,
  sanitizeCrashEvent,
} from '@/features/monitoring/crash-reporting';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  init: jest.fn(),
}));

const captureExceptionMock = Sentry.captureException as jest.MockedFunction<
  typeof Sentry.captureException
>;
const initMock = Sentry.init as jest.MockedFunction<typeof Sentry.init>;
const syntheticDsn = `https://${'public-key'}@${'monitoring.example.invalid'}/123`;

describe('crash reporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bleibt ohne valide DSN vollständig deaktiviert', () => {
    expect(initializeCrashReporting(null)).toBe(false);
    expect(initializeCrashReporting('not-a-dsn')).toBe(false);
    reportCrash(new Error('private@example.com'));

    expect(initMock).not.toHaveBeenCalled();
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('initialisiert Sentry nur als PII-freies Opt-in', () => {
    expect(initializeCrashReporting(syntheticDsn)).toBe(true);

    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: syntheticDsn,
        enableAppStartTracking: false,
        enableAutoSessionTracking: false,
        enableNativeFramesTracking: false,
        maxBreadcrumbs: 0,
        sendDefaultPii: false,
        tracesSampleRate: 0,
      }),
    );
    reportCrash(new Error('private@example.com'));
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });

  it('entfernt personenbezogene Felder, Inhalte und Tokens vor dem Versand', () => {
    const unsafeEvent = {
      breadcrumbs: [{ message: 'Fragetext einer Person' }],
      contexts: { profile: { displayName: 'Privater Name' } },
      event_id: 'event-id',
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                {
                  filename: 'https://example.test/private/path/app.js?access_token=secret',
                  function: 'submit_private@example.com',
                  lineno: 42,
                  vars: { token: 'secret-token' },
                },
              ],
            },
            type: 'PrivateNameError',
            value: 'private@example.com asked a secret question',
          },
        ],
      },
      extra: { authToken: 'secret-token', question: 'Secret question' },
      level: 'error',
      message: 'private@example.com',
      request: { headers: { authorization: 'Bearer secret-token' } },
      tags: { displayName: 'Privater Name' },
      user: { email: 'private@example.com', name: 'Privater Name' },
    } as unknown as ErrorEvent;

    const safeEvent = sanitizeCrashEvent(unsafeEvent);
    const serialized = JSON.stringify(safeEvent);

    expect(safeEvent).toEqual({
      event_id: 'event-id',
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                {
                  colno: undefined,
                  filename: 'app.js',
                  in_app: undefined,
                  lineno: 42,
                },
              ],
            },
            type: 'Error',
            value: 'Unhandled application error',
          },
        ],
      },
      level: 'error',
      message: undefined,
      platform: undefined,
      timestamp: undefined,
      type: undefined,
    });
    expect(serialized).not.toMatch(
      /private|secret|question|authorization|token|displayName|breadcrumbs|request|user/ui,
    );
  });
});
