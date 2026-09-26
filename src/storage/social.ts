// 수친(친구) / 수모임(채팅방) — Supabase 백엔드 연동.
// 로컬에는 아무것도 저장하지 않는다 (여러 기기/사용자 간에 실제로 연결되어야 하는 데이터라서).
import * as Contacts from 'expo-contacts';
import { supabase } from '../lib/supabase';
import { toE164 } from '../utils/phone';
import { getCurrentUser } from './auth';

export interface Friend {
  id: string;
  nicknameKo: string;
  nicknameEn: string;
}

export interface MatchedContact extends Friend {
  contactName: string;
  phone: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

export type ChatMessageType = 'text' | 'photo' | 'record_share';

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  type: ChatMessageType;
  text?: string;
  sharedSummary?: string;
  createdAt: string;
}

function displayName(p: { nickname_ko?: string | null; nickname_en?: string | null }): string {
  return p.nickname_ko || p.nickname_en || '알 수 없음';
}

// ---- 수친 ----

export async function getFriends(): Promise<Friend[]> {
  const me = await getCurrentUser();
  if (!me) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('friend_id, profiles:profiles!friendships_friend_id_fkey(id, nickname_ko, nickname_en)')
    .eq('user_id', me.id);

  if (error || !data) return [];
  return data
    .map((row: any) => row.profiles)
    .filter(Boolean)
    .map((p: any) => ({ id: p.id, nicknameKo: p.nickname_ko, nicknameEn: p.nickname_en }));
}

/** 기기 연락처 권한이 이미 허용된 상태에서, 연락처의 전화번호로 가입자를 찾는다. */
export async function findRegisteredContacts(): Promise<MatchedContact[]> {
  const { status } = await Contacts.getPermissionsAsync();
  if (status !== 'granted') return [];

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers],
  });

  const phoneToName = new Map<string, string>();
  for (const contact of data) {
    for (const p of contact.phoneNumbers ?? []) {
      const e164 = p.number ? toE164(p.number) : null;
      if (e164) phoneToName.set(e164, contact.name ?? '이름 없음');
    }
  }
  if (phoneToName.size === 0) return [];

  const { data: matches, error } = await supabase.rpc('find_registered_contacts', {
    phones: Array.from(phoneToName.keys()),
  });
  if (error || !matches) return [];

  return (matches as any[]).map((m) => ({
    id: m.id,
    nicknameKo: m.nickname_ko,
    nicknameEn: m.nickname_en,
    phone: m.phone_e164,
    contactName: phoneToName.get(m.phone_e164) ?? displayName(m),
  }));
}

export async function addFriendById(targetId: string): Promise<void> {
  await supabase.rpc('add_mutual_friend', { target_id: targetId });
}

export async function addFriendByInviteCode(
  code: string
): Promise<{ ok: boolean; nickname?: string }> {
  const { data, error } = await supabase.rpc('find_profile_by_invite_code', { code });
  if (error || !data || (data as any[]).length === 0) {
    return { ok: false };
  }
  const target = (data as any[])[0];
  await addFriendById(target.id);
  return { ok: true, nickname: displayName(target) };
}

// ---- 수모임 ----

export async function getGroups(): Promise<ChatGroup[]> {
  const { data, error } = await supabase
    .from('chat_groups')
    .select('id, name, invite_code, created_at')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((g) => ({
    id: g.id,
    name: g.name,
    inviteCode: g.invite_code,
    createdAt: g.created_at,
  }));
}

export async function createGroup(name: string, memberIds: string[]): Promise<string> {
  const { data, error } = await supabase.rpc('create_group_with_creator', {
    group_name: name,
    member_ids: memberIds,
  });
  if (error || !data) throw error ?? new Error('failed to create group');
  return data as string;
}

export async function joinGroupByInviteCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_group_by_invite_code', { code });
  if (error || !data) throw error ?? new Error('invalid_invite_code');
  return data as string;
}

export function inviteLinkFor(inviteCode: string): string {
  return `doongsil://invite/${inviteCode}`;
}

export async function getGroupMembers(groupId: string): Promise<Friend[]> {
  const { data, error } = await supabase
    .from('chat_group_members')
    .select('profiles(id, nickname_ko, nickname_en)')
    .eq('group_id', groupId);
  if (error || !data) return [];
  return (data as any[])
    .map((row) => row.profiles)
    .filter(Boolean)
    .map((p: any) => ({ id: p.id, nicknameKo: p.nickname_ko, nicknameEn: p.nickname_en }));
}

// ---- 채팅 메시지 ----

export async function getMessages(groupId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, group_id, sender_id, type, text, shared_summary, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((m) => ({
    id: m.id,
    groupId: m.group_id,
    senderId: m.sender_id,
    type: m.type,
    text: m.text ?? undefined,
    sharedSummary: m.shared_summary ?? undefined,
    createdAt: m.created_at,
  }));
}

export async function sendTextMessage(groupId: string, text: string): Promise<void> {
  const me = await getCurrentUser();
  if (!me) return;
  await supabase
    .from('chat_messages')
    .insert({ group_id: groupId, sender_id: me.id, type: 'text', text });
}

export async function shareRecordToGroup(groupId: string, summary: string): Promise<void> {
  const me = await getCurrentUser();
  if (!me) return;
  await supabase.from('chat_messages').insert({
    group_id: groupId,
    sender_id: me.id,
    type: 'record_share',
    shared_summary: summary,
  });
}

export function subscribeToMessages(groupId: string, onInsert: (message: ChatMessage) => void) {
  const channel = supabase
    .channel(`chat_messages:${groupId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `group_id=eq.${groupId}` },
      (payload) => {
        const m = payload.new as any;
        onInsert({
          id: m.id,
          groupId: m.group_id,
          senderId: m.sender_id,
          type: m.type,
          text: m.text ?? undefined,
          sharedSummary: m.shared_summary ?? undefined,
          createdAt: m.created_at,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
