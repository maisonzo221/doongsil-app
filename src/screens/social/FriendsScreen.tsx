import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../../components/ScreenBackground';
import GroupsScreen from './GroupsScreen';
import { colors, fonts, radius, spacing } from '../../theme';
import { FriendsStackParamList } from '../../navigation/socialTypes';
import {
  addFriendByInviteCode,
  addFriendById,
  Friend,
  findRegisteredContacts,
  getFriends,
  getGroupById,
  joinGroupByInviteCode,
  MatchedContact,
  updateFriendCategory,
} from '../../storage/social';
import { getCurrentUser, syncContacts, updateNicknames, UserProfile } from '../../storage/auth';

type Props = NativeStackScreenProps<FriendsStackParamList, 'FriendsHome'>;

const UNCATEGORIZED = '미분류';

type SubTab = 'friends' | 'sutok' | 'toktok';
const SUB_TAB_LABEL: Record<SubTab, string> = { friends: '친구', sutok: '수톡', toktok: '톡톡' };

// 한글(가나다) -> 영문 알파벳 -> 숫자 -> 그 외 순서로 묶어서 정렬한다.
function charClass(ch: string | undefined): number {
  if (!ch) return 3;
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(ch)) return 0;
  if (/[a-zA-Z]/.test(ch)) return 1;
  if (/[0-9]/.test(ch)) return 2;
  return 3;
}

function compareFriendNames(a: string, b: string): number {
  const diff = charClass(a.charAt(0)) - charClass(b.charAt(0));
  if (diff !== 0) return diff;
  return a.localeCompare(b, 'ko');
}

