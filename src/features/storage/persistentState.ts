import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

type SetValue<T> = T | ((previous: T) => T);

export function usePersistentState<T>(key: string, initialValue: T) {
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(key)
      .then((storedValue) => {
        if (!mounted || !storedValue) return;
        setValue(JSON.parse(storedValue) as T);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, [key]);

  const setPersistentValue = useCallback(
    (nextValue: SetValue<T>) => {
      setValue((previous) => {
        const resolved =
          typeof nextValue === 'function' ? (nextValue as (previous: T) => T)(previous) : nextValue;
        AsyncStorage.setItem(key, JSON.stringify(resolved)).catch(() => undefined);
        return resolved;
      });
    },
    [key],
  );

  return [value, setPersistentValue, loaded] as const;
}
