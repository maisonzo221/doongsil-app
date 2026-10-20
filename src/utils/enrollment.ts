// 신규회원 모집 알림 계산 — 순수 로직(React/네트워크 없음)이라 단독으로 테스트할 수 있다.
// 관심 수영장의 접수 시작일 이틀 전부터 접수 마감일(없으면 접수 시작일)까지를 "알림 기간"으로 본다.
import type { PoolEnrollmentRow } from '../data/poolEnrollment';

export const ALERT_LEAD_DAYS = 2;

const DAY_MS = 86400000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export type EnrollmentStatus = 'upcoming' | 'open';

export interface EnrollmentAlert {
  enrollment: PoolEnrollmentRow;
  /** upcoming: 접수 시작 전(알림 기간), open: 접수 중 */
  status: EnrollmentStatus;
  /** 접수 시작까지 남은 날수. 접수 중이면 0. */
  daysUntilOpen: number;
}

/** "YYYY-MM-DD"를 그 날 0시(기기 시간대)로. 형식이 틀리거나 없는 날짜면 null. */
export function parseDate(text: string | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text ?? '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** 알림이 켜져 있는 기간. 날짜가 잘못된 일정은 null(알림 대상에서 뺀다). */
export function alertWindow(e: PoolEnrollmentRow): { start: Date; end: Date; open: Date } | null {
  const open = parseDate(e.openDate);
  if (!open) return null;
  const close = e.closeDate ? parseDate(e.closeDate) : null;
  if (e.closeDate && (!close || close < open)) return null;
  return { start: addDays(open, -ALERT_LEAD_DAYS), end: endOfDay(close ?? open), open };
}

/** 지금 알림을 보여줘야 하는 일정들. 관심 수영장(favoriteKeys)만 대상이고, 접수 시작이 가까운 순. */
export function activeAlerts(
  enrollments: readonly PoolEnrollmentRow[],
  favoriteKeys: ReadonlySet<string>,
  now: Date = new Date()
): EnrollmentAlert[] {
  const today = startOfDay(now);
  const alerts: EnrollmentAlert[] = [];
  for (const e of enrollments) {
    if (!favoriteKeys.has(e.key)) continue;
    const w = alertWindow(e);
    if (!w || now < w.start || now > w.end) continue;
    const daysUntilOpen = Math.max(0, Math.round((w.open.getTime() - today.getTime()) / DAY_MS));
    alerts.push({ enrollment: e, status: daysUntilOpen > 0 ? 'upcoming' : 'open', daysUntilOpen });
  }
  return alerts.sort((a, b) => a.daysUntilOpen - b.daysUntilOpen || a.enrollment.openDate.localeCompare(b.enrollment.openDate));
}

/** 수영장 카드에 보여줄 "다음 모집" — 아직 끝나지 않은 일정 중 접수 시작이 가장 빠른 것. */
export function nextEnrollment(
  key: string,
  enrollments: readonly PoolEnrollmentRow[],
  now: Date = new Date()
): PoolEnrollmentRow | null {
  let best: { e: PoolEnrollmentRow; open: Date } | null = null;
  for (const e of enrollments) {
    if (e.key !== key) continue;
    const w = alertWindow(e);
    if (!w || now > w.end) continue;
    if (!best || w.open < best.open) best = { e, open: w.open };
  }
  return best?.e ?? null;
}

/** "11/1(토) 10:00" */
export function formatOpen(e: PoolEnrollmentRow): string {
  const open = parseDate(e.openDate);
  if (!open) return e.openDate;
  const base = `${open.getMonth() + 1}/${open.getDate()}(${WEEKDAYS[open.getDay()]})`;
  return e.openTime ? `${base} ${e.openTime}` : base;
}

/** "11/1(토) 10:00 ~ 11/7(금)" — 마감일이 없으면 시작만. */
export function formatPeriod(e: PoolEnrollmentRow): string {
  const close = e.closeDate ? parseDate(e.closeDate) : null;
  if (!close) return formatOpen(e);
  return `${formatOpen(e)} ~ ${close.getMonth() + 1}/${close.getDate()}(${WEEKDAYS[close.getDay()]})`;
}

export function dDayLabel(alert: EnrollmentAlert): string {
  return alert.status === 'open' ? '접수 중' : `D-${alert.daysUntilOpen}`;
}

/** 이 일정에 대해 휴대폰 알림을 울릴 시각들: 접수 이틀 전 오전 9시, 접수 당일 오전 8시 30분. */
export function notificationTimes(e: PoolEnrollmentRow): { at: Date; daysUntilOpen: number }[] {
  const open = parseDate(e.openDate);
  if (!open || !alertWindow(e)) return [];
  const lead = addDays(open, -ALERT_LEAD_DAYS);
  return [
    { at: new Date(lead.getFullYear(), lead.getMonth(), lead.getDate(), 9, 0), daysUntilOpen: ALERT_LEAD_DAYS },
    { at: new Date(open.getFullYear(), open.getMonth(), open.getDate(), 8, 30), daysUntilOpen: 0 },
  ];
}

/** 다음 자정까지 남은 밀리초 — 날짜가 바뀌면 알림 상태를 다시 계산하려고 쓴다. */
export function msUntilNextMidnight(now: Date = new Date()): number {
  return addDays(startOfDay(now), 1).getTime() - now.getTime() + 1000;
}
