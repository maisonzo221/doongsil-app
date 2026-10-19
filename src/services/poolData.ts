// 행정안전부_생활_수영장업 조회서비스 (data.go.kr) 연동.
// 실제 인허가받은 수영장의 이름/주소/전화번호/영업상태를 정부 공식 데이터로 가져온다.
// 운영시간·이용료 등 세부 정보는 이 API엔 없어서, PUBLIC_POOL_FACILITIES(전국공공시설
// 개방정보표준데이터에서 걸러낸 공공 수영장 목록)와 SEOUL_POOL_FACILITIES(서울 열린데이터
// 광장에서 걸러낸 서울시내 공공 수영장 목록)를 같이 검색해서 합친다 — 평일/주말 운영시간,
// 이용료, 부대시설, 홈페이지, (서울 쪽은) 레일 수·자유수영 안내까지 실제로 들어있다.
import proj4 from 'proj4';
import { PUBLIC_POOL_FACILITIES } from '../data/publicPoolFacilities';
import { SEOUL_POOL_FACILITIES } from '../data/seoulPoolFacilities';
import { LICENSED_POOL_FACILITIES, LicensedPoolRow } from '../data/licensedPoolFacilities';
import { dedupeAgainst, isInKorea, PlaceInfo, rankNearby } from './geo';

const API_KEY = process.env.EXPO_PUBLIC_POOL_DATA_API_KEY;
const BASE_URL = 'https://apis.data.go.kr/1741000/swimming_pools/info';

// 이 데이터셋의 좌표계는 EPSG:5174 (Bessel 1841, 중부원점 TM) — 위경도로 변환해야
// 지도 링크를 만들 수 있다.
const BESSEL_TM =
  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 ' +
  '+ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43';
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';

export interface OfficialPool {
  id: string;
  name: string;
  roadAddress: string;
  lotAddress: string;
  phone?: string;
  statusName: string;
  lat?: number;
  lng?: number;
  // 아래는 PUBLIC_POOL_FACILITIES(공공시설개방정보) 쪽에만 채워진다 — 수영장업
  // 인허가 API에는 없는 정보라, 민간 등록 수영장은 이 필드들이 비어 있다.
  operWeekday?: string;
  operWeekend?: string;
  closedDay?: string;
  feeText?: string;
  capacity?: string;
  amenities?: string;
  applyMethod?: string;
  homepageUrl?: string;
  photoUrl?: string;
  source?: 'business' | 'public' | 'seoul';
  // 아래는 SEOUL_POOL_FACILITIES 쪽에만 채워진다 — 서울 열린데이터광장 데이터엔 좌표가
  // 없어서 지도 핀으로는 못 뜨지만, 레일 수(자유 텍스트)와 자유수영 안내는 실제로 들어있다.
  sizeText?: string;
  freeSwimInfo?: string;
  institution?: string;
  notes?: string;
  /** 검색어로 직접 매칭된 게 아니라 반경 검색으로 끼어든 주변 수영장이면 true. */
  nearbyMatch?: boolean;
  /** 동네 검색일 때, 검색한 위치에서 이 수영장까지의 거리(km). */
  distanceKm?: number;
}

// 전국 인허가 스냅샷이 번들돼 있으면 API 키 없이도 동작한다.
export const isPoolDataConfigured = !!API_KEY || LICENSED_POOL_FACILITIES.length > 0;

function toLatLng(xRaw: string, yRaw: string): { lat?: number; lng?: number } {
  const x = Number(xRaw);
  const y = Number(yRaw);
  if (!x || !y) return {};
  try {
    const [lng, lat] = proj4(BESSEL_TM, WGS84, [x, y]);
    return { lat, lng };
  } catch {
    return {};
  }
}

// 구립/시립 등 공공 수영장은 상태코드가 민간 업체와 다르게 들어있는 경우가 있어서
// (혹은 비어 있는 경우도 있어서), 서버 쪽에서 SALS_STTS_CD='01'로 미리 걸러버리면
// 정상 운영 중인 공공 시설이 통째로 빠질 위험이 있다. 그래서 서버 필터는 걸지 않고,
// 텍스트로 확실히 "폐업/취소/말소"라고 적힌 것만 클라이언트에서 걸러낸다.
const CLOSED_STATUS_PATTERN = /(폐업|취소|말소)/;

