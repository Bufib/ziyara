import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';

import { AppErrorBoundary } from '@/features/errors/AppErrorBoundary';
const actEnvironmentGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalActEnvironment = actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT;

function ThrowingScreen({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('private@example.com must never be shown');
  }

  return <Text>App ist wieder verfügbar</Text>;
}

describe('AppErrorBoundary', () => {
  beforeAll(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  });

  it('zeigt einen verständlichen Fallback und kann neu rendern', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const warningSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const renderer = create(
      <AppErrorBoundary>
        <ThrowingScreen shouldThrow />
      </AppErrorBoundary>,
    );

    await act(async () => undefined);
    expect(renderer.root.findByProps({ accessibilityRole: 'alert' })).toBeTruthy();
    expect(renderer.root.findAllByType(Text).map((node) => node.props.children)).toContain(
      'Etwas ist schiefgelaufen',
    );
    await act(async () => {
      renderer.update(
        <AppErrorBoundary>
          <ThrowingScreen shouldThrow={false} />
        </AppErrorBoundary>,
      );
    });
    await act(async () => {
      renderer.root.findByProps({ accessibilityRole: 'button' }).props.onPress();
    });
    expect(renderer.root.findByType(ThrowingScreen).props.shouldThrow).toBe(false);
    expect(renderer.root.findByType(Text).props.children).toBe('App ist wieder verfügbar');

    errorSpy.mockRestore();
    warningSpy.mockRestore();
  });
});
