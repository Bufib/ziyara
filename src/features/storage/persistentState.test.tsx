import AsyncStorage from '@react-native-async-storage/async-storage';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { createPersistentState } from '@/features/storage/persistentState';

type PersistentHook = ReturnType<typeof createPersistentState<number>>;
type StateSnapshot = {
  loaded: boolean;
  setValue: (value: number | ((previous: number) => number)) => void;
  value: number;
};

const actEnvironmentGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
const originalActEnvironment = actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT;
const getItemMock = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const setItemMock = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;

let currentState: StateSnapshot | null;
let renderer: ReactTestRenderer | null;

function parseNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function PersistentProbe({ usePersistentValue }: { usePersistentValue: PersistentHook }) {
  const [value, setValue, loaded] = usePersistentValue();

  useEffect(() => {
    currentState = { loaded, setValue, value };
  }, [loaded, setValue, value]);

  return null;
}

function getState() {
  if (!currentState) {
    throw new Error('Der persistente Testzustand wurde noch nicht gerendert.');
  }

  return currentState;
}

async function flushAsyncWork() {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function renderStore(usePersistentValue: PersistentHook) {
  await act(async () => {
    renderer = create(<PersistentProbe usePersistentValue={usePersistentValue} />);
    await flushAsyncWork();
  });
}

describe('createPersistentState', () => {
  beforeAll(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    currentState = null;
    renderer = null;
    jest.clearAllMocks();
    getItemMock.mockResolvedValue(null);
    setItemMock.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => renderer?.unmount());
    }
  });

  afterAll(() => {
    actEnvironmentGlobal.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  });

  it('hydriert einen validierten lokalen Wert', async () => {
    getItemMock.mockResolvedValueOnce(JSON.stringify(4));
    const usePersistentValue = createPersistentState('test.valid', 1, parseNumber);

    await renderStore(usePersistentValue);

    expect(getState()).toMatchObject({ loaded: true, value: 4 });
    expect(getItemMock).toHaveBeenCalledWith('test.valid');
  });

  it.each([['ungültiges JSON', '{'], ['ungültiger Datentyp', JSON.stringify('vier')]])(
    'verwirft %s und repariert den gespeicherten Wert',
    async (_label, storedValue) => {
      getItemMock.mockResolvedValueOnce(storedValue);
      const usePersistentValue = createPersistentState('test.invalid', 1, parseNumber);

      await renderStore(usePersistentValue);

      expect(getState()).toMatchObject({ loaded: true, value: 1 });
      expect(setItemMock).toHaveBeenCalledWith('test.invalid', JSON.stringify(1));
    },
  );

  it('überschreibt eine frühe Nutzeränderung nicht mit einer verspäteten Hydrierung', async () => {
    let resolveHydration: ((value: string | null) => void) | null = null;
    getItemMock.mockImplementationOnce(
      () =>
        new Promise<string | null>((resolve) => {
          resolveHydration = resolve;
        }),
    );
    const usePersistentValue = createPersistentState('test.race', 1, parseNumber);

    await act(async () => {
      renderer = create(<PersistentProbe usePersistentValue={usePersistentValue} />);
      await Promise.resolve();
    });
    await act(async () => {
      getState().setValue(3);
      resolveHydration?.(JSON.stringify(8));
      await flushAsyncWork();
    });

    expect(getState()).toMatchObject({ loaded: true, value: 3 });
    expect(setItemMock).toHaveBeenCalledWith('test.race', JSON.stringify(3));
  });

  it('führt funktionale Updates aus und setzt die Schreibwarteschlange nach Fehlern fort', async () => {
    setItemMock.mockRejectedValueOnce(new Error('storage unavailable'));
    const usePersistentValue = createPersistentState('test.queue', 1, parseNumber);
    await renderStore(usePersistentValue);

    await act(async () => {
      getState().setValue((previous) => previous + 1);
      getState().setValue((previous) => previous + 1);
      await flushAsyncWork();
    });

    expect(getState().value).toBe(3);
    expect(setItemMock.mock.calls).toEqual([
      ['test.queue', JSON.stringify(2)],
      ['test.queue', JSON.stringify(3)],
    ]);
  });

  it('bleibt bei einem Lesefehler mit dem Initialwert benutzbar', async () => {
    getItemMock.mockRejectedValueOnce(new Error('storage unavailable'));
    const usePersistentValue = createPersistentState('test.read-error', 2, parseNumber);

    await renderStore(usePersistentValue);

    expect(getState()).toMatchObject({ loaded: true, value: 2 });
  });
});
