// 전국 수영장 후보를 모아서 "전화 확인용 업체 리스트(CSV)"를 만든다.
//
//   npx -y tsx scripts/collect-pools.ts            (Mac 터미널, 프로젝트 폴더에서)
//
// 모으는 곳
//   1) 앱에 이미 들어있는 데이터: 서울 공공체육시설, 공공시설개방정보, 인허가(수영장업), 손으로 추가한 곳
//   2) 오픈스트리트맵(OSM): 전국에서 이름이 있는 수영장/수영 시설 (키 필요 없음)
//   3) 공공시설개방정보 전체(키 필요: EXPO_PUBLIC_POOL_DATA_API_KEY) — "체육센터" 등 수영장이 있을 만한 공공시설까지
//
// 나오는 것
//   scripts/out/pool-vendor-list-날짜.csv   전화 확인용 리스트 (엑셀/넘버스로 열기)
//   scripts/out/pool-collect-report.txt     집계
//   src/data/candidatePoolFacilities.ts     "수영장" 근거가 확실한 새 후보 — 앱에 바로 반영(전화 확인 전)
//
// 옵션: --skip-osm  --skip-public-api  --skip-reverse(주소 없는 후보의 주소 찾기를 건너뜀)
import fs from 'node:fs';
import path from 'node:path';
import { SEOUL_POOL_FACILITIES } from '../src/data/seoulPoolFacilities';
import { PUBLIC_POOL_FACILITIES, type PublicPoolFacility } from '../src/data/publicPoolFacilities';
import { MANUAL_POOL_FACILITIES } from '../src/data/manualPoolFacilities';
import { VERIFIED_POOL_FACILITIES } from '../src/data/verifiedPoolFacilities';
import { LICENSED_POOL_FACILITIES } from '../src/data/licensedPoolFacilities';
import { haversineKm, isInKorea } from '../src/services/geo';
import { poolKey } from '../src/utils/poolKey';

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'scripts', 'out');
const args = new Set(process.argv.slice(2));

// ───────── 분류 ─────────
export type Group = '공공' | '민간' | '확인필요';

const PUBLIC_NAME = /시립|구립|군립|도립|시민|구민|군민|국민체육|체육센터|체육관|문화체육|생활체육|종합운동장|종합체육|공단|시설관리|도시공사|문화재단|수련관|복지관|청소년|문화센터|레포츠/;
const PUBLIC_OPERATOR = /공단|공사|시설관리|체육회|문화재단|구청|시청|군청|교육청|재단법인|사회복지/;
// 회원을 받는 수영장이 아닌 것(숙박/물놀이/아파트 입주민용 등)은 후보에서 뺀다.
const NOT_A_CLUB = /호텔|리조트|펜션|모텔|콘도|풀빌라|캠핑|글램핑|아파트|힐스테이트|자이|푸르지오|래미안|아이파크|편한세상|입주민|워터파크|워터월드|물놀이|야외수영장|해수욕장|계곡|온천|스파|사우나|찜질|키즈풀/;
const WEAK_PUBLIC_NAME = /체육센터|체육관|스포츠센터|레포츠|문화체육|종합운동장|국민체육|복지관|수련관|생활체육|문화센터|종합체육/;

export function classify(name: string, operator = ''): Exclude<Group, '확인필요'> {
  return PUBLIC_NAME.test(name) || PUBLIC_OPERATOR.test(operator) ? '공공' : '민간';
}

// ───────── 행(Row) ─────────
interface Row {
  key: string;
  group: Group;
  name: string;
  address: string;
  phone: string;
  homepage: string;
  origin: string;
  /** 기존: 앱에 이미 있음 / 앱추가: 이번에 앱에 넣음(전화 확인 전) / 미추가: 앱엔 안 넣고 전화로 확인할 후보 */
  inApp: '기존' | '앱추가' | '미추가';
  lat?: number;
  lng?: number;
  note?: string;
}

const norm = (t: string) => t.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^0-9a-z가-힣]/g, '');

function makeRow(r: Omit<Row, 'key'>): Row {
  return { ...r, key: poolKey({ name: r.name, roadAddress: r.address }) };
}

