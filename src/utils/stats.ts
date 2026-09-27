import { SwimRecord } from '../types';

export type StatPeriod = 'week' | 'month' | 'year';

export const PERIOD_LABEL: Record<StatPeriod, string> = {
  week: '주간',
  month: '월간',
  year: '연간',
};

function periodStart(period: StatPeriod, anchor: Date): Date {
  const d = new Date(anchor);
  if (period === 'week') {
    const day = (d.getDay() + 6) % 7; // 0 = 월요일
    d.setDate(d.getDate() - day);
  } else if (period === 'month') {
    d.setDate(1);
  } else {
    d.setMonth(0, 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

export function recordsInPeriod(
  records: SwimRecord[],
  period: StatPeriod,
  anchor: Date = new Date()
): SwimRecord[] {
  const start = periodStart(period, anchor);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = anchor.toISOString().slice(0, 10);
  return records.filter((r) => r.date >= startStr && r.date <= endStr);
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function totalDistanceMeters(records: SwimRecord[]): number {
  return records.reduce((sum, r) => sum + (r.distanceMeters ?? 0), 0);
}

export function avgSwolf(records: SwimRecord[]): number | undefined {
  const values = records.map((r) => r.swolf).filter((v): v is number => v != null);
  return average(values);
}

export function avgStrokeCount(records: SwimRecord[]): number | undefined {
  const values = records.map((r) => r.strokeCount).filter((v): v is number => v != null);
  return average(values);
}

export function avgPaceSecPer100m(records: SwimRecord[]): number | undefined {
  const values = records.map((r) => r.avgPaceSecPer100m).filter((v): v is number => v != null);
  return average(values);
}

export function avgCalories(records: SwimRecord[]): number | undefined {
  const values = records.map((r) => r.calories).filter((v): v is number => v != null);
  return average(values);
}