export default function FriendsScreen({ navigation, route }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('friends');
  const [me, setMe] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [nicknameModal, setNicknameModal] = useState(false);
  const [nicknameKoDraft, setNicknameKoDraft] = useState('');
  const [nicknameEnDraft, setNicknameEnDraft] = useState('');

  const [matched, setMatched] = useState<MatchedContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [inviteCodeDraft, setInviteCodeDraft] = useState('');
  const [categoryTarget, setCategoryTarget] = useState<Friend | null>(null);
  const [categoryDraft, setCategoryDraft] = useState('');

  const sections = useMemo(() => {
    const byCategory = new Map<string, Friend[]>();
    for (const f of friends) {
      const key = f.category?.trim() || UNCATEGORIZED;
      const list = byCategory.get(key) ?? [];
      list.push(f);
      byCategory.set(key, list);
    }
    const entries = Array.from(byCategory.entries()).sort(([a], [b]) => {
      if (a === UNCATEGORIZED) return 1;
      if (b === UNCATEGORIZED) return -1;
      return a.localeCompare(b);
    });
    return entries.map(([title, data]) => ({
      title,
      data: [...data].sort((a, b) => compareFriendNames(a.nicknameKo, b.nicknameKo)),
    }));
  }, [friends]);

  const existingCategories = useMemo(
    () =>
      Array.from(new Set(friends.map((f) => f.category?.trim()).filter((c): c is string => !!c))),
    [friends]
  );

  const reload = useCallback(async () => {
    const [user, friendList] = await Promise.all([getCurrentUser(), getFriends()]);
    setMe(user);
    setFriends(friendList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // 초대 링크(doongsil://invite/CODE)로 열렸을 때 자동으로 수톡/톡톡 참여를 시도한다.
  useEffect(() => {
    const code = route.params?.code;
    if (!code) return;
    (async () => {
      try {
        const groupId = await joinGroupByInviteCode(code);
        const joined = await getGroupById(groupId);
        navigation.setParams({ code: undefined });
        navigation.navigate('ChatRoom', {
          groupId,
          groupName: joined?.name ?? '수톡',
          ownerId: joined?.ownerId ?? '',
          roomKind: joined?.roomKind ?? 'sutok',
        });
      } catch (e: any) {
        navigation.setParams({ code: undefined });
        if (e?.message?.includes('banned_from_group')) {
          Alert.alert('참여 불가', '방장에 의해 강퇴된 방이에요.');
        } else {
          Alert.alert('참여 실패', '초대 코드를 다시 확인해주세요.');
        }
      }
    })();
  }, [route.params?.code, navigation]);

  const disabled = !me || me.provider !== 'apple';

  async function handleFindContacts() {
    setLoadingContacts(true);
    try {
      const { granted } = await syncContacts();
      if (!granted) {
        Alert.alert('연락처 접근 필요', '설정에서 연락처 접근을 허용해주세요.');
        return;
      }
      const results = await findRegisteredContacts();
      setMatched(results);
    } finally {
      setLoadingContacts(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddSelected() {
    await Promise.all(Array.from(selected).map((id) => addFriendById(id)));
    setSelected(new Set());
    setMatched([]);
    setAddModal(false);
    await reload();
  }

  async function handleAddByCode() {
    if (!inviteCodeDraft.trim()) return;
    const result = await addFriendByInviteCode(inviteCodeDraft.trim());
    if (!result.ok) {
      Alert.alert('추가 실패', '가입 코드를 다시 확인해주세요.');
      return;
    }
    setInviteCodeDraft('');
    setAddModal(false);
    await reload();
    Alert.alert('추가 완료', `${result.nickname}님을 수친으로 추가했어요.`);
  }

  async function handleSaveNicknames() {
    await updateNicknames(nicknameKoDraft.trim(), nicknameEnDraft.trim());
    setNicknameModal(false);
    await reload();
  }

  function openCategoryModal(friend: Friend) {
    setCategoryTarget(friend);
    setCategoryDraft(friend.category ?? '');
  }

  async function handleSaveCategory() {
    if (!categoryTarget) return;
    await updateFriendCategory(categoryTarget.id, categoryDraft.trim() || null);
    setCategoryTarget(null);
    await reload();
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>수친</Text>

        <View style={styles.tabRow}>
          {(Object.keys(SUB_TAB_LABEL) as SubTab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, subTab === t && styles.tabBtnActive]}
              onPress={() => setSubTab(t)}
            >
              <Text style={[styles.tabText, subTab === t && styles.tabTextActive]}>
                {SUB_TAB_LABEL[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {subTab === 'sutok' ? (
          <GroupsScreen kind="sutok" navigation={navigation} />
        ) : subTab === 'toktok' ? (
          <GroupsScreen kind="toktok" navigation={navigation} />
        ) : (
          <>
            {me && (
              <TouchableOpacity
                style={styles.profileCard}
                onPress={() => {
                  setNicknameKoDraft(me.nicknameKo);
                  setNicknameEnDraft(me.nicknameEn);
                  setNicknameModal(true);
                }}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{me.nicknameKo.slice(0, 1)}</Text>
                </View>
                <View style={styles.profileBody}>
                  <Text style={styles.profileName}>{me.nicknameKo} · {me.nicknameEn}</Text>
                  {me.inviteCode ? (
                    <Text style={styles.profileCode}>내 가입 코드: {me.inviteCode}</Text>
                  ) : (
                    <Text style={styles.profileCode}>Apple 로그인하면 가입 코드가 생겨요</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {disabled ? (
              <View style={styles.disabledNotice}>
                <Text style={styles.disabledText}>
                  수친 기능은 Apple 로그인 계정에서만 사용할 수 있어요.
                </Text>
              </View>
            ) : (
              <SectionList
                sections={sections}
                keyExtractor={(f) => f.id}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                  <TouchableOpacity style={styles.addRow} onPress={() => setAddModal(true)}>
                    <Text style={styles.addRowText}>+ 수친 추가하기</Text>
                  </TouchableOpacity>
                }
                renderSectionHeader={({ section }) => (
                  <Text style={styles.categoryHeader}>{section.title}</Text>
                )}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.friendCard} onPress={() => openCategoryModal(item)}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.nicknameKo.slice(0, 1)}</Text>
                    </View>
                    <View style={styles.friendBody}>
                      <Text style={styles.friendName}>{item.nicknameKo}</Text>
                      <Text style={styles.friendNote}>{item.nicknameEn}</Text>
                    </View>
                    <Text style={styles.categoryEditHint}>분류</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.empty}>아직 수친이 없어요. 연락처나 가입 코드로 추가해보세요.</Text>
                }
              />
            )}
          </>
        )}
      </View>

      {/* 닉네임 수정 모달 */}
      <Modal visible={nicknameModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>닉네임 설정</Text>
            <Text style={styles.modalLabel}>한글 닉네임</Text>
            <TextInput
              style={styles.input}
              value={nicknameKoDraft}
              onChangeText={setNicknameKoDraft}
              placeholder="예: 물개"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.modalLabel}>영문 닉네임</Text>
            <TextInput
              style={styles.input}
              value={nicknameEnDraft}
              onChangeText={setNicknameEnDraft}
              placeholder="e.g. Seal"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setNicknameModal(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveNicknames}>
                <Text style={styles.modalConfirmText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 친구 분류 모달 */}
      <Modal visible={!!categoryTarget} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{categoryTarget?.nicknameKo} 분류</Text>
            {existingCategories.length > 0 && (
              <View style={styles.categoryChipRow}>
                {existingCategories.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.categoryChip, categoryDraft === c && styles.categoryChipActive]}
                    onPress={() => setCategoryDraft(c)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        categoryDraft === c && styles.categoryChipTextActive,
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TextInput
              style={styles.input}
              value={categoryDraft}
              onChangeText={setCategoryDraft}
              placeholder="예: A수영장 수업, 자유 수영 모임"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCategoryTarget(null)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveCategory}>
                <Text style={styles.modalConfirmText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 수친 추가 모달 */}
      <Modal visible={addModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.modalCardTall]}>
            <ScrollView>
              <Text style={styles.modalTitle}>수친 추가</Text>

              <Text style={styles.sectionLabel}>연락처에서 찾기</Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleFindContacts}>
                {loadingContacts ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.secondaryBtnText}>연락처에서 가입자 찾기</Text>
                )}
              </TouchableOpacity>

              {matched.map((c) => {
                const isSelected = selected.has(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.matchRow, isSelected && styles.matchRowSelected]}
                    onPress={() => toggleSelect(c.id)}
                  >
                    <Text style={styles.matchName}>{c.contactName}</Text>
                    <Text style={styles.matchNickname}>{c.nicknameKo}</Text>
                    <Text style={styles.matchCheck}>{isSelected ? '✓' : ''}</Text>
                  </TouchableOpacity>
                );
              })}
              {matched.length > 0 && (
                <TouchableOpacity style={styles.modalConfirm} onPress={handleAddSelected}>
                  <Text style={styles.modalConfirmText}>선택한 친구 추가 ({selected.size})</Text>
                </TouchableOpacity>
              )}

              <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>가입 코드로 추가</Text>
              <TextInput
                style={styles.input}
                value={inviteCodeDraft}
                onChangeText={setInviteCodeDraft}
                placeholder="예: 7QK3XZ"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleAddByCode}>
                <Text style={styles.secondaryBtnText}>코드로 추가</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalCancel} onPress={() => setAddModal(false)}>
                <Text style={styles.modalCancelText}>닫기</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, marginBottom: spacing.sm },
  tabRow: { flexDirection: 'row', gap: spacing.hairline, marginBottom: spacing.sm },
  tabBtn: { flex: 1, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.card, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 12 },
  tabTextActive: { color: colors.white },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  profileBody: { flex: 1 },
  profileName: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  profileCode: { fontFamily: fonts.regular, color: colors.blueSea, fontSize: 12, marginTop: 2 },
  disabledNotice: { padding: spacing.lg, alignItems: 'center' },
  disabledText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
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
  categoryHeader: {
    fontFamily: fonts.bold,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.hairline,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.hairline + 4,
  },
  categoryEditHint: { fontFamily: fonts.semibold, color: colors.blueSea, fontSize: 12 },
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
  modalCardTall: { maxHeight: '80%' },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
  modalLabel: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 12, marginBottom: 4 },
  sectionLabel: { fontFamily: fonts.bold, color: colors.text, fontSize: 13, marginBottom: spacing.xs },
  sectionLabelSpaced: { marginTop: spacing.md },
  categoryChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.hairline,
    marginBottom: spacing.xs,
  },
  categoryChip: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline,
  },
  categoryChipActive: { backgroundColor: colors.primary },
  categoryChipText: { fontFamily: fonts.semibold, color: colors.text, fontSize: 12 },
  categoryChipTextActive: { color: colors.white },
  input: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 4,
    marginBottom: spacing.hairline + 4,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  secondaryBtn: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  secondaryBtnText: { fontFamily: fonts.semibold, color: colors.primary },
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
  matchNickname: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginRight: spacing.xs },
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
    marginTop: spacing.xs,
  },
  modalConfirmText: { fontFamily: fonts.semibold, color: colors.white },
});
