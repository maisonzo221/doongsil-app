import { SwimRecord } from '../types';
import { addDays, todayString } from './date';

export type TrendMetric = 'distance' | 'duration';

export const TREND_METRIC_LABEL: Record<TrendMetric, string> = {
  distance: '거리',
  duration: '시간',
};

export interface DayPoint {
  date: string; // YYYY-MM-DD
  /** 그날 기록의 합 (거리는 m, 시간은 분). 수영하지 않은 날은 0. */
  value: number;
  /** 그날 남긴 기록 수. 거리·시간을 안 적은 기록도 수영한 날로 센다. */
  count: number;
}

/** endDate(기본 오늘)까지 최근 days일을 하루씩 나열한다. 기록이 없는 날도 value 0으로 들어간다. */
export function buildDailySeries(
  records: SwimRecord[],
  days: number,
  metric: TrendMetric,
  endDate: string = todayString()
): DayPoint[] {
  const byDate = new Map<string, DayPoint>();
  for (const r of records) {
    const add = metric === 'distance' ? r.distanceMeters ?? 0 : r.durationMinutes ?? 0;
    const p = byDate.get(r.date) ?? { date: r.date, value: 0, count: 0 };
    p.value += add;
    p.count += 1;
    byDate.set(r.date, p);
  }
  const series: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i);
    series.push(byDate.get(date) ?? { date, value: 0, count: 0 });
  }
  return series;
}

/** 이동 평균(해당 날을 포함한 앞쪽 window일, 쉬는 날은 0으로 계산). 처음 며칠은 있는 만큼만으로 계산한다. */
export function movingAverage(points: DayPoint[], window = 7): number[] {
  return points.map((_, i) => {
    const from = Math.max(0, i - window + 1);
    const slice = points.slice(from, i + 1);
    return slice.reduce((s, p) => s + p.value, 0) / slice.length;
  });
}

export interface TrendSummary {
  /** 수영한 날 수 */
  swimDays: number;
  total: number;
  /** 수영한 날 하루 평균. 수영한 날이 없으면 0 */
  avgPerSwimDay: number;
}

export function summarizeSeries(points: DayPoint[]): TrendSummary {
  const swum = points.filter((p) => p.count > 0);
  const total = points.reduce((s, p) => s + p.value, 0);
  return { swimDays: swum.length, total, avgPerSwimDay: swum.length > 0 ? total / swum.length : 0 };
}

export function formatTrendValue(value: number, metric: TrendMetric): string {
  const v = Math.round(value);
  if (metric === 'distance') return v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}km` : `${v}m`;
  if (v >= 60) {
    const h = Math.floor(v / 60);
    const m = v % 60;
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
  }
  return `${v}분`;
}

/** 세로축 맨 위 값을 보기 좋은 숫자(1·2·3·4·5·6·8·10 × 10^n)로 올린다. 가운데 눈금도 깔끔하게 떨어진다. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const m = [1, 2, 3, 4, 5, 6, 8, 10].find((step) => n <= step) ?? 10;
  return m * p;
}
