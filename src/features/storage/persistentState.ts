import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

type SetValue<T> = T | ((previous: T) => T);

type PersistentSnapshot<T> = {
  loaded: boolean;
  value: T;
};

export type PersistentValueParser<T> = (value: unknown) => T | undefined;

/**
 * Creates one shared, validated store for a single AsyncStorage key.
 *
 * Keeping the store at module scope ensures that multiple mounted screens see
 * the same value. Hydration cannot overwrite a newer user interaction and
 * queued writes preserve the order in which values were set.
 */
export function createPersistentState<T>(
  key: string,
  initialValue: T,
  parse: PersistentValueParser<T>,
) {
  let snapshot: PersistentSnapshot<T> = { loaded: false, value: initialValue };
  let hydration: Promise<void> | null = null;
  let revision = 0;
  let writeQueue = Promise.resolve();
  const listeners = new Set<() => void>();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const setSnapshot = (nextSnapshot: PersistentSnapshot<T>) => {
    snapshot = nextSnapshot;
    emit();
  };

  const persist = (value: T) => {
    const serialized = JSON.stringify(value);
    writeQueue = writeQueue
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(key, serialized))
      .catch(() => undefined);
  };

  const hydrate = () => {
    if (hydration) {
      return hydration;
    }

    const hydrationRevision = revision;

    hydration = AsyncStorage.getItem(key)
      .then((storedValue) => {
        if (hydrationRevision !== revision || storedValue === null) {
          return;
        }

        let parsedValue: T | undefined;

        try {
          parsedValue = parse(JSON.parse(storedValue) as unknown);
        } catch {
          parsedValue = undefined;
        }

        if (parsedValue === undefined) {
          persist(initialValue);
          return;
        }

        snapshot = { loaded: false, value: parsedValue };
      })
      .catch(() => undefined)
      .finally(() => {
        if (!snapshot.loaded) {
          setSnapshot({ ...snapshot, loaded: true });
        }
      });

    return hydration;
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const getSnapshot = () => snapshot;

  const setValue = (nextValue: SetValue<T>) => {
    const resolved =
      typeof nextValue === 'function'
        ? (nextValue as (previous: T) => T)(snapshot.value)
        : nextValue;

    revision += 1;
    setSnapshot({ ...snapshot, value: resolved });
    persist(resolved);
  };

  return function usePersistentState() {
    const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    useEffect(() => {
      void hydrate();
    }, []);

    const setPersistentValue = useCallback((nextValue: SetValue<T>) => {
      setValue(nextValue);
    }, []);

    return [current.value, setPersistentValue, current.loaded] as const;
  };
}
