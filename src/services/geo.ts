// 동네 검색용 순수 로직 — 지도/네트워크/React Native에 의존하지 않아서 단독으로 테스트할 수 있다.

export interface PlaceInfo {
  lat: number;
  lng: number;
  /** 화면에 보여줄 이름 (예: "정발산동, 일산동구, 고양시"). */
  label: string;
  /** 이 장소를 "근처"로 볼 반경(km). 동네는 좁게, 시/군은 넓게. */
  radiusKm: number;
  /** 전국 인허가 수영장 API를 주소로 조회할 때 쓰는 지역명 (예: ["고양시"]). 비어 있으면 API는 안 부른다. */
  regionTerms: string[];
}

export interface GeoPoint {
  lat?: number;
  lng?: number;
  name: string;
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 대한민국 범위를 벗어난 좌표(좌표계 변환 오류 등)는 지도에 찍지 않는다.
export function isInKorea(lat?: number, lng?: number): boolean {
  return lat != null && lng != null && lat > 32.5 && lat < 39.5 && lng > 123.5 && lng < 132.5;
}

const METRO = /(특별시|광역시|특별자치시|특별자치도)$/;
const ADMIN_SUFFIX = /[시군구동읍면리가]$/;

/** "정발산동", "고양시 일산동구", "가평군 설악면"처럼 행정구역 이름으로 끝나는 검색어인지. */
export function looksLikeAdminPlace(query: string): boolean {
  const last = query.trim().split(/\s+/).pop() ?? '';
  return last.length >= 2 && ADMIN_SUFFIX.test(last);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** OpenStreetMap Nominatim 한 건(addressdetails=1)을 PlaceInfo로 바꾼다. */
export function placeFromNominatim(item: any): PlaceInfo | null {
  const lat = Number(item?.lat);
  const lng = Number(item?.lon);
  if (!isInKorea(lat, lng)) return null;

  const a = item.address ?? {};
  const sido: string | undefined = a.province ?? a.state;
  const si: string | undefined = a.city;
  const gun: string | undefined = a.county;
  const gu: string | undefined = a.borough ?? a.city_district;

  // API는 "경기도 고양시 일산동구 ..." 같은 주소 문자열 부분일치로 조회한다.
  // 서울/부산 같은 광역시는 통째로 부르면 너무 많아서 구 단위로, 일반 시/군은 시/군 단위로
  // 불러서 옆 동네(다른 구)까지 포함시킨다. 시/도만 알 때는 너무 넓어서 API는 안 부른다.
  let primary: string | undefined;
  if (si && METRO.test(si)) primary = gu ?? si;
  else primary = si ?? gun ?? gu;
  const regionTerms = primary ? [primary] : [];

  const small = a.suburb ?? a.quarter ?? a.neighbourhood ?? a.village ?? a.town ?? a.hamlet;
  const parts = [small, gu, si ?? gun, sido].filter(Boolean) as string[];
  const label = (parts.length ? Array.from(new Set(parts)) : [String(item.display_name ?? '').split(',')[0]])
    .slice(0, 3)
    .join(', ');

  // 경계 상자의 절반 대각선을 반경 기준으로 삼는다 (동네 ≈ 4km, 시/군 ≈ 최대 15km).
  let radiusKm = 4;
  const bb = item.boundingbox;
  if (Array.isArray(bb) && bb.length === 4) {
    const [s, n, w, e] = bb.map(Number);
    if ([s, n, w, e].every(Number.isFinite)) {
      radiusKm = clamp(haversineKm(s, w, n, e) / 2, 4, 15);
    }
  }

  return { lat, lng, label, radiusKm: Math.round(radiusKm * 10) / 10, regionTerms };
}

/** 장소 검색 후보 검색어. "파주 운정동"처럼 못 찾으면 "파주 운정", "운정동", "운정" 순으로 단순화해서 다시 찾는다. */
export function queryVariants(query: string): string[] {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const last = tokens[tokens.length - 1];
  const prefix = tokens.slice(0, -1);
  const stripped = last.length > 2 ? last.replace(ADMIN_SUFFIX, '') : last;
  const out = [tokens.join(' ')];
  if (stripped !== last) out.push([...prefix, stripped].join(' '));
  if (prefix.length) {
    out.push(last);
    if (stripped !== last) out.push(stripped);
  }
  return Array.from(new Set(out)).filter((q) => q.length >= 2);
}

/** 후보 여러 개 중 하나를 고른다. 입력에 시/군 이름이 있으면 그게 들어간 후보만 남기고, 그중 내 위치에서 가장 가까운 것(위치를 모르면 검색 순위 1등)을 고른다. */
export function pickPlace(items: any[], query: string, user?: { lat: number; lng: number } | null): PlaceInfo | null {
  const pairs = (items ?? [])
    .map((it) => ({ it, p: placeFromNominatim(it) }))
    .filter((x): x is { it: any; p: PlaceInfo } => x.p != null);
  if (pairs.length === 0) return null;

  const prefix = query
    .trim()
    .split(/\s+/)
    .slice(0, -1)
    .map((t) => t.replace(ADMIN_SUFFIX, ''))
    .filter((t) => t.length > 0);
  const scoped = prefix.length ? pairs.filter((x) => prefix.every((t) => String(x.it.display_name ?? '').includes(t))) : [];
  const pool = scoped.length ? scoped : pairs;

  if (!user) return pool[0].p;
  return pool.reduce((best, cur) =>
    haversineKm(user.lat, user.lng, cur.p.lat, cur.p.lng) < haversineKm(user.lat, user.lng, best.p.lat, best.p.lng) ? cur : best
  ).p;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^0-9a-z가-힣]/g, '');
}

