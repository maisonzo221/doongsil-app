import AsyncStorage from 'expo-sqlite/kv-store';

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
 * Expo Go에서는 진짜 Sign in with Apple을 쓸 수 없어(네이티브 모듈, 개발 빌드 필요),
 * 가짜 프로필을 만들어 로그인 상태로 전환한다.
 * 실제 연동 시: `expo-apple-authentication`의 AppleAuthentication.signInAsync() 결과로
 * 이 UserProfile을 채우면 된다.
 */
export async function mockSignInWithApple(): Promise<UserProfile> {
  const profile: UserProfile = {
    id: `apple-${Date.now()}`,
    displayName: '수영하는 사람',
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
 * 연락처 접근도 Expo Go에서 안 돼서 흉내만 낸다.
 * 실제 연동 시: `expo-contacts`의 Contacts.requestPermissionsAsync() +
 * Contacts.getContactsAsync() 결과로 대체.
 */
export async function mockSyncContacts(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const updated: UserProfile = { ...user, contactsSynced: true };
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updated));
}

export async function signOut(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}
