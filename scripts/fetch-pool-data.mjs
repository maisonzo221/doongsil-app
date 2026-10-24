#!/usr/bin/env node
// 전국 인허가 수영장(행정안전부_생활_수영장업, data.go.kr 15155038)을 전부 받아서
// 앱에 번들하는 데이터 파일(src/data/licensedPoolFacilities.ts)로 만든다.
//
// 실행: 프로젝트 폴더에서  node scripts/fetch-pool-data.mjs
// 인증키는 .env의 EXPO_PUBLIC_POOL_DATA_API_KEY(앱이 이미 쓰는 그 키)를 그대로 읽는다.
// 키는 화면/파일에 출력하거나 저장하지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import proj4 from 'proj4';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.indexOf('--out');
const OUT = outArg > -1 ? path.resolve(process.argv[outArg + 1]) : path.join(ROOT, 'src/data/licensedPoolFacilities.ts');
const BASE = process.env.POOL_API_BASE || 'https://apis.data.go.kr/1741000/swimming_pools/info';

const PAGE_SIZE = 100; // 앱이 이미 쓰고 있는 검증된 값
const CONCURRENCY = 5;
const MIN_EXPECTED = 30; // 이보다 적게 받으면 뭔가 잘못된 것 — 기존 파일을 덮어쓰지 않는다.

// 앱(poolData.ts)과 같은 좌표계 변환: EPSG:5174(Bessel 중부원점 TM) → WGS84.
const BESSEL_TM =
  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 ' +
  '+ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43';
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';
// 폐업/취소/말소 + 휴업·만료·정지·중지(지금 운영하지 않는 곳)는 뺀다.
const CLOSED = /(폐업|취소|말소|휴업|만료|정지|중지)/;