function mapItem(item: any): OfficialPool {
  const { lat, lng } = toLatLng(item.CRD_INFO_X, item.CRD_INFO_Y);
  return {
    id: item.MNG_NO,
    name: item.BPLC_NM,
    roadAddress: item.ROAD_NM_ADDR || item.LOTNO_ADDR || '',
    lotAddress: item.LOTNO_ADDR || '',
    phone: item.TELNO || undefined,
    statusName: item.SALS_STTS_NM || '',
    lat,
    lng,
    source: 'business',
  };
}

function mapPublicFacility(f: (typeof PUBLIC_POOL_FACILITIES)[number]): OfficialPool {
  return {
    id: f.id,
    name: f.name,
    roadAddress: f.roadAddress,
    lotAddress: f.lotAddress,
    phone: f.phone ?? undefined,
    statusName: f.statusName,
    lat: f.lat,
    lng: f.lng,
    operWeekday: f.operWeekday ?? undefined,
    operWeekend: f.operWeekend ?? undefined,
    closedDay: f.closedDay ?? undefined,
    feeText: f.feeText ?? undefined,
    capacity: f.capacity ?? undefined,
    amenities: f.amenities ?? undefined,
    applyMethod: f.applyMethod ?? undefined,
    homepageUrl: f.homepageUrl ?? undefined,
    photoUrl: f.photoUrl ?? undefined,
    source: 'public',
  };
}

function searchPublicFacilities(tokens: string[]): OfficialPool[] {
  return PUBLIC_POOL_FACILITIES.filter((f) => {
    const haystack = `${f.name} ${f.roadAddress} ${f.lotAddress}`;
    return tokens.every((t) => haystack.includes(t));
  }).map(mapPublicFacility);
}

function mapSeoulFacility(f: (typeof SEOUL_POOL_FACILITIES)[number]): OfficialPool {
  return {
    id: f.id,
    name: f.name,
    roadAddress: f.roadAddress,
    lotAddress: f.roadAddress,
    lat: f.lat ?? undefined,
    lng: f.lng ?? undefined,
    phone: f.phone ?? undefined,
    statusName: f.statusName,
    operWeekday: f.operWeekday ?? undefined,
    operWeekend: f.operWeekend ?? undefined,
    feeText: f.feeText ?? undefined,
    amenities: f.amenities ?? undefined,
    homepageUrl: f.homepageUrl ?? undefined,
    sizeText: f.sizeText ?? undefined,
    freeSwimInfo: f.freeSwimInfo ?? undefined,
    institution: f.institution ?? undefined,
    notes: f.notes ?? undefined,
    source: 'seoul',
  };
}

function searchSeoulFacilities(tokens: string[]): OfficialPool[] {
  return SEOUL_POOL_FACILITIES.filter((f) => {
    const haystack = `${f.name} ${f.district ?? ''} ${f.roadAddress}`;
    return tokens.every((t) => haystack.includes(t));
  }).map(mapSeoulFacility);
}

// ───────── 전국 인허가 수영장 스냅샷 (scripts/fetch-pool-data.mjs로 생성) ─────────
// 스냅샷이 있으면 기본 목록/동네 검색/이름 검색을 전부 이 데이터로 처리한다 — 실시간 API 없이
// 전국이 바로 나오고, 페이지 제한도 없다. 비어 있으면(아직 내려받기 전) 예전처럼 API로 대신한다.
const HAS_SNAPSHOT = LICENSED_POOL_FACILITIES.length > 0;

function mapLicensed(r: LicensedPoolRow): OfficialPool {
  const [id, name, roadAddress, lotAddress, phone, lat, lng] = r;
  return {
    id,
    name,
    roadAddress,
    lotAddress: lotAddress || roadAddress,
    phone: phone || undefined,
    statusName: '영업중',
    lat,
    lng,
    source: 'business',
  };
}

let allPoolsCache: OfficialPool[] | null = null;

/** 서울 + 전국 공공시설 + 전국 인허가 스냅샷. 같은 곳(이름이 같거나 120m 안)은 상세 정보가 있는 쪽만 남긴다. */
function allPools(): OfficialPool[] {
  if (allPoolsCache) return allPoolsCache;
  const detailed = [...SEOUL_POOL_FACILITIES.map(mapSeoulFacility), ...PUBLIC_POOL_FACILITIES.map(mapPublicFacility)];
  const licensed = dedupeAgainst(
    detailed.filter((p) => isInKorea(p.lat, p.lng)),
    LICENSED_POOL_FACILITIES.map(mapLicensed)
  );
  allPoolsCache = [...detailed, ...licensed];
  return allPoolsCache;
}

