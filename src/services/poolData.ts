// 행정안전부_생활_수영장업 조회서비스 (data.go.kr) 연동.
// 실제 인허가받은 수영장의 이름/주소/전화번호/영업상태를 정부 공식 데이터로 가져온다.
// 운영시간·이용료 등 세부 정보는 이 API엔 없어서, PUBLIC_POOL_FACILITIES(전국공공시설
// 개방정보표준데이터에서 걸러낸 공공 수영장 목록)와 SEOUL_POOL_FACILITIES(서울 열린데이터
// 광장에서 걸러낸 서울시내 공공 수영장 목록)를 같이 검색해서 합친다 — 평일/주말 운영시간,
// 이용료, 부대시설, 홈페이지, (서울 쪽은) 레일 수·자유수영 안내까지 실제로 들어있다.
import proj4 from 'proj4';
import { PUBLIC_POOL_FACILITIES } from '../data/publicPoolFacilities';
import { SEOUL_POOL_FACILITIES } from '../data/seoulPoolFacilities';

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
}

export const isPoolDataConfigured = !!API_KEY;

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

  if (!API_KEY) return publicResults;

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
    return [...publicResults, ...filtered];
  } catch {
    return publicResults;
  }
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
