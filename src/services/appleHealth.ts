import { Platform } from 'react-native';
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

/** 오늘 하루 총 활동 칼로리와 수영 거리 — 캘린더 상단 링용. */
export async function getTodayActivitySummary(
  dateString: string
): Promise<TodayActivitySummary | null> {
  if (Platform.OS !== 'ios') return null;

  const available = await isHealthAvailable();
  if (!available) return null;

  const granted = await requestHealthAuthorization();
  if (!granted) return null;

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
