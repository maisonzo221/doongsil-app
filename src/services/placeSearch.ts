// 동네/지역 이름 → 좌표 변환. API 키 없이 OpenStreetMap Nominatim을 쓰고, 막히거나 못 찾으면
// 아이폰 내장 지오코더(Apple)로 한 번 더 시도한다. 이름 해석/후보 선택 로직은 geo.ts에 있다.
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { PlaceInfo, pickPlace, placeFromNominatim, queryVariants } from './geo';

const ENDPOINT = 'https://nominatim.openstreetmap.org';
// Nominatim 이용 정책: 초당 1건 이하. 요청이 몰려도 순서대로 1.1초 간격으로 보낸다.
const MIN_INTERVAL_MS = 1100;
const TIMEOUT_MS = 8000;

type UserPoint = { lat: number; lng: number } | null | undefined;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

let lastCallAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

async function getJson(url: string): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'Accept-Language': 'ko' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// 일시적으로 막히거나 느린 경우를 위해 한 번만 다시 시도한다.
async function withRetry<T>(task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch {
    await sleep(1500);
    return task();
  }
}

function searchUrl(q: string, user: UserPoint): string {
  const p = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: '10',
    countrycodes: 'kr',
    'accept-language': 'ko',
    addressdetails: '1',
  });
  // 내 위치 주변을 우선해서 찾는다(동명이인이 많은 "중앙동" 같은 이름용). bounded=0이라 밖도 검색된다.
  if (user) {
    p.set('viewbox', `${user.lng - 0.6},${user.lat + 0.6},${user.lng + 0.6},${user.lat - 0.6}`);
    p.set('bounded', '0');
  }
  return `${ENDPOINT}/search?${p.toString()}`;
}

function appleTerms(g: Location.LocationGeocodedAddress | undefined): string[] {
  if (!g) return [];
  const isUnit = (s?: string | null) => !!s && /[시군구]$/.test(s) && !/(특별시|광역시|특별자치시|특별자치도)$/.test(s);
  const term = [g.city, g.subregion, g.district].find(isUnit);
  return term ? [term] : [];
}

async function appleGeocode(query: string): Promise<PlaceInfo | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const found = await Location.geocodeAsync(query);
    if (found.length === 0) return null;
    const { latitude: lat, longitude: lng } = found[0];
    const [g] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    return { lat, lng, label: query.trim(), radiusKm: 4, regionTerms: appleTerms(g) };
  } catch {
    return null;
  }
}

const cache = new Map<string, PlaceInfo | null>();

/** "정발산동", "고양시 일산동구", "파주 운정동" 같은 입력을 좌표로 바꾼다. 못 찾으면 null. */
export async function geocodePlace(query: string, user?: UserPoint): Promise<PlaceInfo | null> {
  const q = query.trim();
  if (q.length < 2) return null;
  // 내 위치는 소수점 1자리(약 10km)까지만 캐시 키에 반영해서, 조금 움직였다고 다시 안 찾게 한다.
  const key = `${q}|${user ? `${user.lat.toFixed(1)},${user.lng.toFixed(1)}` : ''}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  let place: PlaceInfo | null = null;
  let networkFailed = false;
  for (const variant of queryVariants(q)) {
    try {
      const items = await withRetry(() => throttled(() => getJson(searchUrl(variant, user))));
      place = pickPlace(items, q, user);
      if (place) break;
    } catch {
      // 네트워크 자체가 막힌 거라 다른 검색어로 바꿔도 소용없다 — 바로 예비 경로(Apple)로 간다.
      networkFailed = true;
      break;
    }
  }
  if (!place) place = await appleGeocode(q);

  // 네트워크 문제로 못 찾은 경우는 캐시하지 않는다 — 다음에 다시 시도할 수 있게.
  if (place || !networkFailed) cache.set(key, place);
  return place;
}

/** 지도 중심 좌표 → 그 주변 지역 이름/조회용 지역명. ("이 지역에서 검색"용) */
export async function reversePlace(lat: number, lng: number): Promise<PlaceInfo | null> {
  try {
    const p = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'jsonv2',
      zoom: '14',
      addressdetails: '1',
      'accept-language': 'ko',
    });
    const json = await withRetry(() => throttled(() => getJson(`${ENDPOINT}/reverse?${p.toString()}`)));
    // 눌린 좌표를 중심으로 쓰고(지형지물의 좌표가 아니라), 반경은 동네 기준 4km로 둔다.
    const place = placeFromNominatim({ ...json, lat, lon: lng, boundingbox: undefined });
    if (place) return place;
  } catch {
    // 아래 Apple 예비 경로로 넘어간다.
  }
  if (Platform.OS !== 'ios') return null;
  try {
    const [g] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    return { lat, lng, label: g?.district ?? g?.city ?? '이 지역', radiusKm: 4, regionTerms: appleTerms(g) };
  } catch {
    return null;
  }
}
