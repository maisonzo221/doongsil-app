// 즐겨찾는 수친 — 기기에만 저장한다(서버 변경 없이 동작).
import { useEffect, useState } from 'react';
import AsyncStorage from 'expo-sqlite/kv-store';

const KEY = '@doongsil/favoriteFriends';
let cache: string[] | null = null;
const listeners = new Set<(ids: string[]) => void>();

async function load(): Promise<string[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    cache = [];
  }
  return cache as string[];
}

export async function toggleFavoriteFriend(id: string): Promise<void> {
  const ids = await load();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  cache = next;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장 실패해도 이번 실행 동안은 유지된다.
  }
  listeners.forEach((cb) => cb(next));
}

export function useFavoriteFriendIds(): string[] {
  const [ids, setIds] = useState<string[]>(cache ?? []);
  useEffect(() => {
    let alive = true;
    load().then((v) => alive && setIds(v));
    listeners.add(setIds);
    return () => {
      alive = false;
      listeners.delete(setIds);
    };
  }, []);
  return ids;
}
