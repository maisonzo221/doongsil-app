// 전화로 확인해서 채운 업체 리스트(CSV)를 앱 데이터로 바꾼다.
//
//   node scripts/import-enrollment.mjs ~/Documents/수영장전화확인.csv
//
// 만드는 파일
//   src/data/poolEnrollment.ts          신규회원 모집 일정 + "수영장 없음" 목록
//   src/data/verifiedPoolFacilities.ts  전화로 "운영 중"을 확인한, 앱에 없던 수영장
//
// 규칙 (정확한 정보만 앱에 넣기 위해)
//   - 통화일자가 없는 줄은 무시한다. 전화로 확인한 줄만 반영한다.
//   - 접수 시작일(필수)과 마감일이 날짜 형식이 아니거나 앞뒤가 바뀌면 그 줄은 건너뛰고 이유를 알려준다.
//   - 같은 수영장의 일정이 여러 개면(월별 모집 등) 줄을 복사해서 일정마다 한 줄씩 쓴다.
//   - 수영장 운영(Y/N)에 N이면 앱 목록에서 뺀다.
//   - 이 스크립트는 두 파일을 CSV 내용으로 통째로 다시 쓴다. 항상 같은 CSV 파일을 계속 채워가며 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2];
if (!file) {
  console.error('사용법: node scripts/import-enrollment.mjs <채운 CSV 파일 경로>');
  process.exit(1);
}
const outDir = process.env.IMPORT_OUT_DIR ?? path.join(ROOT, 'src', 'data');

// ───────── 읽기 (엑셀이 CP949로 저장했을 때도 읽는다) ─────────
function readText(p) {
  const buf = fs.readFileSync(p);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('euc-kr').decode(buf);
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

// ───────── 값 정리 ─────────
const pad = (n) => String(n).padStart(2, '0');

function normDate(text) {
  const t = String(text ?? '').trim();
  if (!t) return { empty: true };
  const m = /^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\.?$/.exec(t) ?? /^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?$/.exec(t);
  if (!m) return { error: `날짜 형식을 모르겠어요: "${t}" (예: 2026-11-03)` };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return { error: `없는 날짜예요: "${t}"` };
  return { value: `${y}-${pad(mo)}-${pad(d)}` };
}

function normTime(text) {
  const t = String(text ?? '').trim();
  if (!t) return { empty: true };
  const m = /^(오전|오후|AM|PM)?\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i.exec(t);
  if (!m) return { error: `시각 형식을 모르겠어요: "${t}" (예: 10:00)` };
  let h = Number(m[2]);
  const mer = (m[1] ?? m[4] ?? '').toUpperCase();
  if ((mer === '오후' || mer === 'PM') && h < 12) h += 12;
  if ((mer === '오전' || mer === 'AM') && h === 12) h = 0;
  if (h > 23 || Number(m[3]) > 59) return { error: `시각이 이상해요: "${t}"` };
  return { value: `${pad(h)}:${m[3]}` };
}

// ───────── 처리 ─────────
const table = parseCsv(readText(file));
if (table.length < 2) {
  console.error('CSV에 내용이 없어요. 파일을 확인해주세요.');
  process.exit(1);
}
const header = table[0].map((h) => h.trim());
const col = (name) => {
  const i = header.findIndex((h) => h === name || h.startsWith(name));
  if (i < 0) {
    console.error(`CSV에 "${name}" 열이 없어요. 열 이름을 바꾸거나 지우지 마세요.`);
    process.exit(1);
  }
  return i;
};
const C = {
  group: col('구분'), name: col('시설명'), address: col('주소'), phone: col('전화번호'), homepage: col('홈페이지'),
  inApp: col('앱 등록'), run: col('수영장 운영'), method: col('모집 방식'), open: col('접수 시작일'),
  openTime: col('접수 시작시각'), close: col('접수 마감일'), how: col('접수 방법'), url: col('접수 사이트'),
  label: col('모집 회차명'), called: col('통화일자'), key: col('key'), lat: col('위도'), lng: col('경도'),
};

const problems = [];
const enrollments = [];
const excluded = new Set();
const verified = new Map();
let usedRows = 0;

for (let i = 1; i < table.length; i++) {
  const r = table[i];
  const get = (k) => (r[C[k]] ?? '').trim();
  const where = `${i + 1}번째 줄 "${get('name')}"`;
  const hasInput = ['run', 'method', 'open', 'openTime', 'close', 'how', 'url', 'label'].some((k) => get(k));
  if (!hasInput) continue;

  const called = normDate(get('called'));
  if (called.empty) { problems.push(`${where}: 통화일자가 없어서 건너뜀 (전화로 확인한 줄만 반영해요)`); continue; }
  if (called.error) { problems.push(`${where}: 통화일자 ${called.error}`); continue; }
  const key = get('key');
  if (!key) { problems.push(`${where}: key 열이 비어 있어서 건너뜀 (지우지 마세요)`); continue; }

  const run = get('run').toUpperCase();
  if (run && !['Y', 'N'].includes(run)) { problems.push(`${where}: 수영장 운영은 Y 또는 N만 써주세요 ("${get('run')}")`); continue; }
  if (run === 'N') { excluded.add(key); usedRows++; continue; }

  if (run === 'Y' && get('inApp') === '미추가') {
    const lat = Number(get('lat'));
    const lng = Number(get('lng'));
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat && lng) {
      verified.set(key, {
        id: `verified-${verified.size}`, name: get('name'), roadAddress: get('address'), lotAddress: get('address'),
        phone: get('phone') || null, statusName: '전화 확인 완료', lat, lng,
        operWeekday: null, operWeekend: null, closedDay: null, feeText: null, capacity: null, amenities: null,
        applyMethod: null, homepageUrl: get('homepage') || null, photoUrl: null, institution: null,
      });
    } else problems.push(`${where}: 앱에 없던 곳인데 위도/경도가 없어서 지도에 못 넣어요`);
  }

  if (!get('open')) { usedRows++; continue; }
  const open = normDate(get('open'));
  const close = normDate(get('close'));
  const time = normTime(get('openTime'));
  const err = open.error ?? (close.error) ?? time.error;
  if (err) { problems.push(`${where}: ${err}`); continue; }
  if (close.value && close.value < open.value) { problems.push(`${where}: 마감일이 접수 시작일보다 빨라요`); continue; }

  const e = { key, poolName: get('name'), verifiedAt: called.value, openDate: open.value };
  if (get('label')) e.label = get('label');
  if (time.value) e.openTime = time.value;
  if (close.value) e.closeDate = close.value;
  if (get('how')) e.method = get('how');
  if (get('url')) e.url = get('url');
  enrollments.push(e);
  usedRows++;
}

