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

async function fetchByCondition(field: 'BPLC_NM' | 'ROAD_NM_ADDR', query: string, maxResults: number) {
  const params = new URLSearchParams({
    serviceKey: API_KEY as string,
    pageNo: '1',
    numOfRows: String(maxResults),
    returnType: 'json',
    'cond[SALS_STTS_CD::EQ]': '01', // 영업/정상 상태만
  });
  params.set(`cond[${field}::LIKE]`, query);

  const res = await fetch(`${BASE_URL}?${params.toString()}`);
  const json = await res.json();
  const items = json?.response?.body?.items?.item ?? [];
  return (Array.isArray(items) ? items : [items]).filter(Boolean).map(mapItem);
}

/** 수영장 이름이나 지역(도로명주소)으로 검색한다. 둘 다 시도해서 합친다. */
export async function searchOfficialPools(query: string, maxResults = 20): Promise<OfficialPool[]> {
  if (!API_KEY || !query.trim()) return [];

  try {
    const [byName, byAddress] = await Promise.all([
      fetchByCondition('BPLC_NM', query.trim(), maxResults),
      fetchByCondition('ROAD_NM_ADDR', query.trim(), maxResults),
    ]);
    const byId = new Map<string, OfficialPool>();
    [...byName, ...byAddress].forEach((p) => byId.set(p.id, p));
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
