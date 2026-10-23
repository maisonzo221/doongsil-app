// 내 둥실곰: 가진 아이템, 입고 있는 아이템, 미션 진행 상황. 기기에 저장한다.
import { useEffect, useState } from 'react';
import AsyncStorage from 'expo-sqlite/kv-store';
import { ItemId, ITEMS, MedalId } from '../data/missions';
import { applyMissionComplete, BearState, CompleteResult, currentTier, Equipped } from '../utils/missionLogic';

export type { BearState, CompleteResult, Equipped } from '../utils/missionLogic';
export { currentTier, levelOf } from '../utils/missionLogic';

const KEY = '@doongsil/bear';

const EMPTY: BearState = {
  owned: [],
  equipped: { suit: null, goggles: false, cap: false, medal: null },
  done: {},
  introSeen: false,
};

/** 예전 버전의 저장값(메달이 하나뿐이던 때)을 지금 형식으로 바꾼다. */
function migrate(state: BearState): BearState {
  const owned = state.owned.map((id) => ((id as string) === 'medal' ? 'medal1' : id)) as BearState['owned'];
  const m = state.equipped.medal as unknown;
  const medal = m === true || m === 'medal' ? 'medal1' : typeof m === 'string' && m.startsWith('medal') ? (m as MedalId) : null;
  return { ...state, owned, equipped: { ...state.equipped, medal } };
}

let cache: BearState | null = null;
const listeners = new Set<(s: BearState) => void>();

export async function getBearState(): Promise<BearState> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cache = parsed && typeof parsed === 'object' ? migrate({ ...EMPTY, ...parsed, equipped: { ...EMPTY.equipped, ...parsed.equipped } }) : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache as BearState;
}

async function save(next: BearState): Promise<void> {
  cache = next;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장에 실패해도 이번 실행 동안은 메모리 값으로 동작한다.
  }
  listeners.forEach((cb) => cb(next));
}

export function useBearState(): BearState {
  const [state, setState] = useState<BearState>(cache ?? EMPTY);
  useEffect(() => {
    let alive = true;
    getBearState().then((s) => alive && setState(s));
    listeners.add(setState);
    return () => {
      alive = false;
      listeners.delete(setState);
    };
  }, []);
  return state;
}

export async function completeMission(missionId: string): Promise<CompleteResult | null> {
  const state = await getBearState();
  const result = applyMissionComplete(state, missionId);
  if (result) await save(result.state);
  return result;
}

/** 기록(첫 수영)처럼 앱이 스스로 확인할 수 있는 미션을, 순서가 되었으면 자동으로 완료한다. */
export async function syncAutoMissions(recordCount: number): Promise<CompleteResult | null> {
  const state = await getBearState();
  const cur = currentTier(state);
  if (!cur) return null;
  const next = cur.tier.missions[cur.nextIndex];
  if (next.kind === 'auto-first-swim' && recordCount > 0) return completeMission(next.id);
  return null;
}

export async function setEquipped(patch: Partial<Equipped>): Promise<void> {
  const state = await getBearState();
  const equipped = { ...state.equipped, ...patch };
  // 가지고 있지 않은 아이템은 입을 수 없다.
  if (equipped.suit && !state.owned.includes(equipped.suit)) equipped.suit = null;
  if (equipped.goggles && !state.owned.includes('goggles')) equipped.goggles = false;
  if (equipped.cap && !state.owned.includes('cap')) equipped.cap = false;
  if (equipped.medal && !state.owned.includes(equipped.medal)) equipped.medal = null;
  await save({ ...state, equipped });
}

export async function markIntroSeen(): Promise<void> {
  const state = await getBearState();
  if (!state.introSeen) await save({ ...state, introSeen: true });
}

export function itemName(id: ItemId): string {
  return ITEMS[id].name;
}
