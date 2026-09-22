import { SwimRecord } from '../types';
import { addDays, todayString } from './date';

export function computeStreak(records: SwimRecord[]): number {
  const dates = new Set(records.map((r) => r.date));
  if (dates.size === 0) return 0;

  let cursor = todayString();
  if (!dates.has(cursor)) {
    const yesterday = addDays(cursor, -1);
    if (!dates.has(yesterday)) return 0;
    cursor = yesterday;
  }

  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
