import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, radius, spacing } from '../../theme';
import { FriendsStackParamList, RoomKind } from '../../navigation/socialTypes';
import {
  ChatGroup,
  createGroup,
  Friend,
  getFriends,
  getGroupById,
  getGroups,
  inviteLinkFor,
  joinGroupByInviteCode,
} from '../../storage/social';
import { getCurrentUser, UserProfile } from '../../storage/auth';

interface Props {
  kind: RoomKind;
  navigation: NativeStackNavigationProp<FriendsStackParamList>;
}

const KIND_LABEL: Record<RoomKind, string> = { sutok: '수톡', toktok: '톡톡' };
const KIND_DESC: Record<RoomKind, string> = {
  sutok: '자유롭게 대화하는 오픈채팅방이에요.',
  toktok: '수영 관련 모임을 만들고 운영하는 방이에요.',
};

export default function GroupsScreen({ kind, navigation }: Props) {
  const label = KIND_LABEL[kind];
  const [me, setMe] = useState<UserProfile | null>(null);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());
  const [joinCodeDraft, setJoinCodeDraft] = useState('');

  const reload = useCallback(async () => {
    const [user, groupList] = await Promise.all([getCurrentUser(), getGroups(kind)]);
    setMe(user);
    setGroups(groupList);
  }, [kind]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const disabled = !me || me.provider !== 'apple';

  async function openCreateModal() {
    setFriends(await getFriends());
    setNameDraft('');
    setSelectedFriends(new Set());
    setCreateModal(true);
  }

  function toggleFriend(id: string) {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateGroup() {
    if (!nameDraft.trim() || !me) return;
    const groupId = await createGroup(nameDraft.trim(), Array.from(selectedFriends), kind);
    setCreateModal(false);
    await reload();
    navigation.navigate('ChatRoom', { groupId, groupName: nameDraft.trim(), ownerId: me.id, roomKind: kind });
  }

  async function handleShareInvite(group: ChatGroup) {
    const link = inviteLinkFor(group.inviteCode);
    await Share.share({
      message: `둥실 ${label} "${group.name}"에 초대할게요!\n${link}\n(또는 앱에서 코드 ${group.inviteCode} 입력)`,
    });
  }

  const joinWithCode = useCallback(
    async (code: string) => {
      try {
        const groupId = await joinGroupByInviteCode(code);
        setJoinModal(false);
        setJoinCodeDraft('');
        await reload();
        const joined = await getGroupById(groupId);
        navigation.navigate('ChatRoom', {
          groupId,
          groupName: joined?.name ?? label,
          ownerId: joined?.ownerId ?? '',
          roomKind: joined?.roomKind ?? kind,
        });
      } catch (e: any) {
        if (e?.message?.includes('banned_from_group')) {
          Alert.alert('참여 불가', `방장에 의해 강퇴된 ${label}방이에요.`);
        } else {
          Alert.alert('참여 실패', '초대 코드를 다시 확인해주세요.');
        }
      }
    },
    [navigation, reload, kind, label]
  );

  async function handleJoinByCode() {
    if (!joinCodeDraft.trim()) return;
    await joinWithCode(joinCodeDraft.trim());
  }

  return (
    <View style={styles.container}>
      <Text style={styles.description}>{KIND_DESC[kind]}</Text>

      {disabled ? (
        <View style={styles.disabledNotice}>
          <Text style={styles.disabledText}>{label} 기능은 Apple 로그인 계정에서만 사용할 수 있어요.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.addRow} onPress={openCreateModal}>
                <Text style={styles.addRowText}>+ {label} 만들기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addRow} onPress={() => setJoinModal(true)}>
                <Text style={styles.addRowText}>코드로 참여</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.groupCard}>
              <TouchableOpacity
                style={styles.groupMain}
                onPress={() =>
                  navigation.navigate('ChatRoom', {
                    groupId: item.id,
                    groupName: item.name,
                    ownerId: item.ownerId,
                    roomKind: kind,
                  })
                }
              >
                <View style={styles.groupNameRow}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  {item.ownerId === me?.id && <Text style={styles.ownerCrown}>👑</Text>}
                </View>
                <Text style={styles.groupCode}>코드: {item.inviteCode}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.shareBtn} onPress={() => handleShareInvite(item)}>
                <Text style={styles.shareBtnText}>초대 링크 공유</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>아직 {label}이 없어요.</Text>}
        />
      )}

      {/* 만들기 */}
      <Modal visible={createModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{label} 만들기</Text>
            <TextInput
              style={styles.input}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder={kind === 'toktok' ? '모임 이름 (예: 토요일 자유형 모임)' : '수톡 이름 (예: 수요일 자유수영팟)'}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.sectionLabel}>수친 초대 (선택)</Text>
            <FlatList
              data={friends}
              keyExtractor={(f) => f.id}
              style={styles.friendPickList}
              renderItem={({ item }) => {
                const isSelected = selectedFriends.has(item.id);
                return (
                  <TouchableOpacity
                    style={[styles.matchRow, isSelected && styles.matchRowSelected]}
                    onPress={() => toggleFriend(item.id)}
                  >
                    <Text style={styles.matchName}>{item.nicknameKo}</Text>
                    <Text style={styles.matchCheck}>{isSelected ? '✓' : ''}</Text>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>수친을 먼저 추가해보세요.</Text>}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCreateModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCreateGroup}>
                <Text style={styles.modalConfirmText}>만들기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 코드로 참여 */}
      <Modal visible={joinModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>초대 코드로 참여</Text>
            <TextInput
              style={styles.input}
              value={joinCodeDraft}
              onChangeText={setJoinCodeDraft}
              placeholder="예: 7QK3XZAB"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setJoinModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleJoinByCode}>
                <Text style={styles.modalConfirmText}>참여하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  description: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  disabledNotice: { padding: spacing.lg, alignItems: 'center' },
  disabledText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  actionRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.xs },
  addRow: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addRowText: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 13 },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginBottom: spacing.hairline + 4,
    overflow: 'hidden',
  },
  groupMain: { padding: spacing.sm },
  groupNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.hairline },
  groupName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  ownerCrown: { fontSize: 13 },
  groupCode: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  shareBtn: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  shareBtnText: { fontFamily: fonts.semibold, color: colors.blueSea, fontSize: 13 },
  empty: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,51,88,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
  sectionLabel: { fontFamily: fonts.bold, color: colors.text, fontSize: 13, marginBottom: spacing.xs },
  friendPickList: { maxHeight: 180, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 4,
    marginBottom: spacing.hairline + 4,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.hairline + 4,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
  },
  matchRowSelected: { backgroundColor: colors.cardSoft },
  matchName: { fontFamily: fonts.semibold, color: colors.text, flex: 1 },
  matchCheck: { fontFamily: fonts.bold, color: colors.primary, width: 18 },
  modalRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  modalCancel: { flex: 1, alignItems: 'center', paddingVertical: spacing.hairline + 4 },
  modalCancelText: { fontFamily: fonts.semibold, color: colors.textMuted },
  modalConfirm: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.hairline + 4,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  modalConfirmText: { fontFamily: fonts.semibold, color: colors.white },
});
