import AsyncStorage from 'expo-sqlite/kv-store';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Contacts from 'expo-contacts';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const GUEST_KEY = '@doongsil/auth/guest';

// 로그아웃/계정 삭제는 FriendsStack 안쪽의 SettingsScreen에서 일어나는데, 로그인 여부는
// RootNavigator가 들고 있는 state라 거기까지 직접 닿지 않는다. 프롭 드릴링 대신 가벼운
// 구독 목록으로 "로그인 상태가 바뀌었다"만 알려주면, RootNavigator가 getCurrentUser()를
// 다시 불러서 스스로 갱신한다.
type AuthChangeListener = () => void;
const authChangeListeners = new Set<AuthChangeListener>();

export function onAuthChange(listener: AuthChangeListener): () => void {
  authChangeListeners.add(listener);
  return () => authChangeListeners.delete(listener);
}

function notifyAuthChange() {
  authChangeListeners.forEach((l) => l());
}

export interface UserProfile {
  id: string;
  nicknameKo: string;
  nicknameEn: string;
  /** 다른 사람이 수친 추가할 때 쓰는 코드. 게스트는 없음. */
  inviteCode: string | null;
  provider: 'apple' | 'guest';
  contactsSynced: boolean;
  /** 자유게시판 관리자 — Supabase에서 수동으로 지정한 계정만 true (migration_007 참고). */
  isAdmin: boolean;
  /** 수영을 시작한 날짜(YYYY-MM-DD). 수력 계산에 쓴다. */
  swimSince: string | null;
  /** E.164 형식(+8210...)으로 등록된 내 전화번호. 등록해야 다른 사람이 연락처로 나를
   * 찾을 수 있다(그 반대도 마찬가지). null이면 아직 등록 안 한 것. */
  phoneE164: string | null;
}

async function fetchOrCreateProfile(userId: string, fallbackName: string): Promise<UserProfile> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, nickname_ko, nickname_en, invite_code, is_admin, swim_since, phone_e164')
    .eq('id', userId)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      nicknameKo: existing.nickname_ko ?? fallbackName,
      nicknameEn: existing.nickname_en ?? fallbackName,
      inviteCode: existing.invite_code,
      provider: 'apple',
      contactsSynced: false,
      isAdmin: existing.is_admin ?? false,
      swimSince: existing.swim_since ?? null,
      phoneE164: existing.phone_e164 ?? null,
    };
  }

  const { data: codeData } = await supabase.rpc('generate_invite_code');
  const inviteCode = (codeData as string) ?? Math.random().toString(36).slice(2, 8).toUpperCase();

  const { data: inserted, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      nickname_ko: fallbackName,
      nickname_en: fallbackName,
      invite_code: inviteCode,
    })
    .select('id, nickname_ko, nickname_en, invite_code, is_admin, swim_since, phone_e164')
    .single();

  if (error || !inserted) {
    throw error ?? new Error('failed to create profile');
  }

  return {
    id: inserted.id,
    nicknameKo: inserted.nickname_ko,
    nicknameEn: inserted.nickname_en,
    inviteCode: inserted.invite_code,
    provider: 'apple',
    contactsSynced: false,
    isAdmin: inserted.is_admin ?? false,
    phoneE164: inserted.phone_e164 ?? null,
    swimSince: inserted.swim_since ?? null,
  };
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (isSupabaseConfigured) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      try {
        return await fetchOrCreateProfile(session.user.id, '수영하는 사람');
      } catch {
        // 네트워크 문제 등으로 프로필을 못 가져와도 로그인 자체는 유지한다.
        return {
          id: session.user.id,
          nicknameKo: '수영하는 사람',
          nicknameEn: 'Swimmer',
          inviteCode: null,
          provider: 'apple',
          contactsSynced: false,
          isAdmin: false,
          swimSince: null,
          phoneE164: null,
        };
      }
    }
  }

  const guestRaw = await AsyncStorage.getItem(GUEST_KEY);
  if (guestRaw) {
    try {
      return JSON.parse(guestRaw) as UserProfile;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 애플이 이름을 알려주는 건 최초 로그인 한 번뿐이라 그 순간에 프로필 닉네임 기본값으로 쓴다.
 * 사용자가 로그인 취소하면 ERR_REQUEST_CANCELED로 reject하니 호출부(AuthScreen)에서 조용히 무시하면 된다.
 */
export async function signInWithApple(): Promise<UserProfile> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const name = credential.fullName
    ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
    : '';

  if (!isSupabaseConfigured || !credential.identityToken) {
    // 백엔드가 설정 안 된 상태 (.env 없음) — 로그인은 로컬로만 처리, 수친/수톡은 비활성.
    const profile: UserProfile = {
      id: credential.user,
      nicknameKo: name || '수영하는 사람',
      nicknameEn: name || 'Swimmer',
      inviteCode: null,
      provider: 'apple',
      contactsSynced: false,
      isAdmin: false,
      swimSince: null,
      phoneE164: null,
    };
    await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(profile));
    return profile;
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error || !data.user) {
    throw error ?? new Error('Apple sign-in failed');
  }

  return fetchOrCreateProfile(data.user.id, name || '수영하는 사람');
}