function searchLicensed(tokens: string[]): OfficialPool[] {
  return LICENSED_POOL_FACILITIES.filter((r) => {
    const haystack = `${r[1]} ${r[2]} ${r[3]}`;
    return tokens.every((t) => haystack.includes(t));
  }).map(mapLicensed);
}

async function fetchByCondition(
  field: 'BPLC_NM' | 'ROAD_NM_ADDR' | 'LOTNO_ADDR',
  query: string,
  maxResults: number
) {
  const params = new URLSearchParams({
    serviceKey: API_KEY as string,
    pageNo: '1',
    numOfRows: String(maxResults),
    returnType: 'json',
  });
  params.set(`cond[${field}::LIKE]`, query);

  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  const json = await res.json();
  const items = json?.response?.body?.items?.item ?? [];
  return (Array.isArray(items) ? items : [items])
    .filter(Boolean)
    .map(mapItem)
    .filter((p) => !CLOSED_STATUS_PATTERN.test(p.statusName));
}

function matchesAllTokens(pool: OfficialPool, tokens: string[]): boolean {
  const haystack = `${pool.name} ${pool.roadAddress} ${pool.lotAddress}`;
  return tokens.every((t) => haystack.includes(t));
}

const NEARBY_RADIUS_KM = 3;
const MAX_NEARBY = 20;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 번들 데이터(서울+전국 공공시설)는 전부 메모리에 있어서, 검색 결과 중 좌표가 있는 첫
 * 번째 시설을 기준점 삼아 반경 3km 안의 다른 수영장도 같이 보여준다 — "회현"처럼 동네
 * 이름으로 검색해도 이름에 "회현"이 없는 근처 수영장(봉래체육문화센터 등)까지 나오게.
 * 수영장업 인허가 API(business)는 지역 반경 조회를 지원하지 않아 이 확장 대상에선 뺀다 —
 * API에 없는 걸 지어내서 "근처"라고 보여줄 순 없으니까. */
function findNearbyPools(anchorLat: number, anchorLng: number, excludeIds: Set<string>): OfficialPool[] {
  return allPools()
    .filter((p) => p.lat != null && p.lng != null && !excludeIds.has(p.id))
    .map((p) => ({ pool: p, dist: haversineKm(anchorLat, anchorLng, p.lat as number, p.lng as number) }))
    .filter((x) => x.dist <= NEARBY_RADIUS_KM)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, MAX_NEARBY)
    .map((x) => ({ ...x.pool, nearbyMatch: true }));
}

/** 검색 결과 중 좌표가 있는 첫 시설을 기준으로 주변 수영장을 이어 붙인다. */
function withNearby(results: OfficialPool[]): OfficialPool[] {
  const anchor = results.find((p) => p.lat != null && p.lng != null);
  if (!anchor) return results;
  const excludeIds = new Set(results.map((p) => p.id));
  const nearby = findNearbyPools(anchor.lat as number, anchor.lng as number, excludeIds);
  return [...results, ...nearby];
}

// 수영장업 인허가 API(business) 쪽은 이름/주소/전화번호/영업상태뿐이라, 운영시간도 요금도
// 홈페이지도 전혀 없다 — 사용자가 눌러도 전화 말고는 할 게 없어서 불편하기만 하다.
// 운영시간·요금·홈페이지·규모·자유수영·부대시설 중 하나도 없는 결과는 검색 결과에서 뺀다.
function hasUsefulInfo(pool: OfficialPool): boolean {
  return !!(
    pool.homepageUrl ||
    pool.feeText ||
    pool.operWeekday ||
    pool.operWeekend ||
    pool.sizeText ||
    pool.freeSwimInfo ||
    pool.amenities
  );
}

/** 수영장 이름이나 지역(도로명주소/지번주소)으로 검색한다. 구 단위·동 단위 검색도 되게
 * 이름/도로명주소/지번주소 세 필드를 모두 훑어서 합친다.
 *
 * LIKE 검색은 검색어가 그대로 이어 붙은 문자열이어야 매치된다. 그런데 "서울 중구"라고
 * 검색해도 실제 주소는 "서울특별시 중구 ..."라 "서울 중구"라는 문자열이 그대로 들어있지
 * 않아서 매치가 안 된다. 그래서 여러 단어로 검색하면, 가장 구체적인 마지막 단어(보통
 * 구/동 이름)로 서버 검색을 하고, 나머지 단어는 결과에 다 포함되는지 클라이언트에서 한 번
 * 더 확인한다 — "중구"로 넓게 가져온 다음 "서울"도 포함된 것만 남기는 식이라, 대전 중구
 * 같은 동명이인도 자연스럽게 걸러진다. */
