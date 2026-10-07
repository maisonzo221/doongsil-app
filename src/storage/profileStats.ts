// 친구에게만 보이는 "평균 수영 데이터" — 수영 기록 자체는 기기(AsyncStorage)에만 있고
// 서버에 올라간 적이 없어서, 각자 기기에서 계산한 요약값만 본인이 직접 올려두고
// 수친만 조회할 수 있게 한다 (migration_007의 profile_stats 테이블/RLS 참고).
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getAllRecords } from './records';
import { getCurrentUser } from './auth';

export interface ProfileStats {
  avgDistanceM: number | null;
  avgDurationMin: number | null;
  sessionCount: number;
}

/** 로컬 수영 기록으로 평균을 계산해서 서버에 올려둔다. 본인 프로필 화면/캘린더를
 * 열 때마다 호출해두면, 수친이 내 프로필을 볼 때 최신 값을 보게 된다. */
export async function pushMyStats(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const me = await getCurrentUser();
  if (!me || me.provider !== 'apple') return;

  const records = await getAllRecords();
  const distances = records.map((r) => r.distanceMeters).filter((n): n is number => typeof n === 'number');
  const durations = records.map((r) => r.durationMinutes).filter((n): n is number => typeof n === 'number');
  const avg = (nums: number[]) => (nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null);

  await supabase.from('profile_stats').upsert({
    user_id: me.id,
    avg_distance_m: avg(distances),
    avg_duration_min: avg(durations),
    session_count: records.length,
    updated_at: new Date().toISOString(),
  });
}

/** 다른 사용자의 평균 수영 데이터를 가져온다. RLS상 본인이거나 수친일 때만 값이 온다
 * (그 외엔 행 자체가 안 보여서 null). */
export async function getProfileStats(userId: string): Promise<ProfileStats | null> {
  const { data, error } = await supabase
    .from('profile_stats')
    .select('avg_distance_m, avg_duration_min, session_count')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    avgDistanceM: data.avg_distance_m,
    avgDurationMin: data.avg_duration_min,
    sessionCount: data.session_count,
  };
}