function loadKey() {
  if (process.env.EXPO_PUBLIC_POOL_DATA_API_KEY) return process.env.EXPO_PUBLIC_POOL_DATA_API_KEY.trim();
  // eas env:pull이 만드는 .env.local과 일반 .env를 차례로 본다.
  for (const name of ['.env.local', '.env']) {
    const envPath = path.join(ROOT, name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*EXPO_PUBLIC_POOL_DATA_API_KEY\s*=\s*(.*)\s*$/);
      if (m) return m[1].replace(/^['"]|['"]$/g, '').trim();
    }
  }
  return '';
}

const KEY = loadKey();
if (!KEY) {
  console.error(
    '❌ 인증키(EXPO_PUBLIC_POOL_DATA_API_KEY)를 찾지 못했어요. 아래 중 하나로 해결할 수 있어요.\n' +
      '  1) npx eas-cli env:pull --environment production  (실행 후 이 스크립트를 다시 실행)\n' +
      "  2) EXPO_PUBLIC_POOL_DATA_API_KEY='발급받은키' node scripts/fetch-pool-data.mjs  (키는 터미널에서만 입력하세요)"
  );
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPage(pageNo) {
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const params = new URLSearchParams({ serviceKey: KEY, pageNo: String(pageNo), numOfRows: String(PAGE_SIZE), returnType: 'json' });
      const res = await fetch(`${BASE}?${params.toString()}`);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 120)}`);
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`JSON이 아닌 응답: ${text.slice(0, 160)}`);
      }
      const body = json?.response?.body;
      if (!body) throw new Error(`예상과 다른 응답: ${JSON.stringify(json).slice(0, 160)}`);
      const items = body.items?.item ?? [];
      return { total: Number(body.totalCount ?? 0), items: (Array.isArray(items) ? items : [items]).filter(Boolean) };
    } catch (e) {
      lastErr = e;
      await sleep(800 * attempt);
    }
  }
  throw new Error(`${pageNo}페이지를 못 받았어요: ${lastErr?.message}`);
}

// 좌표가 비어 있는 인허가 기록이 많다. 그런 수영장을 통째로 버리면 청주·고양처럼 좌표 입력이 안 된
// 지역은 앱에 하나도 안 나온다. 그래서 같은 읍·면·동(예: "충청북도 청주시 흥덕구 가경동")에 좌표가 있는
// 수영장들의 평균 위치로 대신 채우고, 행 끝에 1을 붙여 "근사 좌표"로 표시한다(앱은 이런 곳에 지도 핀을 안 찍고
// 길찾기를 주소로 연다). 같은 동에 좌표 있는 곳이 하나도 없으면 어림짐작하지 않고 건너뛴다.
function dongKey(item) {
  const addr = String(item.LOTNO_ADDR || item.ROAD_NM_ADDR || '').trim();
  const tokens = addr.split(/\s+/);
  const idx = tokens.findIndex((t, i) => i >= 2 && /(동|읍|면|리|가)$/.test(t) && !/(로|길)$/.test(t));
  return idx > 0 ? tokens.slice(0, idx + 1).join(' ') : '';
}
const dongCoords = new Map();
function addDongCoord(item, lat, lng) {
  const k = dongKey(item);
  if (!k) return;
  const a = dongCoords.get(k) || [];
  a.push([lat, lng]);
  dongCoords.set(k, a);
}
function convert(item) {
  const x = Number(item.CRD_INFO_X);
  const y = Number(item.CRD_INFO_Y);
  if (!x || !y) return null;
  try {
    const [lng, lat] = proj4(BESSEL_TM, WGS84, [x, y]);
    return lat > 32.5 && lat < 39.5 && lng > 123.5 && lng < 132.5 ? { lat, lng } : 'bad';
  } catch {
    return 'bad';
  }
}

function toRow(item) {
  if (CLOSED.test(item.SALS_STTS_NM || '')) return { skip: 'closed' };
  let approx = 0;
  let c = convert(item);
  if (c === 'bad') return { skip: 'badcoord' };
  if (!c) {
    const pts = dongCoords.get(dongKey(item));
    if (!pts || pts.length === 0) return { skip: 'nocoord' };
    c = { lat: pts.reduce((a, p) => a + p[0], 0) / pts.length, lng: pts.reduce((a, p) => a + p[1], 0) / pts.length };
    approx = 1;
  }
  const { lat, lng } = c;
  const name = String(item.BPLC_NM || '').trim();
  if (!name || !item.MNG_NO) return { skip: 'noname' };
  const road = String(item.ROAD_NM_ADDR || item.LOTNO_ADDR || '').trim();
  const lot = String(item.LOTNO_ADDR || '').trim();
  return {
    row: [String(item.MNG_NO), name, road, lot && lot !== road ? lot : '', String(item.TELNO || '').trim(), +lat.toFixed(5), +lng.toFixed(5), ...(approx ? [1] : [])],
    approx,
  };
}

(async () => {
  console.log('전국 인허가 수영장 내려받는 중…');
  const first = await getPage(1);
  const pages = Math.ceil(first.total / PAGE_SIZE);
  console.log(`전체 ${first.total.toLocaleString()}건 (${pages}페이지)`);

  const raw = [...first.items];
  let next = 2;
  let done = 1;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next <= pages) {
        const p = next++;
        const r = await getPage(p);
        raw.push(...r.items);
        done++;
        if (done % 10 === 0 || done === pages) process.stdout.write(`\r  ${done}/${pages}페이지`);
      }
    })
  );
  process.stdout.write('\n');

  // ── 왜 이만큼만 남는지 보여주는 진단 (결과가 적을 때 원인을 찾기 위함) ──
  const hasCoord = (i) => Number(i.CRD_INFO_X) && Number(i.CRD_INFO_Y);
  const statusCount = {};
  raw.forEach((i) => {
    const k = i.SALS_STTS_NM || '(없음)';
    statusCount[k] = (statusCount[k] || 0) + 1;
  });
  const openItems = raw.filter((i) => !CLOSED.test(i.SALS_STTS_NM || ''));
  const openNoCoord = openItems.filter((i) => !hasCoord(i));
  console.log('\n[진단]');
  console.log('  영업상태별: ' + Object.entries(statusCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' | '));
  console.log(`  폐업이 아닌 곳 ${openItems.length}건 → 좌표 있음 ${openItems.length - openNoCoord.length} / 좌표 없음 ${openNoCoord.length}`);
  console.log(`  응답에 들어있는 항목 이름: ${Object.keys(raw[0] || {}).join(', ')}`);
  openNoCoord.slice(0, 3).forEach((i) => console.log(`  (좌표 없는 예) ${i.BPLC_NM} / ${i.ROAD_NM_ADDR || i.LOTNO_ADDR}`));
  const goyangAll = openItems.filter((i) => /고양시/.test(`${i.ROAD_NM_ADDR} ${i.LOTNO_ADDR}`));
  console.log(`  고양시: 폐업 아닌 곳 ${goyangAll.length}건 (좌표 있음 ${goyangAll.filter(hasCoord).length})`);

  // 관리번호가 시설마다 고유하지 않다(서로 다른 수영장이 같은 번호를 쓰는 경우가 많다).
  // 그래서 관리번호만으로 중복을 지우면 멀쩡한 수영장이 대량으로 사라진다. 관리번호+이름+주소가
  // 모두 같을 때만 같은 시설의 여러 기록으로 보고, 그중 가장 최근 기록만 남긴다.
  // (예전 '영업' 기록 때문에 이미 폐업한 곳이 되살아나지 않도록, 영업 여부는 최신 기록으로 판단한다.)
  const norm = (v) => String(v || '').replace(/\s+/g, '').toLowerCase();
  const stamp = (i) => String(i.LAST_MDFCN_PNT || i.DAT_UPDT_PNT || '');
  const latest = new Map();
  for (const item of raw) {
    const key = `${item.MNG_NO}|${norm(item.BPLC_NM)}|${norm(item.ROAD_NM_ADDR || item.LOTNO_ADDR)}`;
    const prev = latest.get(key);
    if (!prev || stamp(item) >= stamp(prev)) latest.set(key, item);
  }

  const idGroups = new Map();
  raw.forEach((i) => idGroups.set(String(i.MNG_NO), (idGroups.get(String(i.MNG_NO)) || 0) + 1));
  const sharedIds = [...idGroups.values()].filter((n) => n > 1).length;
  console.log(`  관리번호 ${idGroups.size}종류 / 전체 ${raw.length}행 → 같은 관리번호가 여러 행인 경우 ${sharedIds}종류`);
  console.log(`  관리번호+이름+주소가 같은 기록을 합친 뒤 ${latest.size}곳 (합쳐진 기록 ${raw.length - latest.size}건)`);

  for (const item of latest.values()) {
    if (CLOSED.test(item.SALS_STTS_NM || '')) continue;
    const c = convert(item);
    if (c && c !== 'bad') addDongCoord(item, c.lat, c.lng);
  }
  const skipped = { closed: 0, nocoord: 0, badcoord: 0, noname: 0, dup: raw.length - latest.size };
  let approxCount = 0;
  const built = [];
  for (const item of latest.values()) {
    const r = toRow(item);
    if (r.skip) {
      skipped[r.skip]++;
      continue;
    }
    if (r.approx) approxCount++;
    built.push(r.row);
  }
  const rows = built.sort((a, b) => a[2].localeCompare(b[2], 'ko') || a[1].localeCompare(b[1], 'ko'));
  // 서로 다른 수영장이 같은 관리번호를 쓰면 앱에서 구분이 안 되므로 id 뒤에 번호를 붙인다.
  const idUsed = new Map();
  for (const r of rows) {
    const n = idUsed.get(r[0]) || 0;
    idUsed.set(r[0], n + 1);
    if (n > 0) r[0] = `${r[0]}#${n + 1}`;
  }

  if (rows.length < MIN_EXPECTED) {
    console.error(`❌ 쓸 수 있는 수영장이 ${rows.length}곳뿐이에요(최소 ${MIN_EXPECTED}곳 예상). 기존 파일은 그대로 두었어요.`);
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const body =
    `// 자동 생성 파일 — scripts/fetch-pool-data.mjs로 만든다. 직접 고치지 않는다.\n` +
    `// 출처: 행정안전부_생활_수영장업 (data.go.kr 15155038), 생성일 ${today}\n` +
    `// 영업 중이고 좌표가 있는 인허가 수영장 ${rows.length.toLocaleString()}곳 (전체 ${raw.length.toLocaleString()}건 중).\n` +
    `// 행: [관리번호, 이름, 도로명주소, 지번주소(도로명과 같으면 빈칸), 전화, 위도, 경도, (근사 좌표면 1)]\n` +
    `export type LicensedPoolRow = readonly [\n  id: string,\n  name: string,\n  roadAddress: string,\n  lotAddress: string,\n  phone: string,\n  lat: number,\n  lng: number,\n  approx?: number,\n];\n\n` +
    `export const LICENSED_POOLS_UPDATED = '${today}';\n\n` +
    `export const LICENSED_POOL_FACILITIES: readonly LicensedPoolRow[] = [\n` +
    rows.map((r) => `  ${JSON.stringify(r)},`).join('\n') +
    `\n];\n`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const tmp = `${OUT}.tmp`;
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, OUT);

  const sido = {};
  for (const r of rows) {
    const k = r[2].split(/\s+/)[0] || '(주소없음)';
    sido[k] = (sido[k] || 0) + 1;
  }
  console.log(`\n✅ ${rows.length.toLocaleString()}곳 저장 → ${path.relative(ROOT, OUT)} (${(Buffer.byteLength(body) / 1024).toFixed(0)}KB)`);
  console.log(`   그중 좌표가 없어 같은 동 평균 위치로 채운 곳(근사): ${approxCount}곳`);
  console.log(`   제외: 폐업/취소 ${skipped.closed} · 좌표 없음 ${skipped.nocoord} · 좌표 이상 ${skipped.badcoord} · 이름 없음 ${skipped.noname} · 중복 ${skipped.dup}`);
  console.log('   시/도별: ' + Object.entries(sido).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' | '));
  const goyang = rows.filter((r) => /고양시/.test(r[2])).length;
  console.log(`   (확인) 고양시: ${goyang}곳`);
})().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
