import AsyncStorage from 'expo-sqlite/kv-store';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Contacts from 'expo-contacts';

const AUTH_KEY = '@doongsil/auth';

export interface UserProfile {
  id: string;
  displayName: string;
  /** 'apple' = 애플 로그인, 'guest' = 로그인 없이 둘러보기 */
  provider: 'apple' | 'guest';
  contactsSynced: boolean;
  createdAt: number;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

/**
 * 애플이 이름/이메일을 알려주는 건 최초 로그인 한 번뿐이라, 그 순간을 놓치지 않고 저장한다.
 * 사용자가 로그인 취소하면 AppleAuthentication이 ERR_REQUEST_CANCELED로 reject하므로
 * 호출하는 쪽(AuthScreen)에서 try/catch로 조용히 무시하면 된다.
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

  const profile: UserProfile = {
    id: credential.user,
    displayName: name || '수영하는 사람',
    provider: 'apple',
    contactsSynced: false,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(profile));
  return profile;
}

export async function continueAsGuest(): Promise<UserProfile> {
  const profile: UserProfile = {
    id: `guest-${Date.now()}`,
    displayName: '게스트',
    provider: 'guest',
    contactsSynced: false,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(profile));
  return profile;
}

/**
 * 연락처 권한만 실제로 요청한다. 서버가 없어서(1차 릴리즈는 로컬 전용) 번호를 다른
 * 가입자와 매칭해 자동으로 수친 추천을 해주는 기능은 아직 없다 — 그건 백엔드가 생긴
 * 다음 단계. 지금은 권한 상태만 저장해두고, 수친은 여전히 수동으로 추가한다.
 */
export async function syncContacts(): Promise<{ granted: boolean }> {
  const { status } = await Contacts.requestPermissionsAsync();
  const granted = status === 'granted';
  if (granted) {
    const user = await getCurrentUser();
    if (user) {
      const updated: UserProfile = { ...user, contactsSynced: true };
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated));
    }
  }
  return { granted };
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}
