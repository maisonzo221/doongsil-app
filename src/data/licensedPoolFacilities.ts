// 자동 생성 파일 — scripts/fetch-pool-data.mjs로 만든다. 직접 고치지 않는다.
// 아직 내려받기 전이라 비어 있다. 비어 있는 동안 앱은 실시간 API 조회로 대신한다.
// 행: [관리번호, 이름, 도로명주소, 지번주소(도로명과 같으면 빈칸), 전화, 위도, 경도]
export type LicensedPoolRow = readonly [
  id: string,
  name: string,
  roadAddress: string,
  lotAddress: string,
  phone: string,
  lat: number,
  lng: number,
];

export const LICENSED_POOLS_UPDATED = '';

export const LICENSED_POOL_FACILITIES: readonly LicensedPoolRow[] = [];
