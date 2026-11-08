// 매달 자동으로 갱신되는 전국 인허가 수영장 목록.
//
// 흐름: GitHub Action(.github/workflows/update-pools.yml)이 매달 docs/data/pools.json 을 새로 만들어 올리면,
// 앱은 실행할 때(하루에 한 번까지만) 작은 pools-meta.json 으로 새 버전이 있는지 보고, 있을 때만 큰 파일을 받아
// 기기에 저장한다. 앱에 내장된 목록(src/data/licensedPoolFacilities.ts)은 그대로 있어서 인터넷이 안 되거나
// 받은 파일이 이상하면 내장 목록으로 돌아간다. 새 데이터가 앱 업데이트 없이 반영되는 이유다.
import Storage from 'expo-sqlite/kv-store';
import { POOL_DATA_META_URL, POOL_DATA_URL } from '../config/links';
import { LICENSED_POOL_FACILITIES, LICENSED_POOLS_UPDATED, LicensedPoolRow } from '../data/licensedPoolFacilities';

const DATA_KEY = '@doongsil/remotePools';
const CHECKED_KEY = '@doongsil/remotePoolsChecked';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** 이보다 적게 들어 있는 파일은 잘못 만들어진 것으로 보고 쓰지 않는다. (실제 전국 데이터는 수천 곳이다) */
export const MIN_REMOTE_ROWS = 300;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface PoolSnapshot {
  updated: string;
  rows: LicensedPoolRow[];
}

let remote: PoolSnapshot | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function isRow(r: unknown): r is LicensedPoolRow {
  if (!Array.isArray(r) || (r.length !== 7 && r.length !== 8)) return false;
  const [id, name, road, lot, phone, lat, lng, approx] = r;
  return (
    typeof id === 'string' &&
    id !== '' &&
    typeof name === 'string' &&
    name !== '' &&
    typeof road === 'string' &&
    typeof lot === 'string' &&
    typeof phone === 'string' &&
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat > 32.5 &&
    lat < 39.5 &&
    lng > 123.5 &&
    lng < 132.5 &&
    (approx === undefined || approx === 1)
  );
}

/** 받은 JSON이 쓸 만한지 검사한다. 이상하면 null — 그때는 아무것도 바꾸지 않는다. */
export function parseSnapshot(raw: unknown, minRows: number = MIN_REMOTE_ROWS): PoolSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { version?: unknown; updated?: unknown; rows?: unknown };
  if (obj.version !== 1 || typeof obj.updated !== 'string' || !DATE_RE.test(obj.updated)) return null;
  if (!Array.isArray(obj.rows)) return null;
  const rows = obj.rows.filter(isRow);
  if (rows.length < minRows || rows.length < obj.rows.length * 0.9) return null;
  return { updated: obj.updated, rows };
}

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  try {
    const text = Storage.getItemSync(DATA_KEY);
    if (text) remote = parseSnapshot(JSON.parse(text));
  } catch {
    remote = null;
  }
}

/** 지금 앱이 쓸 인허가 수영장 목록: 기기에 받아 둔 새 목록이 내장 목록보다 최신이면 그것, 아니면 내장 목록. */
export function getLicensedRows(): readonly LicensedPoolRow[] {
  ensureLoaded();
  return remote && remote.updated > LICENSED_POOLS_UPDATED ? remote.rows : LICENSED_POOL_FACILITIES;
}

/** 지금 쓰는 목록의 기준 날짜(YYYY-MM-DD). 내장 목록이 비어 있으면 빈 문자열. */
export function getLicensedUpdated(): string {
  ensureLoaded();
  return remote && remote.updated > LICENSED_POOLS_UPDATED ? remote.updated : LICENSED_POOLS_UPDATED;
}

/** 새 목록이 적용될 때 불린다(검색 캐시를 비우는 데 쓴다). */
export function onLicensedPoolsChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export type RefreshResult = 'updated' | 'unchanged' | 'skipped' | 'failed';

/** 앱을 열 때 불러 둔다. 하루에 한 번만 확인하고, 실패해도 앱에는 아무 영향이 없다. */
export async function refreshRemotePools(): Promise<RefreshResult> {
  try {
    ensureLoaded();
    const last = Number(Storage.getItemSync(CHECKED_KEY) ?? 0);
    if (Date.now() - last < CHECK_INTERVAL_MS) return 'skipped';

    const meta = (await getJson(POOL_DATA_META_URL, 8000)) as { updated?: unknown } | null;
    // 확인에 성공했을 때만 오늘 확인한 것으로 기록한다(인터넷이 안 되면 다음 실행 때 다시 시도).
    Storage.setItemSync(CHECKED_KEY, String(Date.now()));
    const metaUpdated = typeof meta?.updated === 'string' ? meta.updated : '';
    if (!DATE_RE.test(metaUpdated) || metaUpdated <= getLicensedUpdated()) return 'unchanged';

    const next = parseSnapshot(await getJson(POOL_DATA_URL, 30000));
    if (!next) return 'failed';
    // 지금 쓰는 목록보다 절반 넘게 줄었으면 이상한 데이터로 보고 버린다.
    const inUse = getLicensedRows().length;
    if (inUse >= MIN_REMOTE_ROWS && next.rows.length < inUse * 0.5) return 'failed';

    // 읽을 때 같은 검사(parseSnapshot)를 거치므로 version을 붙여서 저장한다.
    Storage.setItemSync(DATA_KEY, JSON.stringify({ version: 1, ...next }));
    remote = next;
    listeners.forEach((cb) => cb());
    return 'updated';
  } catch {
    return 'failed';
  }
}
