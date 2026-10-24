import { Platform } from 'react-native';
import AsyncStorage from 'expo-sqlite/kv-store';
import {
  requestAuthorization,
  queryWorkoutSamples,
  queryStatisticsForQuantity,
  isHealthDataAvailableAsync,
  WorkoutActivityType,
  type ObjectTypeIdentifier,
  type Quantity,
} from '@kingstinct/react-native-healthkit';
import { Stroke } from '../types';
import { computePaceSecPer100m, estimateSwolf } from '../utils/pace';
import { addRecord, getAllRecords, updateRecord } from '../storage/records';

export interface HealthImportResult {
  distanceMeters: number;
  durationMinutes: number;
  calories: number;
  avgHeartRate: number;
  avgPaceSecPer100m?: number;
  swolf?: number;
  strokeCount?: number;
  strokes: Stroke[];
}

export interface TodayActivitySummary {
  activeCalories: number;
  swimMeters: number;
}

const READ_TYPES: ObjectTypeIdentifier[] = [
  'HKWorkoutTypeIdentifier',
  'HKQuantityTypeIdentifierDistanceSwimming',
  'HKQuantityTypeIdentifierSwimmingStrokeCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
  'HKQuantityTypeIdentifierHeartRate',
];

export async function isHealthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return isHealthDataAvailableAsync();
}

export async function requestHealthAuthorization(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return requestAuthorization({ toRead: READ_TYPES });
}

function metersFromDistance(q?: Quantity): number | undefined {
  if (!q) return undefined;
  switch (q.unit.toLowerCase()) {
    case 'km':
      return q.quantity * 1000;
    case 'mi':
      return q.quantity * 1609.344;
    case 'yd':
      return q.quantity * 0.9144;
    default:
      return q.quantity; // 'm'
  }
}

function minutesFromDuration(q?: Quantity): number | undefined {
  if (!q) return undefined;
  switch (q.unit.toLowerCase()) {
    case 'min':
      return Math.round(q.quantity);
    case 'hr':
    case 'h':
      return Math.round(q.quantity * 60);
    default:
      return Math.round(q.quantity / 60); // 's'
  }
}

// 애플워치 수영 운동은 구간(랩)마다 영법(자유형/배영/평영/접영)이 같이 기록된다. 그걸 읽어서 둥실의 영법 값으로 바꾼다.
// 영법 정보가 없는 운동(예: 수동으로 넣은 기록)은 지금까지처럼 자유형으로 둔다.
const STROKE_FROM_STYLE: Record<number, Stroke> = { 2: 'freestyle', 3: 'backstroke', 4: 'breaststroke', 5: 'butterfly' };

function strokesOf(workouts: readonly any[]): Stroke[] {
  const found = new Set<Stroke>();
  for (const w of workouts) {
    try {
      for (const ev of w.events ?? []) {
        const raw = ev?.metadata?.HKSwimmingStrokeStyle;
        const style = typeof raw === 'number' ? raw : Number(raw);
        const stroke = STROKE_FROM_STYLE[style];
        if (stroke) found.add(stroke);
      }
    } catch {
      // 이 운동에선 영법을 못 읽어도 다른 값은 그대로 쓴다.
    }
  }
  return found.size > 0 ? Array.from(found) : ['freestyle'];
}

/** 같은 날의 수영 운동들을 하루치 기록 하나로 합친다. (하루에 두 번 수영해도 거리가 빠지지 않게) */
async function summarizeWorkouts(workouts: readonly any[]): Promise<HealthImportResult> {
  let distance = 0;
  let minutes = 0;
  let calories = 0;
  let strokeCount = 0;
  let hrSum = 0;
  let hrN = 0;
  for (const workout of workouts) {
    distance += metersFromDistance(workout.totalDistance) ?? 0;
    minutes += minutesFromDuration(workout.duration) ?? 0;
    calories += workout.totalEnergyBurned?.quantity ?? 0;
    try {
      const stats = await queryStatisticsForQuantity('HKQuantityTypeIdentifierHeartRate', ['discreteAverage'], {
        filter: { workout },
        unit: 'count/min',
      });
      if (stats.averageQuantity) {
        hrSum += stats.averageQuantity.quantity;
        hrN++;
      }
    } catch {
      // 심박수를 못 읽어도 기록은 만든다.
    }
    try {
      const stats = await queryStatisticsForQuantity('HKQuantityTypeIdentifierSwimmingStrokeCount', ['cumulativeSum'], {
        filter: { workout },
        unit: 'count',
      });
      if (stats.sumQuantity) strokeCount += stats.sumQuantity.quantity;
    } catch {
      // 스트로크 수를 못 읽어도 기록은 만든다.
    }
  }
  const distanceMeters = Math.round(distance);
  const durationMinutes = Math.round(minutes);
  const strokes = Math.round(strokeCount);
  return {
    distanceMeters,
    durationMinutes,
    calories: Math.round(calories),
    avgHeartRate: hrN > 0 ? Math.round(hrSum / hrN) : 0,
    avgPaceSecPer100m: computePaceSecPer100m(distanceMeters, durationMinutes),
    swolf: estimateSwolf(distanceMeters, durationMinutes, strokes),
    strokeCount: strokes || undefined,
    strokes: strokesOf(workouts),
  };
}

