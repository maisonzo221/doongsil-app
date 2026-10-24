// 미션 진행 계산 — 저장소/React와 분리한 순수 로직(단독으로 테스트할 수 있다).
import { AutoRule, ItemId, MedalId, MissionDef, SuitId, TIERS, TierDef } from '../data/missions';

export interface Equipped {
  suit: SuitId | null;
  goggles: boolean;
  cap: boolean;
  medal: MedalId | null;
}

export interface BearState {
  owned: ItemId[];
  equipped: Equipped;
  /** 미션 id → 완료한 시각 */
  done: Record<string, string>;
  /** 처음 안내를 이미 보여줬는지 */
  introSeen: boolean;
}

export interface TierProgress {
  tier: TierDef;
  /** 지금 도장을 찍을 수 있는 미션의 순번(0부터). 다 끝났으면 missions.length */
  nextIndex: number;
  complete: boolean;
}

/** 지금 진행 중인 티어(앞 티어를 다 끝내야 다음 티어). 모든 티어를 끝냈으면 null. */
export function currentTier(state: BearState): TierProgress | null {
  for (const tier of TIERS) {
    const nextIndex = tier.missions.findIndex((m) => !state.done[m.id]);
    if (nextIndex !== -1) return { tier, nextIndex, complete: false };
  }
  return null;
}

/** 지금까지 끝낸 티어 수 + 1 = 레벨 */
export function levelOf(state: BearState): number {
  let level = 1;
  for (const tier of TIERS) {
    if (tier.missions.every((m) => state.done[m.id])) level++;
    else break;
  }
  return level;
}

export interface CompleteResult {
  state: BearState;
  mission: MissionDef;
  /** 새로 받은 아이템 (미션 보상 + 티어 완료 보상) */
  gained: ItemId[];
  tierCompleted: TierDef | null;
}

/** 다음 순서의 미션만 완료할 수 있다. 순서가 아니면 null. (순수 함수) */
export function applyMissionComplete(state: BearState, missionId: string, now = new Date()): CompleteResult | null {
  const cur = currentTier(state);
  if (!cur) return null;
  const mission = cur.tier.missions[cur.nextIndex];
  if (mission.id !== missionId) return null;

  const gained: ItemId[] = [];
  const grant = (ids: ItemId[]) => ids.forEach((id) => !state.owned.includes(id) && !gained.includes(id) && gained.push(id));
  grant(mission.reward);
  const done = { ...state.done, [mission.id]: now.toISOString() };
  const tierCompleted = cur.tier.missions.every((m) => done[m.id]) ? cur.tier : null;
  if (tierCompleted) grant(tierCompleted.reward);

  return {
    state: { ...state, done, owned: [...state.owned, ...gained] },
    mission,
    gained,
    tierCompleted,
  };
}


/** 수영 기록에서 뽑은, 자동 미션이 보는 값들. */
export interface SwimStats {
  count: number;
  totalMeters: number;
  maxMeters: number;
  strokes: number;
}

export const EMPTY_STATS: SwimStats = { count: 0, totalMeters: 0, maxMeters: 0, strokes: 0 };

export function swimStatsFrom(records: { distanceMeters?: number; strokes?: string[] }[]): SwimStats {
  const kinds = new Set<string>();
  let totalMeters = 0;
  let maxMeters = 0;
  for (const r of records) {
    const m = r.distanceMeters ?? 0;
    totalMeters += m;
    if (m > maxMeters) maxMeters = m;
    (r.strokes ?? []).forEach((s) => kinds.add(s));
  }
  return { count: records.length, totalMeters, maxMeters, strokes: kinds.size };
}

export function autoValue(rule: AutoRule, stats: SwimStats): number {
  return rule.metric === 'count' ? stats.count : rule.metric === 'totalMeters' ? stats.totalMeters : rule.metric === 'maxMeters' ? stats.maxMeters : stats.strokes;
}

/** 이 미션이 기록만으로 이미 달성됐는지. 눌러서 하는 미션은 항상 false. */
export function isAutoSatisfied(mission: MissionDef, stats: SwimStats): boolean {
  if (mission.kind === 'auto-first-swim') return stats.count > 0;
  if (mission.kind === 'auto-stats' && mission.auto) return autoValue(mission.auto, stats) >= mission.auto.target;
  return false;
}
