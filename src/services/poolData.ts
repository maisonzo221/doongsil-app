// 행정안전부_생활_수영장업 조회서비스 (data.go.kr) 연동.
// 실제 인허가받은 수영장의 이름/주소/전화번호/영업상태를 정부 공식 데이터로 가져온다.
// 이 데이터셋엔 자유수영 시간표나 요금 정보는 없다 — 그건 storage/tipRoom.ts의
// 크라우드소싱 pools 테이블에서 따로 관리한다.
import proj4 from 'proj4';

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
  };
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

/** 수영장 이름이나 지역(도로명주소/지번주소)으로 검색한다. 구 단위·동 단위 검색도 되게
 * 이름/도로명주소/지번주소 세 필드를 모두 훑어서 합친다. */
export async function searchOfficialPools(query: string, maxResults = 50): Promise<OfficialPool[]> {
  if (!API_KEY || !query.trim()) return [];

  try {
    const q = query.trim();
    const [byName, byRoadAddress, byLotAddress] = await Promise.all([
      fetchByCondition('BPLC_NM', q, maxResults),
      fetchByCondition('ROAD_NM_ADDR', q, maxResults),
      fetchByCondition('LOTNO_ADDR', q, maxResults),
    ]);
    const byId = new Map<string, OfficialPool>();
    [...byName, ...byRoadAddress, ...byLotAddress].forEach((p) => byId.set(p.id, p));
    return Array.from(byId.values());
  } catch {
    return [];
  }
}

/** 외부 지도 앱(카카오맵)으로 여는 링크. 카카오맵 API 키 없이도 작동한다. */
export function mapLinkFor(pool: OfficialPool): string | undefined {
  if (pool.lat == null || pool.lng == null) return undefined;
  return `https://map.kakao.com/link/map/${encodeURIComponent(pool.name)},${pool.lat},${pool.lng}`;
}

// 정부 데이터셋엔 수강신청/자유수영 등록 페이지 링크가 없다. 없는 링크를 지어낼 수 없어서,
// 그 수영장 이름으로 검색 결과를 바로 열어주는 방식으로 대신한다 — 실제로 존재하는
// 등록 페이지를 사용자가 검색 한 번으로 바로 찾아갈 수 있다.
export function registrationSearchLinkFor(pool: OfficialPool): string {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(`${pool.name} 수강신청`)}`;
}
