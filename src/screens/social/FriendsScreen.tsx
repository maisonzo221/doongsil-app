import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  PanResponder,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Contacts from 'expo-contacts';
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
import { toggleFavoriteFriend, useFavoriteFriendIds } from '../../storage/favoriteFriends';
import { AddFriendIcon, ChevronIcon, GearIcon, SearchIcon, StarIcon } from '../../components/icons/TabIcons';

type Props = NativeStackScreenProps<FriendsStackParamList, 'FriendsHome'>;

const UNCATEGORIZED = '미분류';

type SubTab = 'friends' | 'sutok' | 'toktok';
const SUB_TAB_LABEL: Record<SubTab, string> = { friends: '친구', sutok: '수톡', toktok: '톡톡' };
const SUB_TAB_ORDER: SubTab[] = ['friends', 'sutok', 'toktok'];

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const favoriteIds = useFavoriteFriendIds();

  // 카카오톡처럼: 즐겨찾는 친구 → (분류별) 친구 순서로, 제목 옆에 인원수를 보여주고 접었다 펼 수 있다.
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? friends.filter((f) => f.nicknameKo.toLowerCase().includes(q) || f.nicknameEn.toLowerCase().includes(q))
      : friends;
    const favSet = new Set(favoriteIds);
    const sortByName = (arr: Friend[]) => [...arr].sort((a, b) => compareFriendNames(a.nicknameKo, b.nicknameKo));
    const favs = list.filter((f) => favSet.has(f.id));
    const byCategory = new Map<string, Friend[]>();
    for (const f of list) {
      if (favSet.has(f.id)) continue;
      const key = f.category?.trim() || UNCATEGORIZED;
      const arr = byCategory.get(key) ?? [];
      arr.push(f);
      byCategory.set(key, arr);
    }
    const entries = Array.from(byCategory.entries()).sort(([a], [b]) => {
      if (a === UNCATEGORIZED) return -1; // 분류 없는 친구("친구")를 맨 위에
      if (b === UNCATEGORIZED) return 1;
      return a.localeCompare(b);
    });
    const out: { key: string; title: string; count: number; data: Friend[] }[] = [];
    if (favs.length > 0) out.push({ key: '__fav', title: '즐겨찾는 친구', count: favs.length, data: sortByName(favs) });
    for (const [title, data] of entries) {
      out.push({ key: title, title: title === UNCATEGORIZED ? '친구' : title, count: data.length, data: sortByName(data) });
    }
    return out.map((sec) => ({ ...sec, data: collapsed.has(sec.key) ? [] : sec.data }));
  }, [friends, favoriteIds, query, collapsed]);

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
  const [contactsPermissionGranted, setContactsPermissionGranted] = useState(false);

  // 수친 추가 모달을 열 때마다, 연락처 접근 권한이 이미 허용돼 있으면 버튼을 또
  // 누르게 하지 않고 바로 목록을 보여준다 — 권한이 없을 때만 아래 버튼으로 요청한다.
  useEffect(() => {
    if (!addModal) return;
    (async () => {
      const { status } = await Contacts.getPermissionsAsync();
      const granted = status === 'granted';
      setContactsPermissionGranted(granted);
      if (granted) {
        setLoadingContacts(true);
        try {
          setMatched(await findRegisteredContacts());
        } finally {
          setLoadingContacts(false);
        }
      }
    })();
  }, [addModal]);

  async function handleFindContacts() {
    setLoadingContacts(true);
    try {
      const { granted } = await syncContacts();
      if (!granted) {
        Alert.alert('연락처 접근 필요', '설정에서 연락처 접근을 허용해주세요.');
        return;
      }
      setContactsPermissionGranted(true);
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
    try {
      await Promise.all(Array.from(selected).map((id) => addFriendById(id)));
      setSelected(new Set());
      setMatched([]);
      setAddModal(false);
      await reload();
    } catch {
      Alert.alert('추가 실패', '잠시 후 다시 시도해주세요.');
    }
  }

  async function handleAddByCode() {
    if (!inviteCodeDraft.trim()) return;
    try {
      const result = await addFriendByInviteCode(inviteCodeDraft.trim());
      if (!result.ok) {
        Alert.alert('추가 실패', '가입 코드를 다시 확인해주세요.');
        return;
      }
      setInviteCodeDraft('');
      setAddModal(false);
      await reload();
      Alert.alert('추가 완료', `${result.nickname}님을 수친으로 추가했어요.`);
    } catch {
      Alert.alert('추가 실패', '잠시 후 다시 시도해주세요.');
    }
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

  // 친구/수톡/톡톡 탭 화면에서만 좌우로 밀어서 탭을 넘길 수 있게 한다(채팅방
  // 안으로 들어가면 이 화면 자체가 안 떠 있으니 자연히 적용 안 됨). 세로 스크롤과
  // 헷갈리지 않게, 가로로 뚜렷하게 민 경우에만(세로보다 2배 이상) 반응한다.
  const subTabRef = useRef(subTab);
  subTabRef.current = subTab;
  const tabPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 24 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 2,
      onPanResponderRelease: (_, gesture) => {
        const currentIndex = SUB_TAB_ORDER.indexOf(subTabRef.current);
        if (gesture.dx < -40 && currentIndex < SUB_TAB_ORDER.length - 1) {
          setSubTab(SUB_TAB_ORDER[currentIndex + 1]);
        } else if (gesture.dx > 40 && currentIndex > 0) {
          setSubTab(SUB_TAB_ORDER[currentIndex - 1]);
        }
      },
    })
  ).current;

  const favSetForRender = new Set(favoriteIds);

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        {/* 카카오톡처럼: 내 프로필(왼쪽) + 검색 · 친구추가 · 설정(오른쪽) */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.meWrap}
            activeOpacity={0.7}
            onPress={() => {
              if (!me) return;
              setNicknameKoDraft(me.nicknameKo);
              setNicknameEnDraft(me.nicknameEn);
              setNicknameModal(true);
            }}
          >
            <View style={styles.meAvatar}>
              <Text style={styles.meAvatarText}>{(me?.nicknameKo ?? '나').slice(0, 1)}</Text>
            </View>
            <View style={styles.meBody}>
              <Text style={styles.meName} numberOfLines={1}>
                {me?.nicknameKo ?? '수친'}
              </Text>
              {me?.inviteCode ? <Text style={styles.meCode}>내 가입 코드 {me.inviteCode}</Text> : null}
            </View>
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <TouchableOpacity hitSlop={8} onPress={() => setSearchOpen((v) => !v)} accessibilityLabel="친구 검색">
              <SearchIcon color={colors.text} size={26} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} onPress={() => setAddModal(true)} accessibilityLabel="수친 추가">
              <AddFriendIcon color={colors.text} size={26} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} onPress={() => navigation.navigate('Settings')} accessibilityLabel="설정">
              <GearIcon color={colors.text} size={26} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabRow}>
          {(Object.keys(SUB_TAB_LABEL) as SubTab[]).map((t) => (
            <TouchableOpacity key={t} style={[styles.tabBtn, subTab === t && styles.tabBtnActive]} onPress={() => setSubTab(t)}>
              <Text style={[styles.tabText, subTab === t && styles.tabTextActive]}>{SUB_TAB_LABEL[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 수톡 탭에서는 방을 밀어서 나가는 동작과 겹치므로, 좌우로 밀어 탭을 넘기는 기능을 끈다. */}
        <View style={styles.flex} {...(subTab === 'sutok' ? {} : tabPanResponder.panHandlers)}>
          {subTab === 'sutok' ? (
            <GroupsScreen kind="sutok" navigation={navigation} />
          ) : subTab === 'toktok' ? (
            <GroupsScreen kind="toktok" navigation={navigation} />
          ) : disabled ? (
            <View style={styles.disabledNotice}>
              <Text style={styles.disabledText}>수친 기능은 Apple 로그인 계정에서만 사용할 수 있어요.</Text>
            </View>
          ) : (
            <>
              {searchOpen && (
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="이름으로 친구 찾기"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              )}
              <SectionList
                sections={sections}
                keyExtractor={(f) => f.id}
                contentContainerStyle={styles.list}
                stickySectionHeadersEnabled={false}
                renderSectionHeader={({ section }) => (
                  <TouchableOpacity style={styles.sectionHeader} activeOpacity={0.7} onPress={() => toggleCollapsed(section.key)}>
                    <Text style={styles.sectionHeaderText}>
                      {section.title} <Text style={styles.sectionCount}>{section.count}</Text>
                    </Text>
                    <ChevronIcon color={colors.textMuted} size={22} up={!collapsed.has(section.key)} />
                  </TouchableOpacity>
                )}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.friendRow} activeOpacity={0.7} onPress={() => openCategoryModal(item)}>
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>{item.nicknameKo.slice(0, 1)}</Text>
                    </View>
                    <View style={styles.friendBody}>
                      <Text style={styles.friendName}>{item.nicknameKo}</Text>
                      <Text style={styles.friendNote}>{item.nicknameEn}</Text>
                    </View>
                    <TouchableOpacity hitSlop={10} onPress={() => toggleFavoriteFriend(item.id)} accessibilityLabel="즐겨찾기">
                      <StarIcon color={favSetForRender.has(item.id) ? '#F5B301' : colors.border} size={24} filled={favSetForRender.has(item.id)} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.empty}>
                    {query ? '찾는 친구가 없어요.' : '아직 수친이 없어요. 오른쪽 위 + 아이콘으로 연락처나 가입 코드로 추가해보세요.'}
                  </Text>
                }
              />
            </>
          )}
        </View>
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
              {loadingContacts && matched.length === 0 && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleFindContacts}>
                {loadingContacts ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.secondaryBtnText}>
                    {contactsPermissionGranted ? '다시 찾기' : '연락처에서 가입자 찾기'}
                  </Text>
                )}
              </TouchableOpacity>

              {contactsPermissionGranted && !loadingContacts && matched.length === 0 && (
                <Text style={styles.matchEmpty}>
                  연락처 중 둥실에 가입한 사람이 아직 없어요. 상대방도 설정에서 전화번호를
                  등록해야 찾을 수 있어요.
                </Text>
              )}
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
  flex: { flex: 1 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  settingsIcon: { fontSize: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  meWrap: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  meAvatar: { width: 46, height: 46, borderRadius: 17, backgroundColor: colors.aqua, alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs },
  meAvatarText: { color: colors.white, fontFamily: fonts.bold, fontSize: 18 },
  meBody: { flex: 1 },
  meName: { fontFamily: fonts.bold, color: colors.text, fontSize: 21 },
  meCode: { fontFamily: fonts.regular, color: colors.blueSea, fontSize: 11, marginTop: 1 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tabRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  tabBtn: { paddingHorizontal: spacing.md, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.card },
  tabBtnActive: { backgroundColor: colors.deepSea },
  tabText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 14 },
  tabTextActive: { color: colors.white },
  searchInput: { backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, marginBottom: spacing.xs, fontFamily: fonts.regular, color: colors.text },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs + 2, marginTop: spacing.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  sectionHeaderText: { fontFamily: fonts.bold, color: colors.text, fontSize: 14 },
  sectionCount: { color: colors.textMuted, fontFamily: fonts.semibold },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  friendAvatar: { width: 52, height: 52, borderRadius: 19, backgroundColor: colors.cardSoft, alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs + 4 },
  friendAvatarText: { color: colors.blueSea, fontFamily: fonts.bold, fontSize: 19 },
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
    backgroundColor: colors.primary,
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
    backgroundColor: 'rgba(11,42,74,0.4)',
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
  loadingRow: { alignItems: 'center', paddingVertical: spacing.sm },
  matchEmpty: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.xs,
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
