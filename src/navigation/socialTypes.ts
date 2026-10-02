export type RoomKind = 'sutok' | 'toktok';

export type FriendsStackParamList = {
  FriendsHome: { code?: string } | undefined;
  ChatRoom: { groupId: string; groupName: string; ownerId: string; roomKind: RoomKind };
};