export async function searchOfficialPools(query: string, maxResults = 100): Promise<OfficialPool[]> {
  if (!query.trim()) return [];

  const tokens = query.trim().split(/\s+/).filter(Boolean);
  const primary = tokens[tokens.length - 1];
  const publicResults = [...searchSeoulFacilities(tokens), ...searchPublicFacilities(tokens)];

  if (HAS_SNAPSHOT) {
    const licensed = dedupeAgainst(publicResults, searchLicensed(tokens)).slice(0, maxResults);
    return withNearby([...publicResults, ...licensed]).filter((p) => p.source === 'business' || hasUsefulInfo(p));
  }

  if (!API_KEY) return withNearby(publicResults).filter(hasUsefulInfo);

  try {
    const [byName, byRoadAddress, byLotAddress] = await Promise.all([
      fetchByCondition('BPLC_NM', primary, maxResults),
      fetchByCondition('ROAD_NM_ADDR', primary, maxResults),
      fetchByCondition('LOTNO_ADDR', primary, maxResults),
    ]);
    const byId = new Map<string, OfficialPool>();
    [...byName, ...byRoadAddress, ...byLotAddress].forEach((p) => byId.set(p.id, p));
    const businessResults = Array.from(byId.values());
    const filtered = tokens.length > 1 ? businessResults.filter((p) => matchesAllTokens(p, tokens)) : businessResults;
    return withNearby([...publicResults, ...filtered]).filter(hasUsefulInfo);
  } catch {
    return withNearby(publicResults).filter(hasUsefulInfo);
  }
}

// ───────── 동네(지역) 기준 검색 ─────────
// 동네를 치면 그 위치 주변 수영장을 거리순으로 보여준다. 번들 데이터(서울+전국 공공시설)에
// 없는 지역(예: 고양시)은 전국 인허가 수영장 API를 그 지역 주소로 조회해서 채운다.
// 이 API 결과엔 운영시간/요금이 없어서 기존 검색에선 숨겼지만, 동네 검색에서는 "근처에 수영장이
// 있다"는 것 자체가 정보라서 이름/주소/전화/길찾기만으로도 보여준다.
const REGION_PAGE_SIZE = 100;
const REGION_MAX_PAGES = 4;
const regionCache = new Map<string, OfficialPool[]>();

async function fetchRegionPage(field: 'ROAD_NM_ADDR' | 'LOTNO_ADDR', term: string, pageNo: number) {
  const params = new URLSearchParams({
    serviceKey: API_KEY as string,
    pageNo: String(pageNo),
    numOfRows: String(REGION_PAGE_SIZE),
    returnType: 'json',
  });
  params.set(`cond[${field}::LIKE]`, term);
  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  const json = await res.json();
  const body = json?.response?.body;
  const items = body?.items?.item ?? [];
  return {
    items: (Array.isArray(items) ? items : [items]).filter(Boolean),
    total: Number(body?.totalCount ?? 0),
  };
}

/** 주소에 지역명(예: "고양시")이 들어간 인허가 수영장 전부(최대 4페이지×2필드). 한 번 받으면 앱을 쓰는 동안 재사용한다. */
async function fetchRegionPools(term: string): Promise<OfficialPool[]> {
  const cached = regionCache.get(term);
  if (cached) return cached;

  const fields = ['ROAD_NM_ADDR', 'LOTNO_ADDR'] as const;
  const firsts = await Promise.all(fields.map((f) => fetchRegionPage(f, term, 1)));
  const rest = await Promise.all(
    fields.flatMap((f, i) => {
      const pages = Math.min(REGION_MAX_PAGES, Math.ceil(firsts[i].total / REGION_PAGE_SIZE));
      return Array.from({ length: Math.max(0, pages - 1) }, (_, k) => fetchRegionPage(f, term, k + 2));
    })
  );

  const byId = new Map<string, OfficialPool>();
  [...firsts, ...rest]
    .flatMap((r) => r.items)
    .map(mapItem)
    .filter((p) => !CLOSED_STATUS_PATTERN.test(p.statusName) && isInKorea(p.lat, p.lng))
    .forEach((p) => byId.set(p.id, p));
  const result = Array.from(byId.values());
  regionCache.set(term, result);
  return result;
}

