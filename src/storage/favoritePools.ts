// 관심 수영장 — 기기에 저장한다(로그인/서버 없이 동작). 모집 알림은 여기 등록된 수영장만 대상이다.
// 수영장 데이터가 나중에 바뀌어도 목록이 비지 않게, 이름/주소/좌표를 같이 저장해둔다.
import AsyncStorage from 'expo-sqlite/kv-store';
import { poolKey } from '../utils/poolKey';

const KEY = '@doongsil/favoritePools';

export interface FavoritePool {
  key: string;
  name: string;
  roadAddress: string;
  lotAddress: string;
  lat?: number;
  lng?: number;
  phone?: string;
  addedAt: string;
}

type PoolLike = {
  name: string;
  roadAddress: string;
  lotAddress: string;
  lat?: number;
  lng?: number;
  phone?: string;
};

let cache: FavoritePool[] | null = null;
const listeners = new Set<(list: FavoritePool[]) => void>();

export async function getFavoritePools(): Promise<FavoritePool[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((f) => f && typeof f.key === 'string') : [];
  } catch {
    cache = [];
  }
  return cache as FavoritePool[];
}

async function save(list: FavoritePool[]): Promise<void> {
  cache = list;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 저장에 실패해도 이번 실행 동안은 메모리 값으로 동작한다.
  }
  listeners.forEach((cb) => cb(list));
}

/** 관심 수영장 등록/해제. 등록되면 true, 해제되면 false. */
export async function toggleFavoritePool(pool: PoolLike): Promise<boolean> {
  const list = await getFavoritePools();
  const key = poolKey(pool);
  if (list.some((f) => f.key === key)) {
    await save(list.filter((f) => f.key !== key));
    return false;
  }
  const entry: FavoritePool = {
    key,
    name: pool.name,
    roadAddress: pool.roadAddress,
    lotAddress: pool.lotAddress,
    lat: pool.lat,
    lng: pool.lng,
    phone: pool.phone,
    addedAt: new Date().toISOString(),
  };
  await save([...list, entry]);
  return true;
}

export function subscribeFavoritePools(cb: (list: FavoritePool[]) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
