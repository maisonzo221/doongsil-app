// 내 둥실곰: 가진 아이템, 입고 있는 아이템, 미션 진행 상황. 기기에 저장한다.
import { useEffect, useState } from 'react';
import AsyncStorage from 'expo-sqlite/kv-store';
import { ItemId, ITEMS } from '../data/missions';
import { applyMissionComplete, BearState, CompleteResult, currentTier, Equipped } from '../utils/missionLogic';

export type { BearState, CompleteResult, Equipped } from '../utils/missionLogic';
export { currentTier, levelOf } from '../utils/missionLogic';

const KEY = '@doongsil/bear';

const EMPTY: BearState = {
  owned: [],
  equipped: { suit: null, goggles: false, cap: false, medal: false },
  done: {},
  introSeen: false,
};

let cache: BearState | null = null;
const listeners = new Set<(s: BearState) => void>();

export async function getBearState(): Promise<BearState> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    cache = parsed && typeof parsed === 'object' ? { ...EMPTY, ...parsed, equipped: { ...EMPTY.equipped, ...parsed.equipped } } : EMPTY;
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
  let equipped = { ...state.equipped, ...patch };
  // 아이템 그림은 한 가지씩만 입은 보드 그림이라, 새로 입히면 입고 있던 것은 벗는다.
  const turnedOn = patch.suit ? 'suit' : patch.goggles ? 'goggles' : patch.cap ? 'cap' : patch.medal ? 'medal' : null;
  if (turnedOn) {
    equipped = {
      suit: turnedOn === 'suit' ? equipped.suit : null,
      goggles: turnedOn === 'goggles',
      cap: turnedOn === 'cap',
      medal: turnedOn === 'medal',
    };
  }
  // 가지고 있지 않은 아이템은 입을 수 없다.
  if (equipped.suit && !state.owned.includes(equipped.suit)) equipped.suit = null;
  if (equipped.goggles && !state.owned.includes('goggles')) equipped.goggles = false;
  if (equipped.cap && !state.owned.includes('cap')) equipped.cap = false;
  if (equipped.medal && !state.owned.includes('medal')) equipped.medal = false;
  await save({ ...state, equipped });
}

export async function markIntroSeen(): Promise<void> {
  const state = await getBearState();
  if (!state.introSeen) await save({ ...state, introSeen: true });
}

export function itemName(id: ItemId): string {
  return ITEMS[id].name;
}
