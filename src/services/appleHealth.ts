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
import { addRecord, getAllRecords } from '../storage/records';

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

/** 오늘 애플 피트니스에 기록된 수영 운동을 불러온다. 없으면 null. */
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
    filter: {
      workoutActivityType: WorkoutActivityType.swimming,
      date: { startDate, endDate },
    },
    limit: 1,
    ascending: false,
  });

  const workout = workouts[0];
  if (!workout) return null;

  let avgHeartRate = 0;
  try {
    const stats = await queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierHeartRate',
      ['discreteAverage'],
      { filter: { workout }, unit: 'count/min' }
    );
    avgHeartRate = stats.averageQuantity ? Math.round(stats.averageQuantity.quantity) : 0;
  } catch {
    avgHeartRate = 0;
  }

  let strokeCount = 0;
  try {
    const stats = await queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierSwimmingStrokeCount',
      ['cumulativeSum'],
      { filter: { workout }, unit: 'count' }
    );
    strokeCount = stats.sumQuantity ? Math.round(stats.sumQuantity.quantity) : 0;
  } catch {
    strokeCount = 0;
  }

  const distanceMeters = Math.round(metersFromDistance(workout.totalDistance) ?? 0);
  const durationMinutes = minutesFromDuration(workout.duration) ?? 0;

  return {
    distanceMeters,
    durationMinutes,
    calories: Math.round(workout.totalEnergyBurned?.quantity ?? 0),
    avgHeartRate,
    avgPaceSecPer100m: computePaceSecPer100m(distanceMeters, durationMinutes),
    swolf: estimateSwolf(distanceMeters, durationMinutes, strokeCount),
    strokeCount: strokeCount || undefined,
    strokes: ['freestyle'],
  };
}

function dateToLocalString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const HISTORY_IMPORTED_KEY = '@doongsil/health/historyImported';

/** 건강 데이터 권한을 처음 허용했을 때 딱 한 번, 애플 건강에 있는 과거 수영 운동 기록을
 * 전부 훑어서 아직 둥실에 없는 날짜만 자동으로 기록을 만들어준다. 이미 한 번 돌았으면
 * (권한을 거부했을 때도) AsyncStorage 플래그를 보고 바로 빠져나가서, 앱을 열 때마다
 * 다시 스캔하지 않는다. */
export async function importHealthHistoryOnce(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const already = await AsyncStorage.getItem(HISTORY_IMPORTED_KEY);
  if (already) return;

  try {
    const available = await isHealthAvailable();
    if (!available) return;
    const granted = await requestHealthAuthorization();
    if (!granted) return;

    const workouts = await queryWorkoutSamples({
      filter: { workoutActivityType: WorkoutActivityType.swimming },
      limit: 0,
      ascending: true,
    });
    if (workouts.length === 0) return;

    const dates = Array.from(new Set(workouts.map((w) => dateToLocalString(w.startDate))));
    const existingDates = new Set((await getAllRecords()).map((r) => r.date));

    for (const dateString of dates) {
      if (existingDates.has(dateString)) continue;
      const imported = await getTodaySwimWorkout(dateString);
      if (!imported) continue;
      await addRecord({
        sport: 'swim',
        date: dateString,
        mood: 'good',
        strokes: imported.strokes,
        distanceMeters: imported.distanceMeters,
        durationMinutes: imported.durationMinutes,
        calories: imported.calories,
        avgHeartRate: imported.avgHeartRate,
        avgPaceSecPer100m: imported.avgPaceSecPer100m,
        swolf: imported.swolf,
        strokeCount: imported.strokeCount,
        source: 'health',
      });
    }
  } finally {
    await AsyncStorage.setItem(HISTORY_IMPORTED_KEY, '1');
  }
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
