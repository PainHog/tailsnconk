/**
 * Thin AsyncStorage wrapper (blueprint's lib/store.ts). Device-side state:
 * the owned-bottles bar, and the whole local backend. Every read/write is
 * guarded so a private window / cleared storage never throws.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore write failures (quota, private mode) */
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Namespaced key builder to avoid collisions across features. */
export const KEY = {
  ownedBar: 'tnc:bar:owned',
  filters: 'tnc:filters',
  spinHistory: 'tnc:spin:history',
  localUser: 'tnc:local:user',
  saved: 'tnc:local:saved',
  made: 'tnc:local:made',
  reviews: (cocktailId: string) => `tnc:local:reviews:${cocktailId}`,
  tonight: (weekKey: string) => `tnc:local:tonight:${weekKey}`,
} as const;