// ───────── 중복 판정 ─────────
class Index {
  private cells = new Map<string, Row[]>();
  private names = new Set<string>();
  all: Row[] = [];
  private cell(lat: number, lng: number) {
    return `${Math.floor(lat / 0.01)},${Math.floor(lng / 0.01)}`;
  }
  add(r: Row) {
    this.all.push(r);
    this.names.add(norm(r.name));
    if (r.lat != null && r.lng != null) {
      const c = this.cell(r.lat, r.lng);
      (this.cells.get(c) ?? this.cells.set(c, []).get(c)!).push(r);
    }
  }
  /** 같은 곳인지: 이름이 같거나, 120m 안이거나, 400m 안이면서 한쪽 이름이 다른 쪽을 포함. */
  isDup(r: { name: string; lat?: number; lng?: number }): boolean {
    const n = norm(r.name);
    if (this.names.has(n)) return true;
    if (r.lat == null || r.lng == null) return false;
    const cx = Math.floor(r.lat / 0.01);
    const cy = Math.floor(r.lng / 0.01);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const o of this.cells.get(`${cx + dx},${cy + dy}`) ?? []) {
          const d = haversineKm(r.lat, r.lng, o.lat as number, o.lng as number);
          if (d < 0.12) return true;
          if (d < 0.4) {
            const on = norm(o.name);
            if ((on.length >= 4 && n.includes(on)) || (n.length >= 4 && on.includes(n))) return true;
          }
        }
      }
    }
    return false;
  }
}

// ───────── 1) 앱에 이미 있는 데이터 ─────────
function bundledRows(): Row[] {
  const rows: Row[] = [];
  for (const f of SEOUL_POOL_FACILITIES) {
    rows.push(
      makeRow({
        group: '공공',
        name: f.name,
        address: f.roadAddress,
        phone: f.phone ?? '',
        homepage: f.homepageUrl ?? '',
        origin: '서울 열린데이터광장',
        inApp: '기존',
        lat: f.lat ?? undefined,
        lng: f.lng ?? undefined,
      })
    );
  }
  const pub = [...PUBLIC_POOL_FACILITIES, ...MANUAL_POOL_FACILITIES, ...VERIFIED_POOL_FACILITIES];
  for (const f of pub) {
    rows.push(
      makeRow({
        group: '공공',
        name: f.name,
        address: f.roadAddress,
        phone: f.phone ?? '',
        homepage: f.homepageUrl ?? '',
        origin: f.id.startsWith('pub-') ? '공공시설개방정보' : '수동 추가',
        inApp: '기존',
        lat: f.lat,
        lng: f.lng,
      })
    );
  }
  for (const [, name, road, lot, phone, lat, lng] of LICENSED_POOL_FACILITIES) {
    rows.push(
      makeRow({
        group: classify(name),
        name,
        address: road || lot,
        phone,
        homepage: '',
        origin: '행안부 수영장업 인허가',
        inApp: '기존',
        lat,
        lng,
      })
    );
  }
  return rows;
}

// ───────── 2) 오픈스트리트맵 ─────────
const OVERPASS = (process.env.OVERPASS_URL ? [process.env.OVERPASS_URL] : [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function overpass(query: string): Promise<any[]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = OVERPASS[attempt % OVERPASS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'doongsil-pool-collector/1.0' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(150000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: any = await res.json();
      return json.elements ?? [];
    } catch (e) {
      lastErr = e;
      await sleep(4000 * (attempt + 1));
    }
  }
  throw lastErr;
}

// 한국 전체를 위도 1도 x 경도 1.6도 타일로 나눠서 조회한다(한 번에 하면 서버가 시간 초과로 끊는다).
function tiles(): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let s = 33; s < 38.8; s += 1) {
    for (let w = 124.5; w < 131.2; w += 1.6) out.push([s, w, s + 1, w + 1.6]);
  }
  return out;
}

interface OsmItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tags: Record<string, string>;
}

