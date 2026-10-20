// 자동 생성 파일 — scripts/import-enrollment.mjs로 만든다. 직접 고치지 않는다.
// 수영장에 전화로 직접 확인한 신규회원 모집 일정만 들어간다. 확인 안 된 일정은 넣지 않는다.
// 아직 확인된 일정이 없어서 비어 있다.
export interface PoolEnrollmentRow {
  /** poolKey(name, address) — src/utils/poolKey.ts */
  key: string;
  poolName: string;
  /** 모집 회차 이름 (예: "11월 신규회원"). */
  label?: string;
  /** 접수 시작일 (YYYY-MM-DD) */
  openDate: string;
  /** 접수 시작 시각 (HH:mm) */
  openTime?: string;
  /** 접수 마감일 (YYYY-MM-DD). 없으면 접수 시작일 하루만. */
  closeDate?: string;
  /** 접수 방법 (예: 온라인, 현장) */
  method?: string;
  /** 접수 사이트 */
  url?: string;
  /** 전화로 확인한 날짜 (YYYY-MM-DD) */
  verifiedAt: string;
}

export const POOL_ENROLLMENT_UPDATED = '';

export const POOL_ENROLLMENTS: readonly PoolEnrollmentRow[] = [];

/** 전화로 확인해보니 수영장이 없거나 문을 닫은 곳 — 앱 목록에서 뺀다. */
export const POOL_EXCLUDED_KEYS: readonly string[] = [];
