// 수친(친구) / 수모임(채팅방) 데이터 구조.
// FEATURE_FLAGS.friendsAndChat 이 꺼져있는 동안은 화면에 노출되지 않지만,
// 데이터 구조와 화면은 미리 다 만들어둔다 (플래그만 켜면 바로 동작).
import AsyncStorage from 'expo-sqlite/kv-store';

const FRIENDS_KEY = '@doongsil/social/friends';
const GROUPS_KEY = '@doongsil/social/groups';
const MESSAGES_KEY = '@doongsil/social/messages';

export interface SwimFriend {
  id: string;
  name: string;
  /** 예: "예전에 다니던 수영장", "자유수영에서 만난 친구" */
  note?: string;
  addedAt: number;
}

export interface ChatGroup {
  id: string;
  name: string;
  memberNames: string[];
  createdAt: number;
}

export type ChatMessageType = 'text' | 'photo' | 'record_share' | 'calendar_share';

export interface ChatMessage {
  id: string;
  groupId: string;
  senderName: string;
  type: ChatMessageType;
  text?: string;
  photoUri?: string;
  /** record_share / calendar_share 일 때, 공유한 노팅 기록의 요약 텍스트 */
  sharedSummary?: string;
  createdAt: number;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---- 수친 ----

export async function getFriends(): Promise<SwimFriend[]> {
  const friends = await readJson<SwimFriend[]>(FRIENDS_KEY, []);
  return friends.sort((a, b) => b.addedAt - a.addedAt);
}

export async function addFriend(name: string, note?: string): Promise<SwimFriend> {
  const friends = await getFriends();
  const friend: SwimFriend = { id: generateId('friend'), name, note, addedAt: Date.now() };
  await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify([friend, ...friends]));
  return friend;
}

export async function removeFriend(id: string): Promise<void> {
  const friends = await getFriends();
  await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(friends.filter((f) => f.id !== id)));
}

// ---- 수모임 ----

export async function getGroups(): Promise<ChatGroup[]> {
  const groups = await readJson<ChatGroup[]>(GROUPS_KEY, []);
  return groups.sort((a, b) => b.createdAt - a.createdAt);
}

export async function createGroup(name: string, memberNames: string[]): Promise<ChatGroup> {
  const groups = await getGroups();
  const group: ChatGroup = { id: generateId('group'), name, memberNames, createdAt: Date.now() };
  await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify([group, ...groups]));
  return group;
}

// ---- 채팅 메시지 ----

export async function getMessages(groupId: string): Promise<ChatMessage[]> {
  const all = await readJson<ChatMessage[]>(MESSAGES_KEY, []);
  return all.filter((m) => m.groupId === groupId).sort((a, b) => a.createdAt - b.createdAt);
}

async function appendMessage(message: ChatMessage): Promise<void> {
  const all = await readJson<ChatMessage[]>(MESSAGES_KEY, []);
  await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify([...all, message]));
}

export async function sendTextMessage(groupId: string, senderName: string, text: string): Promise<void> {
  await appendMessage({
    id: generateId('msg'),
    groupId,
    senderName,
    type: 'text',
    text,
    createdAt: Date.now(),
  });
}

export async function shareRecordToGroup(
  groupId: string,
  senderName: string,
  summary: string
): Promise<void> {
  await appendMessage({
    id: generateId('msg'),
    groupId,
    senderName,
    type: 'record_share',
    sharedSummary: summary,
    createdAt: Date.now(),
  });
}

/** 처음 켰을 때 빈 화면이 아니라 데모용으로 몇 개 채워둔다. */
export async function seedSocialDemoDataIfEmpty(): Promise<void> {
  const [friends, groups] = await Promise.all([getFriends(), getGroups()]);
  if (friends.length === 0) {
    await addFriend('민지', '예전에 다니던 수영장');
    await addFriend('현우', '자유수영에서 만난 친구');
  }
  if (groups.length === 0) {
    const group = await createGroup('수요일 자유수영팟', ['민지', '현우']);
    await sendTextMessage(group.id, '민지', '이번주 수요일도 가나요?');
  }
}
