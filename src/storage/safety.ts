// 신고 / 차단 — Supabase 백엔드 연동 (migration_013_report_block.sql).
// 차단한 사람의 글·댓글·채팅은 화면에서 숨긴다. 차단 목록은 서버에 있어서 기기를 바꿔도 이어진다.
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentUser, onAuthChange } from './auth';

export type ReportTargetType = 'message' | 'post' | 'comment' | 'user';

export const REPORT_REASONS = ['스팸·광고', '욕설·혐오 표현', '음란·선정적인 내용', '개인정보 노출', '기타'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface ReportInput {
  targetType: ReportTargetType;
  /** 신고하는 글·댓글·메시지의 id. 사용자 자체를 신고할 때는 없다. */
  targetId?: string;
  targetUserId: string;
  reason: ReportReason;
  /** 신고 당시의 내용. 나중에 글이 지워져도 운영자가 확인할 수 있게 같이 보낸다. */
  targetText?: string;
}

export async function reportContent(input: ReportInput): Promise<void> {
  const me = await getCurrentUser();
  if (!me || me.provider === 'guest') throw new Error('not signed in');
  const { error } = await supabase.from('reports').insert({
    reporter_id: me.id,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    target_user_id: input.targetUserId,
    reason: input.reason,
    target_text: input.targetText?.slice(0, 1000) ?? null,
  });
  if (error) throw error;
}

// ---- 차단 목록 (메모리 캐시 + 구독) ----

let blocked = new Set<string>();
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

// 로그아웃하거나 다른 계정으로 바뀌면 이전 계정의 차단 목록을 비운다.
onAuthChange(() => {
  loaded = false;
  blocked = new Set();
  emit();
});

export function getBlockedIdsSync(): Set<string> {
  return blocked;
}

export async function loadBlockedIds(): Promise<Set<string>> {
  const me = await getCurrentUser();
  if (!me || me.provider === 'guest') {
    blocked = new Set();
    loaded = true;
    emit();
    return blocked;
  }
  const { data, error } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', me.id);
  // 마이그레이션 전이거나 네트워크가 안 될 때는 이전 값을 그대로 둔다(앱이 멈추지 않게).
  if (!error && data) {
    blocked = new Set(data.map((r: { blocked_id: string }) => r.blocked_id));
    loaded = true;
    emit();
  }
  return blocked;
}

/** 화면에서 "이 사람을 숨길까?"를 알려주는 훅. 차단/해제하면 바로 다시 그려진다. */
export function useBlockedIds(): Set<string> {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((n) => n + 1);
    listeners.add(l);
    if (!loaded) loadBlockedIds();
    return () => {
      listeners.delete(l);
    };
  }, []);
  return blocked;
}

export async function blockUser(userId: string): Promise<void> {
  const me = await getCurrentUser();
  if (!me || me.provider === 'guest') throw new Error('not signed in');
  if (me.id === userId) return;
  const { error } = await supabase
    .from('blocked_users')
    .upsert({ blocker_id: me.id, blocked_id: userId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true });
  if (error) throw error;
  blocked = new Set(blocked).add(userId);
  emit();
}

export async function unblockUser(userId: string): Promise<void> {
  const me = await getCurrentUser();
  if (!me || me.provider === 'guest') return;
  const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', me.id).eq('blocked_id', userId);
  if (error) throw error;
  const next = new Set(blocked);
  next.delete(userId);
  blocked = next;
  emit();
}

export interface BlockedUser {
  id: string;
  nickname: string;
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const ids = [...(await loadBlockedIds())];
  if (ids.length === 0) return [];
  const { data } = await supabase.from('public_profiles').select('id, nickname_ko, nickname_en').in('id', ids);
  const names = new Map<string, string>();
  for (const p of (data ?? []) as { id: string; nickname_ko: string | null; nickname_en: string | null }[]) {
    names.set(p.id, p.nickname_ko || p.nickname_en || '알 수 없음');
  }
  return ids.map((id) => ({ id, nickname: names.get(id) ?? '알 수 없음' }));
}
