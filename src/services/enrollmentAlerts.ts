// 관심 수영장의 신규회원 모집 알림.
// 1) useEnrollmentAlerts: 지금 알림 기간(접수 이틀 전 ~ 마감)인 관심 수영장 목록 — 가운데 탭 점멸/배너가 쓴다.
// 2) refreshEnrollmentNotifications: 앱을 꺼도 울리도록 휴대폰 알림을 예약한다(이틀 전 9시, 당일 8시 30분).
// 일정 데이터는 전화로 직접 확인한 것만(POOL_ENROLLMENTS) 쓴다.
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { POOL_ENROLLMENTS } from '../data/poolEnrollment';
import { FavoritePool, getFavoritePools, subscribeFavoritePools } from '../storage/favoritePools';
import { activeAlerts, EnrollmentAlert, formatOpen, msUntilNextMidnight, notificationTimes } from '../utils/enrollment';

const KIND = 'enrollment';
// iOS는 예약 알림을 64개까지만 유지한다.
const MAX_SCHEDULED = 60;

export function useFavoritePools(): FavoritePool[] {
  const [list, setList] = useState<FavoritePool[]>([]);
  useEffect(() => {
    let alive = true;
    getFavoritePools().then((l) => alive && setList(l));
    const off = subscribeFavoritePools(setList);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return list;
}

export function useEnrollmentAlerts(): EnrollmentAlert[] {
  const favorites = useFavoritePools();
  // 날짜가 바뀌거나 앱이 다시 열리면 다시 계산한다.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setTick((t) => t + 1);
        schedule();
      }, msUntilNextMidnight());
    };
    schedule();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setTick((t) => t + 1);
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return useMemo(
    () => activeAlerts(POOL_ENROLLMENTS, new Set(favorites.map((f) => f.key))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [favorites, tick]
  );
}

/** 알림 권한이 없으면 물어본다. 관심 수영장을 처음 등록할 때 부른다. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.status === 'granted';
  } catch {
    return false;
  }
}

/** 예약해둔 모집 알림을 지우고, 지금 관심 수영장 기준으로 다시 예약한다. */
export async function refreshEnrollmentNotifications(): Promise<void> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => (n.content.data as { kind?: string } | undefined)?.kind === KIND)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
    if (perm.status !== 'granted') return;

    const favorites = await getFavoritePools();
    const keys = new Set(favorites.map((f) => f.key));
    const now = Date.now();
    const pending = POOL_ENROLLMENTS.filter((e) => keys.has(e.key))
      .flatMap((e) => notificationTimes(e).map((t) => ({ e, ...t })))
      .filter((x) => x.at.getTime() > now)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .slice(0, MAX_SCHEDULED);

    for (const { e, at, daysUntilOpen } of pending) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title:
            daysUntilOpen > 0
              ? `${e.poolName} 신규회원 접수 D-${daysUntilOpen}`
              : `오늘 ${e.poolName} 신규회원 접수 시작`,
          body: `${formatOpen(e)} 접수 시작이에요. 놓치지 마세요!`,
          data: { kind: KIND, key: e.key },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
  } catch {
    // 알림 예약 실패가 앱 동작을 막으면 안 된다.
  }
}

/** 관심 수영장이 바뀔 때마다 알림 예약을 맞춘다. 로그인 후 탭 화면에서 한 번만 쓴다. */
export function useEnrollmentNotificationSync(): void {
  const favorites = useFavoritePools();
  useEffect(() => {
    refreshEnrollmentNotifications();
  }, [favorites]);
}
