export type FriendsStackParamList = {
  FriendsHome: undefined;
};

export type GroupsStackParamList = {
  GroupsHome: { code?: string } | undefined;
  ChatRoom: { groupId: string; groupName: string };
};