/** 그날 애플 피트니스에 기록된 수영 운동(하루에 여러 번이면 합쳐서)을 불러온다. 없으면 null. */
export async function getTodaySwimWorkout(dateString: string): Promise<HealthImportResult | null> {
  if (Platform.OS !== 'ios') return null;

  const available = await isHealthAvailable();
  if (!available) return null;

  const granted = await requestHealthAuthorization();
  if (!granted) return null;

  const [y, m, d] = dateString.split('-').map(Number);
  const startDate = new Date(y, m - 1, d, 0, 0, 0);
  const endDate = new Date(y, m - 1, d, 23, 59, 59);

  const workouts = await queryWorkoutSamples({
    filter: { workoutActivityType: WorkoutActivityType.swimming, date: { startDate, endDate } },
    limit: 0,
    ascending: true,
  });
  if (workouts.length === 0) return null;
  return summarizeWorkouts(workouts);
}

function dateToLocalString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const LAST_SYNC_KEY = '@doongsil/health/lastSwimSync';
// 워치가 늦게 동기화되거나 같은 날 운동이 더 추가될 수 있어서, 다시 훑을 때 며칠 전부터 본다.
const RESCAN_DAYS = 3;

/** 애플워치(건강 앱)의 수영 운동을 둥실 기록으로 가져온다. 캘린더를 열 때마다 불러서,
 * 워치로 방금 한 수영도 기록·미션(횟수·누적 거리·영법)에 바로 반영된다.
 *  · 처음에는 지금까지의 수영 운동 전체를, 그다음부터는 마지막으로 확인한 날의 며칠 전부터 훑는다.
 *  · 그날 직접 쓴 기록이 이미 있으면 그대로 두고(덮어쓰지 않음), 건강 앱에서 가져온 기록은 새 값으로 갱신한다.
 * 건강 데이터를 쓸 수 없는 환경(Android·권한 없음)이면 아무것도 하지 않는다. */
export async function syncHealthSwims(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const available = await isHealthAvailable();
  if (!available) return;
  const granted = await requestHealthAuthorization();
  if (!granted) return;

  const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
  const from = lastSync ? new Date(new Date(lastSync).getTime() - RESCAN_DAYS * 24 * 60 * 60 * 1000) : null;
  const workouts = await queryWorkoutSamples({
    filter: from
      ? { workoutActivityType: WorkoutActivityType.swimming, date: { startDate: from } }
      : { workoutActivityType: WorkoutActivityType.swimming },
    limit: 0,
    ascending: true,
  });

  if (workouts.length > 0) {
    const byDate = new Map<string, any[]>();
    for (const w of workouts) {
      const key = dateToLocalString(w.startDate);
      byDate.set(key, [...(byDate.get(key) ?? []), w]);
    }
    const existing = new Map((await getAllRecords()).map((r) => [r.date, r]));
    for (const [dateString, dayWorkouts] of byDate) {
      const prev = existing.get(dateString);
      if (prev && prev.source !== 'health') continue; // 직접 쓴 기록은 건드리지 않는다
      const summary = await summarizeWorkouts(dayWorkouts);
      const fields = {
        sport: 'swim' as const,
        date: dateString,
        mood: prev?.mood ?? ('good' as const),
        strokes: summary.strokes,
        distanceMeters: summary.distanceMeters,
        durationMinutes: summary.durationMinutes,
        calories: summary.calories,
        avgHeartRate: summary.avgHeartRate,
        avgPaceSecPer100m: summary.avgPaceSecPer100m,
        swolf: summary.swolf,
        strokeCount: summary.strokeCount,
        memo: prev?.memo,
        source: 'health' as const,
      };
      if (prev) await updateRecord(prev.id, fields);
      else await addRecord(fields);
    }
  }
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

async function fetchDayActivity(dateString: string): Promise<TodayActivitySummary> {
  const [y, m, d] = dateString.split('-').map(Number);
  const startDate = new Date(y, m - 1, d, 0, 0, 0);
  const endDate = new Date(y, m - 1, d, 23, 59, 59);

  let activeCalories = 0;
  try {
    const stats = await queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      ['cumulativeSum'],
      { filter: { date: { startDate, endDate } }, unit: 'kcal' }
    );
    activeCalories = stats.sumQuantity ? Math.round(stats.sumQuantity.quantity) : 0;
  } catch {
    activeCalories = 0;
  }

  let swimMeters = 0;
  try {
    const stats = await queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierDistanceSwimming',
      ['cumulativeSum'],
      { filter: { date: { startDate, endDate } }, unit: 'm' }
    );
    swimMeters = stats.sumQuantity ? Math.round(stats.sumQuantity.quantity) : 0;
  } catch {
    swimMeters = 0;
  }

  return { activeCalories, swimMeters };
}

/** 오늘 하루 총 활동 칼로리와 수영 거리 — 캘린더 상단 링용. */
export async function getTodayActivitySummary(
  dateString: string
): Promise<TodayActivitySummary | null> {
  if (Platform.OS !== 'ios') return null;
  const available = await isHealthAvailable();
  if (!available) return null;
  const granted = await requestHealthAuthorization();
  if (!granted) return null;
  return fetchDayActivity(dateString);
}

/** 한 달치 하루 단위 활동 요약 — 캘린더 날짜 칸마다 미니 링을 그리는 데 쓴다. */
export async function getMonthActivitySummaries(
  yearMonth: string
): Promise<Record<string, TodayActivitySummary>> {
  if (Platform.OS !== 'ios') return {};
  const available = await isHealthAvailable();
  if (!available) return {};
  const granted = await requestHealthAuthorization();
  if (!granted) return {};

  const [y, m] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m;
  const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;
  if (lastDay < 1) return {};

  const dates = Array.from({ length: lastDay }, (_, i) => `${yearMonth}-${String(i + 1).padStart(2, '0')}`);
  const results = await Promise.all(
    dates.map(async (dateString) => [dateString, await fetchDayActivity(dateString)] as const)
  );
  return Object.fromEntries(results);
}