enrollments.sort((a, b) => a.openDate.localeCompare(b.openDate) || a.key.localeCompare(b.key));
const today = new Date().toISOString().slice(0, 10);

const enrollmentTs = `// 자동 생성 파일 — scripts/import-enrollment.mjs로 만든다. 직접 고치지 않는다.
// 수영장에 전화로 직접 확인한 신규회원 모집 일정만 들어간다. 확인 안 된 일정은 넣지 않는다.
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

export const POOL_ENROLLMENT_UPDATED = '${today}';

export const POOL_ENROLLMENTS: readonly PoolEnrollmentRow[] = ${JSON.stringify(enrollments, null, 2)};

/** 전화로 확인해보니 수영장이 없거나 문을 닫은 곳 — 앱 목록에서 뺀다. */
export const POOL_EXCLUDED_KEYS: readonly string[] = ${JSON.stringify([...excluded].sort(), null, 2)};
`;

const verifiedTs = `// 자동 생성 파일 — scripts/import-enrollment.mjs로 만든다. 직접 고치지 않는다.
// 전화로 "수영장 운영 중"을 직접 확인한 수영장 중, 앱 데이터에 없던 곳.
import type { PublicPoolFacility } from './publicPoolFacilities';

export const VERIFIED_POOL_FACILITIES: PublicPoolFacility[] = ${JSON.stringify([...verified.values()], null, 2)};
`;

fs.writeFileSync(path.join(outDir, 'poolEnrollment.ts'), enrollmentTs);
fs.writeFileSync(path.join(outDir, 'verifiedPoolFacilities.ts'), verifiedTs);

console.log(`반영한 줄 ${usedRows}개`);
console.log(`  모집 일정 ${enrollments.length}건 / 수영장 없음 ${excluded.size}곳 / 새로 확인된 수영장 ${verified.size}곳`);
if (problems.length) {
  console.log(`\n건너뛴 줄 ${problems.length}개:`);
  problems.forEach((p) => console.log(`  - ${p}`));
}