async function collectOsm(): Promise<OsmItem[]> {
  const seen = new Map<string, OsmItem>();
  const list = tiles();
  for (let i = 0; i < list.length; i++) {
    const [s, w, n, e] = list[i];
    const bb = `${s},${w},${n},${e}`;
    const q = `[out:json][timeout:120];(
      nwr["leisure"="swimming_pool"]["name"](${bb});
      nwr["sport"="swimming"]["name"](${bb});
      nwr["leisure"="sports_centre"]["name"~"수영"](${bb});
    );out center tags;`;
    process.stdout.write(`  OSM ${i + 1}/${list.length} `);
    const els = await overpass(q);
    let added = 0;
    for (const el of els) {
      const tags = el.tags ?? {};
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!tags.name || lat == null || lng == null || !isInKorea(lat, lng)) continue;
      const id = `${el.type}/${el.id}`;
      if (seen.has(id)) continue;
      seen.set(id, { id, name: String(tags.name).trim(), lat, lng, tags });
      added++;
    }
    console.log(`→ ${added}건`);
    await sleep(1500);
  }
  return Array.from(seen.values());
}

function osmExcluded(it: OsmItem): boolean {
  const t = it.tags;
  if (['private', 'customers', 'no'].includes(t.access)) return true;
  if (['hotel', 'motel', 'hostel', 'guest_house', 'camp_site', 'apartment', 'chalet'].includes(t.tourism)) return true;
  if (['apartments', 'residential', 'dormitory'].includes(t.building)) return true;
  return NOT_A_CLUB.test(it.name);
}

function osmAddress(t: Record<string, string>): string {
  if (t['addr:full']) return t['addr:full'];
  const parts = [t['addr:province'], t['addr:city'], t['addr:district'], t['addr:street'], t['addr:housenumber']].filter(Boolean);
  return parts.join(' ');
}

// ───────── 주소 보충(Nominatim 역지오코딩, 캐시) ─────────
const REVERSE_CACHE = path.join(OUT_DIR, 'reverse-cache.json');

async function fillAddresses(rows: Row[]): Promise<void> {
  const cache: Record<string, string> = fs.existsSync(REVERSE_CACHE) ? JSON.parse(fs.readFileSync(REVERSE_CACHE, 'utf8')) : {};
  const todo = rows.filter((r) => !r.address && r.lat != null && r.lng != null);
  let done = 0;
  for (const r of todo) {
    const ck = `${(r.lat as number).toFixed(5)},${(r.lng as number).toFixed(5)}`;
    if (cache[ck] === undefined) {
      try {
        const u = `https://nominatim.openstreetmap.org/reverse?lat=${r.lat}&lon=${r.lng}&format=jsonv2&zoom=18&accept-language=ko&addressdetails=1`;
        const res = await fetch(u, { headers: { 'user-agent': 'doongsil-pool-collector/1.0' }, signal: AbortSignal.timeout(15000) });
        const json: any = res.ok ? await res.json() : null;
        const a = json?.address ?? {};
        cache[ck] = [a.province ?? a.state, a.city ?? a.county, a.borough ?? a.city_district, a.road, a.house_number]
          .filter(Boolean)
          .join(' ');
        if (!cache[ck]) cache[ck] = String(json?.display_name ?? '').split(',').reverse().join(' ').trim();
      } catch {
        cache[ck] = '';
      }
      await sleep(1100);
      if (++done % 25 === 0) {
        fs.writeFileSync(REVERSE_CACHE, JSON.stringify(cache));
        console.log(`  주소 찾는 중 ${done}/${todo.length}`);
      }
    }
    r.address = cache[ck] ?? '';
    r.key = poolKey({ name: r.name, roadAddress: r.address });
  }
  fs.writeFileSync(REVERSE_CACHE, JSON.stringify(cache));
}

// ───────── 3) 공공시설개방정보 전체 ─────────
const PUBLIC_API = process.env.PUBLIC_API_BASE ?? 'https://api.data.go.kr/openapi/tn_pubr_public_pblfclt_opn_info_api';

