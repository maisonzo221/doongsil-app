import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
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
import { SocialStackParamList } from '../../navigation/socialTypes';
import {
  addFriend,
  createGroup,
  ChatGroup,
  getFriends,
  getGroups,
  seedSocialDemoDataIfEmpty,
  SwimFriend,
} from '../../storage/social';

type Props = NativeStackScreenProps<SocialStackParamList, 'SwimFriendsHome'>;

type Tab = 'friends' | 'groups';

export default function SwimFriendsScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<SwimFriend[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  const reload = useCallback(async () => {
    await seedSocialDemoDataIfEmpty();
    setFriends(await getFriends());
    setGroups(await getGroups());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function handleAddFriend() {
    if (!nameDraft.trim()) return;
    await addFriend(nameDraft.trim(), noteDraft.trim() || undefined);
    setNameDraft('');
    setNoteDraft('');
    setAddModal(false);
    setFriends(await getFriends());
  }

  async function handleCreateGroupFromFriend(friend: SwimFriend) {
    const group = await createGroup(`${friend.name}과의 수모임`, [friend.name]);
    setGroups(await getGroups());
    navigation.navigate('ChatRoom', { groupId: group.id, groupName: group.name });
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>수친</Text>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'friends' && styles.tabBtnActive]}
            onPress={() => setTab('friends')}
          >
            <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>친구</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'groups' && styles.tabBtnActive]}
            onPress={() => setTab('groups')}
          >
            <Text style={[styles.tabText, tab === 'groups' && styles.tabTextActive]}>수모임</Text>
          </TouchableOpacity>
        </View>

        {tab === 'friends' ? (
          <FlatList
            data={friends}
            keyExtractor={(f) => f.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <TouchableOpacity style={styles.addRow} onPress={() => setAddModal(true)}>
                <Text style={styles.addRowText}>+ 수친 추가하기</Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.friendCard}
                onPress={() => handleCreateGroupFromFriend(item)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.friendBody}>
                  <Text style={styles.friendName}>{item.name}</Text>
                  {item.note ? <Text style={styles.friendNote}>{item.note}</Text> : null}
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(g) => g.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.groupCard}
                onPress={() => navigation.navigate('ChatRoom', { groupId: item.id, groupName: item.name })}
              >
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupMembers}>{item.memberNames.join(', ')}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>아직 수모임이 없어요. 수친 목록에서 만들어보세요.</Text>
            }
          />
        )}
      </View>

      <Modal visible={addModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>수친 추가</Text>
            <TextInput
              style={styles.input}
              placeholder="이름"
              placeholderTextColor={colors.textMuted}
              value={nameDraft}
              onChangeText={setNameDraft}
            />
            <TextInput
              style={styles.input}
              placeholder="메모 (예: 자유수영에서 만난 친구)"
              placeholderTextColor={colors.textMuted}
              value={noteDraft}
              onChangeText={setNoteDraft}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAddModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleAddFriend}>
                <Text style={styles.modalConfirmText}>추가</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, marginBottom: spacing.sm },
  tabRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  tabBtn: {
    paddingVertical: spacing.hairline + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSoft,
  },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.semibold, color: colors.textMuted },
  tabTextActive: { color: colors.white },
  list: { paddingBottom: spacing.xl },
  addRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xs,
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addRowText: { fontFamily: fonts.semibold, color: colors.primary },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.hairline + 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  avatarText: { color: colors.white, fontFamily: fonts.bold },
  friendBody: { flex: 1 },
  friendName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  friendNote: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.hairline + 4,
  },
  groupName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  groupMembers: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginTop: 2 },
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
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 4,
    marginBottom: spacing.hairline + 4,
    fontFamily: fonts.regular,
    color: colors.text,
  },
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
