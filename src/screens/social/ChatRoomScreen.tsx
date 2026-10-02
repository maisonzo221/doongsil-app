import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../../components/ScreenBackground';
import { colors, fonts, radius, spacing } from '../../theme';
import { FriendsStackParamList } from '../../navigation/socialTypes';
import {
  ChatMessage,
  Friend,
  ProfanityBlockedError,
  getGroupMembers,
  getMessages,
  kickMember,
  leaveGroup,
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

  const isOwner = !!myId && myId === ownerId;

  const reload = useCallback(async () => {
    const [user, memberList, messageList] = await Promise.all([
      getCurrentUser(),
      getGroupMembers(groupId),
      getMessages(groupId),
    ]);
    setMyId(user?.id ?? null);
    setMembers(Object.fromEntries(memberList.map((m) => [m.id, m])));
    setMessages(messageList);
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => setMemberModal(true)}>
          <Text style={styles.headerAction}>멤버</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(groupId, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    });
    return unsubscribe;
  }, [groupId]);

  async function handleSend() {
    if (!draft.trim()) return;
    try {
      await sendTextMessage(groupId, draft.trim());
      setDraft('');
    } catch (e) {
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
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{groupName}</Text>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.senderId === myId;
            return (
              <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                {!mine && <Text style={styles.sender}>{nicknameFor(item.senderId)}</Text>}
                <View style={[styles.bubble, mine && styles.bubbleMine]}>
                  {item.type === 'text' && (
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
                  )}
                  {item.type === 'record_share' && (
                    <View>
                      <Text style={[styles.shareLabel, mine && styles.bubbleTextMine]}>
                        🏊 수영 기록 공유
                      </Text>
                      <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                        {item.sharedSummary}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
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
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Text style={styles.sendBtnText}>전송</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
              <Text style={styles.leaveBtnText}>{roomLabel}방 나가기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setMemberModal(false)}>
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
  headerAction: { fontFamily: fonts.semibold, color: colors.blueSea, fontSize: 14, marginRight: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: spacing.hairline },
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
    backgroundColor: 'rgba(10,51,88,0.4)',
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
  leaveBtn: { alignItems: 'center', paddingVertical: spacing.xs, marginTop: spacing.sm },
  leaveBtnText: { fontFamily: fonts.semibold, color: '#D96C6C', fontSize: 13 },
  modalClose: { alignItems: 'center', paddingVertical: spacing.hairline + 4 },
  modalCloseText: { fontFamily: fonts.semibold, color: colors.textMuted },
});