/** extra 중에서 base에 이미 있는 수영장(이름이 같거나 120m 안에 있는 것)을 뺀다. */
export function dedupeAgainst<T extends GeoPoint, U extends GeoPoint>(base: T[], extra: U[]): U[] {
  const names = new Set(base.map((b) => normalizeName(b.name)));
  return extra.filter((e) => {
    if (names.has(normalizeName(e.name))) return false;
    if (e.lat == null || e.lng == null) return true;
    // 위경도 0.002도(약 200m) 이상 떨어진 건 거리 계산 없이 바로 제외한다 — 수천 건 x 수백 건 비교를 빠르게.
    return !base.some(
      (b) =>
        b.lat != null &&
        b.lng != null &&
        Math.abs(b.lat - (e.lat as number)) < 0.002 &&
        Math.abs(b.lng - (e.lng as number)) < 0.002 &&
        haversineKm(b.lat, b.lng, e.lat as number, e.lng as number) < 0.12
    );
  });
}

const MIN_RESULTS = 8;
const FALLBACK_COUNT = 12;
const FALLBACK_MAX_KM = 40;

/** 중심에서 가까운 순으로 정렬한다. 반경 안에 너무 적으면 가까운 순으로 12곳까지 넓힌다(최대 40km). */
export function rankNearby<T extends GeoPoint>(
  pools: T[],
  center: { lat: number; lng: number },
  radiusKm: number,
  limit: number
): (T & { distanceKm: number })[] {
  const withDist = pools
    .filter((p) => isInKorea(p.lat, p.lng))
    .map((p) => ({ p, d: haversineKm(center.lat, center.lng, p.lat as number, p.lng as number) }))
    .sort((x, y) => x.d - y.d);

  const inRadius = withDist.filter((x) => x.d <= radiusKm);
  const chosen =
    inRadius.length >= MIN_RESULTS
      ? inRadius
      : withDist.filter((x) => x.d <= FALLBACK_MAX_KM).slice(0, FALLBACK_COUNT);

  return chosen.slice(0, limit).map((x) => ({ ...x.p, distanceKm: Math.round(x.d * 10) / 10 }));
}