function readKey(): string | undefined {
  if (process.env.EXPO_PUBLIC_POOL_DATA_API_KEY) return process.env.EXPO_PUBLIC_POOL_DATA_API_KEY;
  for (const f of ['.env.local', '.env']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const m = /^\s*EXPO_PUBLIC_POOL_DATA_API_KEY\s*=\s*(.+?)\s*$/m.exec(fs.readFileSync(p, 'utf8'));
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  return undefined;
}

function pick(rec: Record<string, any>, ...tests: RegExp[]): string {
  for (const t of tests) {
    const k = Object.keys(rec).find((key) => t.test(key) && rec[key] != null && String(rec[key]).trim() !== '');
    if (k) return String(rec[k]).trim();
  }
  return '';
}

async function collectPublicApi(key: string): Promise<Record<string, any>[]> {
  const all: Record<string, any>[] = [];
  const size = 500;
  for (let page = 1; page <= 60; page++) {
    const u = `${PUBLIC_API}?serviceKey=${encodeURIComponent(key)}&pageNo=${page}&numOfRows=${size}&type=json`;
    let body: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(u, { signal: AbortSignal.timeout(60000) });
        const text = await res.text();
        body = JSON.parse(text)?.response?.body;
        if (body) break;
        throw new Error(`응답 형식이 달라요: ${text.slice(0, 120)}`);
      } catch (e) {
        if (attempt === 2) throw e;
        await sleep(2000);
      }
    }
    const raw = body.items;
    const items: Record<string, any>[] = Array.isArray(raw) ? raw : raw?.item ? (Array.isArray(raw.item) ? raw.item : [raw.item]) : [];
    all.push(...items);
    if (page === 1) console.log(`  공공시설개방정보 총 ${body.totalCount}건, 항목 이름: ${Object.keys(items[0] ?? {}).join(', ')}`);
    if (all.length >= Number(body.totalCount ?? 0) || items.length === 0) break;
  }
  return all;
}

// ───────── CSV ─────────
const COLUMNS = [
  '구분', '시설명', '시도', '시군구', '주소', '전화번호', '홈페이지', '출처', '앱 등록', '지도 보기',
  '수영장 운영(Y/N)', '모집 방식', '접수 시작일(YYYY-MM-DD)', '접수 시작시각(HH:mm)', '접수 마감일(YYYY-MM-DD)',
  '접수 방법', '접수 사이트', '모집 회차명', '통화일자(YYYY-MM-DD)', '메모',
  'key(수정금지)', '위도(수정금지)', '경도(수정금지)',
];

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function region(address: string): [string, string] {
  const t = address.trim().split(/\s+/);
  return [t[0] ?? '', t[1] ?? ''];
}

const GROUP_ORDER: Record<Group, number> = { 공공: 0, 확인필요: 1, 민간: 2 };
const INAPP_LABEL: Record<Row['inApp'], string> = { 기존: '기존', 앱추가: '이번에 추가(미확인)', 미추가: '미추가' };

function toCsv(rows: Row[]): string {
  const sorted = [...rows].sort((a, b) => {
    const ra = region(a.address);
    const rb = region(b.address);
    return (
      GROUP_ORDER[a.group] - GROUP_ORDER[b.group] ||
      (ra[0] || '힣').localeCompare(rb[0] || '힣', 'ko') ||
      (ra[1] || '힣').localeCompare(rb[1] || '힣', 'ko') ||
      a.name.localeCompare(b.name, 'ko')
    );
  });
  const lines = [COLUMNS.map(csvCell).join(',')];
  for (const r of sorted) {
    const [sido, sigungu] = region(r.address);
    const map = r.lat != null && r.lng != null ? `https://map.kakao.com/link/map/${encodeURIComponent(r.name)},${r.lat},${r.lng}` : '';
    lines.push(
      [r.group, r.name, sido, sigungu, r.address, r.phone, r.homepage, r.origin + (r.note ? ` (${r.note})` : ''), INAPP_LABEL[r.inApp], map,
        '', '', '', '', '', '', '', '', '', '', r.key, r.lat ?? '', r.lng ?? ''].map(csvCell).join(',')
    );
  }
  // 엑셀이 한글을 깨지 않게 UTF-8 BOM을 붙인다.
  return `﻿${lines.join('\r\n')}\r\n`;
}

