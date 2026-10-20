import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../../components/ScreenBackground';
import MessageBubble from '../../components/MessageBubble';
import { MembersIcon } from '../../components/icons/TabIcons';
import { colors, fonts, radius, spacing } from '../../theme';
import { FriendsStackParamList } from '../../navigation/socialTypes';
import {
  ChatMessage,
  Friend,
  getFriends,
  getGroupById,
  getGroupMembers,
  getMessages,
  inviteLinkFor,
  inviteMemberToGroup,
  kickMember,
  leaveGroup,
  ProfanityBlockedError,
  sendTextMessage,
  shareRecordToGroup,
  subscribeToMessages,
  transferOwnership,
} from '../../storage/social';
import { getAllRecords } from '../../storage/records';
import { getCurrentUser } from '../../storage/auth';
import { formatDateLabel } from '../../utils/date';
import { STROKE_LABEL } from '../../types';

type Props = NativeStackScreenProps<FriendsStackParamList, 'ChatRoom'>;

export default function ChatRoomScreen({ route, navigation }: Props) {
  const { groupId, groupName, roomKind } = route.params;
  const roomLabel = roomKind === 'toktok' ? '톡톡' : '수톡';
  const [ownerId, setOwnerId] = useState(route.params.ownerId);
  const [myId, setMyId] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, Friend>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [memberModal, setMemberModal] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteModal, setInviteModal] = useState(false);
  const [invitableFriends, setInvitableFriends] = useState<Friend[]>([]);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // 키보드가 올라오면 입력창이 키보드 위로 올라오고, 마지막 메시지가 항상 입력창 바로 위에 보이게 한다.
  // KeyboardAvoidingView는 자기 위쪽에 있는 것(헤더/상태바)의 높이를 모르면 그만큼 덜 올려서 입력창이
  // 키보드에 가려진다. 그래서 이 화면이 화면 위에서 얼마나 내려와 있는지(창 기준 y)를 직접 재서 넘긴다.
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const frameRef = useRef<View>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  // 사용자가 위로 올려서 지난 대화를 읽는 중이면 새 메시지가 와도 끌어내리지 않는다.
  const stickToBottom = useRef(true);
  // 방금 새로 생긴 메시지(내가 보냈거나 실시간으로 도착한 것)만 떠오르는 효과를 보여준다. 처음 불러온 대화는 그대로 보인다.
  const freshKeys = useRef(new Set<string>());
  const handleAnimated = useCallback((key: string) => {
    freshKeys.current.delete(key);
  }, []);
  const scrollToBottom = useCallback((animated: boolean) => {
    listRef.current?.scrollToEnd({ animated });
  }, []);

  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(event, () => {
      if (stickToBottom.current) setTimeout(() => scrollToBottom(true), 50);
    });
    return () => sub.remove();
  }, [scrollToBottom]);

  const isOwner = !!myId && myId === ownerId;

  const reload = useCallback(async () => {
    const [user, memberList, messageList, group] = await Promise.all([
      getCurrentUser(),
      getGroupMembers(groupId),
      getMessages(groupId),
      getGroupById(groupId),
    ]);
    setMyId(user?.id ?? null);
    setMembers(Object.fromEntries(memberList.map((m) => [m.id, m])));
    setMessages(messageList);
    setInviteCode(group?.inviteCode ?? null);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity style={styles.headerAction} onPress={() => setMemberModal(true)} hitSlop={8}>
          <MembersIcon color={colors.blueSea} size={22} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  async function openInviteModal() {
    const friends = await getFriends();
    const memberIds = new Set(Object.keys(members));
    setInvitableFriends(friends.filter((f) => !memberIds.has(f.id)));
    setInviteModal(true);
  }

  async function handleInviteFriend(friend: Friend) {
    setInvitingId(friend.id);
    try {
      await inviteMemberToGroup(groupId, friend.id);
      setInvitableFriends((prev) => prev.filter((f) => f.id !== friend.id));
      await reload();
    } catch (e: any) {
      if (e?.message?.includes('banned_from_group')) {
        Alert.alert('초대 불가', '강퇴된 적이 있어서 다시 초대할 수 없어요.');
      } else {
        Alert.alert('초대 실패', '잠시 후 다시 시도해주세요.');
      }
    } finally {
      setInvitingId(null);
    }
  }

  function handleShareInviteLink() {
    if (!inviteCode) return;
    Share.share({
      message: `둥실 ${roomLabel}방 "${groupName}"에 초대할게요!\n${inviteLinkFor(inviteCode)}\n초대 코드: ${inviteCode}`,
    });
  }

  useEffect(() => {
    const unsubscribe = subscribeToMessages(groupId, (message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        // 내가 방금 낙관적으로 먼저 화면에 띄워둔 임시 메시지가 있으면, 실제 서버 메시지가
        // 도착했을 때 그 자리에서 바꿔치기한다 (같은 말풍선을 유지해서 깜빡이거나 다시 떠오르지 않게).
        const optimistic = prev.find(
          (m) =>
            m.id.startsWith('temp-') &&
            m.senderId === message.senderId &&
            m.type === message.type &&
            m.text === message.text &&
            m.sharedSummary === message.sharedSummary
        );
        if (optimistic) {
          return prev.map((m) => (m === optimistic ? { ...message, localKey: optimistic.localKey ?? optimistic.id } : m));
        }
        freshKeys.current.add(message.id);
        return [...prev, message];
      });
    });
    return unsubscribe;
  }, [groupId]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || !myId) return;
    // 보내고 나서 실시간 구독으로 다시 돌아올 때까지 기다리면 버튼 누른 것치고
    // 반응이 느리게 느껴져서, 일단 화면에 바로 띄워두고(낙관적 업데이트) 실제
    // 전송은 뒤에서 진행한다. 실패하면 이 임시 메시지만 지우고 입력창을 복원한다.
    const tempId = `temp-${Date.now()}`;
    stickToBottom.current = true;
    freshKeys.current.add(tempId);
    setDraft('');
    setMessages((prev) => [
      ...prev,
      { id: tempId, groupId, senderId: myId, type: 'text', text, createdAt: new Date().toISOString() },
    ]);
    try {
      await sendTextMessage(groupId, text);
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft(text);
      if (e instanceof ProfanityBlockedError) {
        Alert.alert('전송 불가', '비속어가 포함되어 있어 보낼 수 없어요.');
      } else {
        Alert.alert('전송 실패', '메시지를 보내지 못했어요. 다시 시도해주세요.');
      }
    }
  }

  async function handleShareLatestRecord() {
    const records = await getAllRecords();
    if (records.length === 0) return;
    const latest = records[0];
    const strokes = latest.strokes.map((s) => STROKE_LABEL[s]).join(' · ');
    const summary = `${formatDateLabel(latest.date)} · ${strokes || '기록'}${
      latest.distanceMeters ? ` · ${latest.distanceMeters}m` : ''
    }`;
    await shareRecordToGroup(groupId, summary);
  }

  function nicknameFor(senderId: string): string {
    if (senderId === myId) return '나';
    return members[senderId]?.nicknameKo ?? '알 수 없음';
  }

  function handleKick(member: Friend) {
    Alert.alert('강퇴하기', `${member.nicknameKo}님을 이 ${roomLabel}방에서 강퇴할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '강퇴',
        style: 'destructive',
        onPress: async () => {
          try {
            await kickMember(groupId, member.id);
            await reload();
          } catch {
            Alert.alert('강퇴 실패', '다시 시도해주세요.');
          }
        },
      },
    ]);
  }

  function handleTransfer(member: Friend) {
    Alert.alert('방장 위임', `${member.nicknameKo}님에게 방장을 넘길까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '위임',
        onPress: async () => {
          try {
            await transferOwnership(groupId, member.id);
            setOwnerId(member.id);
          } catch {
            Alert.alert('위임 실패', '다시 시도해주세요.');
          }
        },
      },
    ]);
  }

  function handleLeave() {
    if (isOwner) {
      Alert.alert('나갈 수 없어요', '방장은 먼저 다른 멤버에게 방장을 위임한 뒤 나갈 수 있어요.');
      return;
    }
    Alert.alert(`${roomLabel}방 나가기`, '정말 나가시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          await leaveGroup(groupId);
          setMemberModal(false);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <ScreenBackground edges={['left', 'right']}>
      <View
        ref={frameRef}
        style={styles.flex}
        onLayout={() => frameRef.current?.measureInWindow((_x, y) => setKeyboardOffset(y))}
      >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{groupName}</Text>
        </View>

        <FlatList
          ref={listRef}
          style={styles.flex}
          data={messages}
          keyExtractor={(m) => m.localKey ?? m.id}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => stickToBottom.current && scrollToBottom(false)}
          onLayout={() => stickToBottom.current && scrollToBottom(false)}
          onScrollEndDrag={(e) => {
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            stickToBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
          }}
          onMomentumScrollEnd={(e) => {
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            stickToBottom.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
          }}
          renderItem={({ item }) => {
            const rowKey = item.localKey ?? item.id;
            return (
              <MessageBubble
                item={item}
                mine={item.senderId === myId}
                nickname={nicknameFor(item.senderId)}
                fresh={freshKeys.current.has(rowKey)}
                rowKey={rowKey}
                onAnimated={handleAnimated}
              />
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>아직 대화가 없어요.</Text>}
        />

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShareLatestRecord}>
            <Text style={styles.shareBtnText}>🏊</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="메시지 보내기"
            placeholderTextColor={colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      </View>

      <Modal visible={memberModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>멤버 ({Object.keys(members).length})</Text>
            <FlatList
              data={Object.values(members)}
              keyExtractor={(m) => m.id}
              style={styles.memberList}
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>
                      {item.nicknameKo}
                      {item.id === myId ? ' (나)' : ''}
                    </Text>
                    {item.id === ownerId && <Text style={styles.ownerCrown}>👑</Text>}
                  </View>
                  {isOwner && item.id !== myId && (
                    <View style={styles.memberActions}>
                      <TouchableOpacity onPress={() => handleTransfer(item)}>
                        <Text style={styles.memberActionText}>위임</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleKick(item)}>
                        <Text style={styles.memberActionTextDanger}>강퇴</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            />
            <View style={styles.inviteRow}>
              <TouchableOpacity
                style={styles.inviteActionBtn}
                onPress={() => {
                  setMemberModal(false);
                  openInviteModal();
                }}
              >
                <Text style={styles.inviteActionBtnText}>+ 수친 추가</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.inviteActionBtn} onPress={handleShareInviteLink}>
                <Text style={styles.inviteActionBtnText}>초대 링크 보내기</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
              <Text style={styles.leaveBtnText}>{roomLabel}방 나가기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setMemberModal(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={inviteModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>수친 초대</Text>
            <FlatList
              data={invitableFriends}
              keyExtractor={(f) => f.id}
              style={styles.memberList}
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  <Text style={styles.memberName}>{item.nicknameKo}</Text>
                  <TouchableOpacity
                    style={styles.inviteFriendBtn}
                    onPress={() => handleInviteFriend(item)}
                    disabled={invitingId === item.id}
                  >
                    {invitingId === item.id ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.inviteFriendBtnText}>초대</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>초대할 수 있는 수친이 없어요 (이미 다 들어와 있어요).</Text>
              }
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setInviteModal(false)}>
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  headerTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  headerAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    marginRight: spacing.hairline,
  },
  // 아래쪽을 넉넉히 비워둬야 마지막 말풍선 밑에서 피어나는 공기방울이 잘리지 않는다.
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.hairline },
  bubbleRow: { marginBottom: spacing.hairline, alignItems: 'flex-start' },
  bubbleRowMine: { alignItems: 'flex-end' },
  sender: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  bubble: {
    maxWidth: '78%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline + 2,
  },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleText: { fontFamily: fonts.regular, color: colors.text, fontSize: 14 },
  bubbleTextMine: { color: colors.white },
  shareLabel: { fontFamily: fonts.semibold, fontSize: 12, marginBottom: 2 },
  empty: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.hairline + 4,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: { fontSize: 18 },
  textInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 4,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  sendBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  sendBtnText: { fontFamily: fonts.semibold, color: colors.white },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,42,74,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
  memberList: { maxHeight: 260 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.hairline + 4,
  },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.hairline },
  memberName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 14 },
  ownerCrown: { fontSize: 13 },
  memberActions: { flexDirection: 'row', gap: spacing.sm },
  memberActionText: { fontFamily: fonts.semibold, color: colors.blueSea, fontSize: 12 },
  memberActionTextDanger: { fontFamily: fonts.semibold, color: '#D96C6C', fontSize: 12 },
  inviteRow: { flexDirection: 'row', gap: spacing.hairline, marginTop: spacing.sm },
  inviteActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.hairline + 4,
    backgroundColor: colors.cardSoft,
    borderRadius: radius.pill,
  },
  inviteActionBtnText: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 13 },
  inviteFriendBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    minWidth: 52,
    alignItems: 'center',
  },
  inviteFriendBtnText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 12 },
  leaveBtn: { alignItems: 'center', paddingVertical: spacing.xs, marginTop: spacing.sm },
  leaveBtnText: { fontFamily: fonts.semibold, color: '#D96C6C', fontSize: 13 },
  modalClose: { alignItems: 'center', paddingVertical: spacing.hairline + 4 },
  modalCloseText: { fontFamily: fonts.semibold, color: colors.textMuted },
});
