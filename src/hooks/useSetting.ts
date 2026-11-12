import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { db, setSetting } from '../db/database';

export function useSetting<T>(key: string, defaultValue: T): [T, (value: T) => Promise<void>] {
  const value = useLiveQuery(async () => {
    const row = await db.settings.where('key').equals(key).first();
    if (!row) return defaultValue;
    try { return JSON.parse(row.value) as T; } catch { return defaultValue; }
  }, [key], defaultValue);

  const update = useCallback(async (newValue: T) => {
    await setSetting(key, newValue);
  }, [key]);

  return [value ?? defaultValue, update];
}