function candidateFile(rows: Row[]): string {
  const items: PublicPoolFacility[] = rows
    .filter((r) => r.inApp === '앱추가' && r.lat != null && r.lng != null)
    .map((r, i) => ({
      id: `cand-${i}`,
      name: r.name,
      roadAddress: r.address,
      lotAddress: r.address,
      phone: r.phone || null,
      statusName: '정보 확인 중',
      lat: r.lat as number,
      lng: r.lng as number,
      operWeekday: null,
      operWeekend: null,
      closedDay: null,
      feeText: null,
      capacity: null,
      amenities: null,
      applyMethod: null,
      homepageUrl: r.homepage || null,
      photoUrl: null,
      institution: null,
    }));
  return `// 자동 생성 파일 — scripts/collect-pools.ts로 만든다. 직접 고치지 않는다.
// 오픈스트리트맵/공공시설개방정보에서 "수영장"이라는 근거가 있는 후보. 전화 확인 전이라 상세 정보가 없다.
import type { PublicPoolFacility } from './publicPoolFacilities';

export const CANDIDATE_POOLS_UPDATED = '${new Date().toISOString().slice(0, 10)}';

export const CANDIDATE_POOL_FACILITIES: PublicPoolFacility[] = ${JSON.stringify(items)};
`;
}