export async function continueAsGuest(): Promise<UserProfile> {
  const profile: UserProfile = {
    id: `guest-${Date.now()}`,
    nicknameKo: '게스트',
    nicknameEn: 'Guest',
    inviteCode: null,
    provider: 'guest',
    contactsSynced: false,
    isAdmin: false,
    swimSince: null,
    phoneE164: null,
  };
  await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(profile));
  return profile;
}

/** 내 전화번호를 등록한다 — "연락처에서 가입자 찾기"는 다른 사람 연락처에 저장된
 * 내 번호와 내 profiles.phone_e164를 비교해서 매칭하는 방식이라, 이걸 등록해두지
 * 않으면 아무도 나를 찾을 수 없다(반대로 내가 남을 찾는 것도 상대가 등록해야 가능). */
export async function updatePhoneNumber(e164: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.provider !== 'apple' || !isSupabaseConfigured) return;
  const { error } = await supabase.from('profiles').update({ phone_e164: e164 }).eq('id', user.id);
  if (error) throw error;
}

export async function updateNicknames(nicknameKo: string, nicknameEn: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.provider !== 'apple' || !isSupabaseConfigured) return;
  await supabase
    .from('profiles')
    .update({ nickname_ko: nicknameKo, nickname_en: nicknameEn })
    .eq('id', user.id);
}

/** 수력 계산 기준일을 설정한다(최초 1회 설정이든 수정이든 동일). dateString은 YYYY-MM-DD. */
export async function updateSwimSince(dateString: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.provider !== 'apple' || !isSupabaseConfigured) return;
  await supabase.from('profiles').update({ swim_since: dateString }).eq('id', user.id);
}

/**
 * 연락처 권한만 요청한다. 실제로 연락처를 서버에 올리진 않고, 기기 안에서 전화번호만
 * 뽑아 find_registered_contacts()로 조회한다 (social.ts 참고).
 */
export async function syncContacts(): Promise<{ granted: boolean }> {
  const { status } = await Contacts.requestPermissionsAsync();
  const granted = status === 'granted';
  if (granted) {
    const user = await getCurrentUser();
    if (user?.provider === 'guest') {
      await AsyncStorage.setItem(GUEST_KEY, JSON.stringify({ ...user, contactsSynced: true }));
    }
  }
  return { granted };
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(GUEST_KEY);
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
  }
  notifyAuthChange();
}

/**
 * 계정(Apple 로그인)과 서버에 있는 데이터(프로필, 수친, 수톡/톡톡 채팅방·메시지,
 * 자유게시판 글/댓글)를 전부 지운다. delete_own_account() RPC가 auth.users 행을
 * 지우면 profiles.id가 그걸 on delete cascade로 참조하고 있어서, 거기 달린 모든
 * 테이블이 한 번에 같이 지워진다(migration_006_delete_account.sql 참고). 기기에만
 * 있는 수영 기록(캘린더)은 서버에 올라간 적이 없어서 앱 삭제로만 지워진다.
 */
export async function deleteAccount(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
  await signOut();
}