/** 검색한 장소 주변 수영장을 가까운 순으로 돌려준다. API가 실패해도 번들 데이터만으로 결과를 낸다. */
export async function findPoolsNear(place: PlaceInfo, limit = 40): Promise<OfficialPool[]> {
  const bundled = allPools().filter((p) => isInKorea(p.lat, p.lng));

  let business: OfficialPool[] = [];
  if (!HAS_SNAPSHOT && API_KEY && place.regionTerms.length > 0) {
    try {
      business = (await Promise.all(place.regionTerms.map(fetchRegionPools))).flat();
    } catch {
      business = [];
    }
  }

  const extra = dedupeAgainst(bundled, business);
  return rankNearby([...bundled, ...extra], place, place.radiusKm, limit);
}

/** 수영장 찾기 탭에 처음 들어왔을 때(아직 검색 전) 지도를 바로 보여주기 위한 기본 목록.
 * 라이브 API 호출 없이, 이미 메모리에 있는 번들 데이터 중 쓸만한 정보가 있는 곳만 추려서
 * 돌려준다 — 검색창에 뭔가 입력하기 전에도 지도가 비어있지 않게.
 * GPS 현재 위치를 넘기면, 거리순으로 정렬해서 내 주변 수영장부터 보여준다. */
export function getDefaultOfficialPools(
  limit = 30,
  userLocation?: { lat: number; lng: number }
): OfficialPool[] {
  const pools = allPools().filter(
    (p) => p.lat != null && p.lng != null && (p.source === 'business' || hasUsefulInfo(p))
  );

  // 내 위치를 모르면 예전처럼 상세 정보가 있는 곳(서울/공공시설)을 앞에서부터 보여준다.
  if (!userLocation) return pools.filter(hasUsefulInfo).slice(0, limit);

  return pools
    .map((p) => ({
      pool: p,
      dist: haversineKm(userLocation.lat, userLocation.lng, p.lat as number, p.lng as number),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map((x) => ({ ...x.pool, nearbyMatch: x.dist <= NEARBY_RADIUS_KM }));
}

/** 자유수영 탭 전용 — 자유수영 시간 안내가 실제로 있는 공공 수영장만 골라서 돌려준다.
 * 수영장업 인허가 API(business)는 애초에 자유수영 정보가 없으니 대상에서 뺀다. 라이브
 * API 호출 없이, 이미 메모리에 있는 번들 데이터(서울+전국 공공시설)만 훑으면 된다. */
export function getFreeSwimPools(query?: string): OfficialPool[] {
  const tokens = (query ?? '').trim().split(/\s+/).filter(Boolean);
  const all = [
    ...SEOUL_POOL_FACILITIES.map(mapSeoulFacility),
    ...PUBLIC_POOL_FACILITIES.map(mapPublicFacility),
  ].filter((p) => !!p.freeSwimInfo);

  if (tokens.length === 0) return all;
  return all.filter((p) => matchesAllTokens(p, tokens));
}

/** 외부 지도 앱(카카오맵)으로 여는 링크. 카카오맵 API 키 없이도 작동한다.
 * 좌표가 없는 시설(서울 열린데이터광장 쪽엔 좌표 필드가 없음)은 좌표 대신 실제 주소로
 * 검색하는 링크로 대신한다 — 좌표를 지어내지 않고, 있는 그대로의 주소 데이터만 쓴다. */
export function mapLinkFor(pool: OfficialPool): string | undefined {
  if (pool.lat != null && pool.lng != null) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(pool.name)},${pool.lat},${pool.lng}`;
  }
  if (pool.roadAddress) {
    return `https://map.kakao.com/link/search/${encodeURIComponent(pool.roadAddress)}`;
  }
  return undefined;
}

// 정부 데이터셋엔 수강신청/자유수영 등록 페이지 링크가 없다. 없는 링크를 지어낼 수 없어서,
// 그 수영장 이름으로 검색 결과를 바로 열어주는 방식으로 대신한다 — 실제로 존재하는
// 등록 페이지를 사용자가 검색 한 번으로 바로 찾아갈 수 있다.
export function registrationSearchLinkFor(pool: OfficialPool): string {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(`${pool.name} 수강신청`)}`;
}