// ───────── main ─────────
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const index = new Index();
  const rows: Row[] = [];
  const base = bundledRows();
  base.forEach((r) => {
    index.add(r);
    rows.push(r);
  });
  console.log(`앱에 이미 있는 수영장 ${base.length}곳`);
  const report: string[] = [`앱에 이미 있는 수영장: ${base.length}곳`];

  if (!args.has('--skip-osm')) {
    console.log('오픈스트리트맵에서 전국 수영장을 모으는 중 (10~20분 걸릴 수 있어요)…');
    try {
      const osm = await collectOsm();
      let excluded = 0;
      let dup = 0;
      const fresh: Row[] = [];
      for (const it of osm) {
        if (osmExcluded(it)) { excluded++; continue; }
        const lat = it.lat;
        const lng = it.lng;
        if (index.isDup({ name: it.name, lat, lng })) { dup++; continue; }
        const operator = it.tags.operator ?? '';
        const row = makeRow({
          group: classify(it.name, operator),
          name: it.name,
          address: osmAddress(it.tags),
          phone: it.tags.phone ?? it.tags['contact:phone'] ?? '',
          homepage: it.tags.website ?? it.tags['contact:website'] ?? '',
          origin: '오픈스트리트맵',
          inApp: '앱추가',
          lat,
          lng,
          note: operator || undefined,
        });
        index.add(row);
        fresh.push(row);
      }
      rows.push(...fresh);
      const msg = `오픈스트리트맵: 이름 있는 수영장 ${osm.length}건 → 숙박/아파트 등 제외 ${excluded}, 이미 있음 ${dup}, 새로 추가 ${fresh.length}`;
      console.log(msg);
      report.push(msg);
    } catch (e) {
      const msg = `오픈스트리트맵 수집 실패(건너뜀): ${(e as Error).message}`;
      console.log(msg);
      report.push(msg);
    }
  }

  const key = readKey();
  if (!args.has('--skip-public-api') && key) {
    console.log('공공시설개방정보 전체를 받는 중…');
    try {
      const recs = await collectPublicApi(key);
      let strong = 0;
      let weak = 0;
      let dup = 0;
      for (const rec of recs) {
        const name = pick(rec, /^(fclty|openFclty|facility).*(nm|name)$/i, /(fclty|fcltyplc|plc|place).*nm$/i, /nm$/i);
        if (!name || NOT_A_CLUB.test(name)) continue;
        const text = Object.values(rec).filter((v) => typeof v === 'string').join(' ');
        const isStrong = /수영/.test(name) || /수영장/.test(text) && /수영장/.test(name);
        const isWeak = !isStrong && WEAK_PUBLIC_NAME.test(name);
        if (!isStrong && !isWeak) continue;
        const lat = Number(pick(rec, /latitude|lat$/i));
        const lng = Number(pick(rec, /longitude|lng$|lon$/i));
        const hasXY = Number.isFinite(lat) && Number.isFinite(lng) && isInKorea(lat, lng);
        if (index.isDup({ name, lat: hasXY ? lat : undefined, lng: hasXY ? lng : undefined })) { dup++; continue; }
        const row = makeRow({
          group: '공공',
          name,
          address: pick(rec, /rdnmadr|rdnAdr|roadAddr|도로명/i, /lnmadr|lotAddr|지번/i, /addr|adres/i),
          phone: pick(rec, /phone|tel/i),
          homepage: pick(rec, /homepage|url/i),
          origin: '공공시설개방정보',
          inApp: isStrong && hasXY ? '앱추가' : '미추가',
          lat: hasXY ? lat : undefined,
          lng: hasXY ? lng : undefined,
          note: isStrong ? undefined : '이름만 보고 후보로 넣음: 수영장 있는지 확인',
        });
        if (!isStrong) row.group = '확인필요';
        index.add(row);
        rows.push(row);
        if (isStrong) strong++;
        else weak++;
      }
      const msg = `공공시설개방정보 ${recs.length}건: 수영장 근거 있음 +${strong}, 수영장 여부 확인필요 +${weak}, 이미 있음 ${dup}`;
      console.log(msg);
      report.push(msg);
    } catch (e) {
      const msg = `공공시설개방정보 수집 실패(건너뜀): ${(e as Error).message}`;
      console.log(msg);
      report.push(msg);
    }
  } else if (!args.has('--skip-public-api')) {
    const msg = '공공시설개방정보: API 키(.env의 EXPO_PUBLIC_POOL_DATA_API_KEY)를 못 찾아 건너뜀';
    console.log(msg);
    report.push(msg);
  }

  if (!args.has('--skip-reverse')) {
    const need = rows.filter((r) => !r.address && r.lat != null).length;
    if (need > 0) {
      console.log(`주소가 없는 후보 ${need}곳의 주소를 찾는 중 (1초에 1곳, 중간에 멈춰도 이어서 해요)…`);
      await fillAddresses(rows);
    }
  }

  // 같은 key가 겹치면(같은 이름+같은 주소) 하나만 남긴다.
  const seenKeys = new Set<string>();
  const finalRows = rows.filter((r) => (seenKeys.has(r.key) ? false : (seenKeys.add(r.key), true)));

  // 이미 전화로 채우는 중인 파일을 덮어쓰지 않게, 실행할 때마다 날짜가 붙은 새 파일로 저장한다.
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const csvName = `pool-vendor-list-${stamp}.csv`;
  fs.writeFileSync(path.join(OUT_DIR, csvName), toCsv(finalRows));
  fs.writeFileSync(path.join(ROOT, 'src', 'data', 'candidatePoolFacilities.ts'), candidateFile(finalRows));

  const count = (f: (r: Row) => boolean) => finalRows.filter(f).length;
  report.push(
    '',
    `전체 ${finalRows.length}곳`,
    `  공공 ${count((r) => r.group === '공공')} / 민간 ${count((r) => r.group === '민간')} / 확인필요 ${count((r) => r.group === '확인필요')}`,
    `  기존 ${count((r) => r.inApp === '기존')} / 이번에 앱에 추가 ${count((r) => r.inApp === '앱추가')} / 미추가 ${count((r) => r.inApp === '미추가')}`,
    `  전화번호 있음 ${count((r) => !!r.phone)} / 없음 ${count((r) => !r.phone)}`
  );
  fs.writeFileSync(path.join(OUT_DIR, 'pool-collect-report.txt'), report.join('\n') + '\n');
  console.log('\n' + report.join('\n'));
  console.log(`\n저장: ${path.join('scripts', 'out', csvName)}`);
}

main().catch((e) => {
  console.error('수집 실패:', e);
  process.exit(1);
});
