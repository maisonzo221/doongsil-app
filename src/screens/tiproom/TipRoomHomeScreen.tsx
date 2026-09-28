import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../../components/ScreenBackground';
import PoolMapModal from '../../components/PoolMapModal';
import { colors, fonts, radius, spacing } from '../../theme';
import { TipRoomStackParamList } from '../../navigation/tipRoomTypes';
import {
  addPool,
  BOARD_CATEGORIES,
  BoardPost,
  createBoardPost,
  getBoardPosts,
  getPools,
  Pool,
  PoolInput,
} from '../../storage/tipRoom';
import {
  isPoolDataConfigured,
  mapLinkFor,
  OfficialPool,
  registrationSearchLinkFor,
  searchOfficialPools,
} from '../../services/poolData';
import { getCurrentUser, UserProfile } from '../../storage/auth';

type Props = NativeStackScreenProps<TipRoomStackParamList, 'TipRoomHome'>;

type Tab = 'board' | 'pools' | 'freeSwim';

const TAB_LABEL: Record<Tab, string> = {
  board: '자유게시판',
  pools: '수영장 찾기',
  freeSwim: '자유수영',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function TipRoomHomeScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('board');
  const [me, setMe] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [poolSearch, setPoolSearch] = useState('');

  const [postModal, setPostModal] = useState(false);
  const [postCategory, setPostCategory] = useState(BOARD_CATEGORIES[0]);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');

  const [poolModal, setPoolModal] = useState(false);
  const [poolDraft, setPoolDraft] = useState<PoolInput>({ name: '' });

  const [officialPools, setOfficialPools] = useState<OfficialPool[]>([]);
  const [loadingOfficial, setLoadingOfficial] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    if (tab !== 'pools') return;
    if (!poolSearch.trim()) {
      setOfficialPools([]);
      return;
    }
    let cancelled = false;
    setLoadingOfficial(true);
    const timer = setTimeout(() => {
      searchOfficialPools(poolSearch).then((results) => {
        if (!cancelled) {
          setOfficialPools(results);
          setLoadingOfficial(false);
        }
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tab, poolSearch]);

  const reload = useCallback(async () => {
    const [user, postList, poolList] = await Promise.all([getCurrentUser(), getBoardPosts(), getPools()]);
    setMe(user);
    setPosts(postList);
    setPools(poolList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function handleSubmitPost() {
    if (!postTitle.trim() || !postBody.trim()) return;
    await createBoardPost(postCategory, postTitle.trim(), postBody.trim());
    setPostModal(false);
    setPostTitle('');
    setPostBody('');
    await reload();
  }

  async function handleSubmitPool() {
    if (!poolDraft.name.trim()) return;
    await addPool(poolDraft);
    setPoolModal(false);
    setPoolDraft({ name: '' });
    await reload();
  }

  const disabled = !me || me.provider !== 'apple';

  const filteredFreeSwimPools = pools.filter((p) => {
    if (!p.freeSwimNote) return false;
    if (!poolSearch.trim()) return true;
    const q = poolSearch.trim().toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.region ?? '').toLowerCase().includes(q);
  });

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>팁방</Text>

        <View style={styles.tabRow}>
          {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{TAB_LABEL[t]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {disabled ? (
          <View style={styles.disabledNotice}>
            <Text style={styles.disabledText}>팁방 기능은 Apple 로그인 계정에서만 사용할 수 있어요.</Text>
          </View>
        ) : tab === 'board' ? (
          <ScrollView contentContainerStyle={styles.list}>
            <TouchableOpacity style={styles.addRow} onPress={() => setPostModal(true)}>
              <Text style={styles.addRowText}>+ 글쓰기</Text>
            </TouchableOpacity>
            {posts.length === 0 && <Text style={styles.empty}>아직 글이 없어요. 첫 글을 남겨보세요.</Text>}
            {posts.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.postCard}
                onPress={() => navigation.navigate('PostDetail', { postId: p.id })}
              >
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{p.category}</Text>
                </View>
                <Text style={styles.postTitle}>{p.title}</Text>
                <Text style={styles.postMeta}>
                  {p.authorNickname} · {timeAgo(p.createdAt)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : tab === 'pools' ? (
          <ScrollView contentContainerStyle={styles.list}>
            <TextInput
              style={styles.searchInput}
              value={poolSearch}
              onChangeText={setPoolSearch}
              placeholder="수영장 이름이나 지역(예: 강남구)으로 검색"
              placeholderTextColor={colors.textMuted}
            />
            {!isPoolDataConfigured ? (
              <Text style={styles.empty}>수영장 검색 기능을 준비하고 있어요. 조금만 기다려주세요!</Text>
            ) : loadingOfficial ? (
              <ActivityIndicator color={colors.primary} style={styles.loading} />
            ) : !poolSearch.trim() ? (
              <Text style={styles.empty}>수영장 이름이나 지역을 검색해보세요. 행정안전부 공식 데이터예요.</Text>
            ) : officialPools.length === 0 ? (
              <Text style={styles.empty}>검색 결과가 없어요.</Text>
            ) : (
              <>
                <TouchableOpacity style={styles.mapToggle} onPress={() => setMapVisible(true)}>
                  <Text style={styles.mapToggleText}>{`🗺️ 지도에서 한 번에 보기 (${officialPools.length})`}</Text>
                </TouchableOpacity>
                {officialPools.map((p) => {
                  const mapLink = mapLinkFor(p);
                  return (
                    <View key={p.id} style={styles.poolCard}>
                      <Text style={styles.poolName}>{p.name}</Text>
                      <Text style={styles.poolMeta}>{p.roadAddress}</Text>
                      <Text style={styles.poolStatus}>{p.statusName}</Text>
                      <View style={styles.poolActionsRow}>
                        {p.phone && (
                          <TouchableOpacity onPress={() => Linking.openURL(`tel:${p.phone}`)}>
                            <Text style={styles.poolAction}>전화하기</Text>
                          </TouchableOpacity>
                        )}
                        {mapLink && (
                          <TouchableOpacity onPress={() => Linking.openURL(mapLink)}>
                            <Text style={styles.poolAction}>지도에서 보기</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => Linking.openURL(registrationSearchLinkFor(p))}>
                          <Text style={styles.poolAction}>수강신청 찾기</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            <TextInput
              style={styles.searchInput}
              value={poolSearch}
              onChangeText={setPoolSearch}
              placeholder="수영장 이름이나 지역으로 검색"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity style={styles.addRow} onPress={() => setPoolModal(true)}>
              <Text style={styles.addRowText}>+ 자유수영 정보 추가하기</Text>
            </TouchableOpacity>
            {filteredFreeSwimPools.length === 0 && (
              <Text style={styles.empty}>
                아직 자유수영 정보가 등록된 수영장이 없어요. 알고 있는 정보를 추가해보세요.
              </Text>
            )}
            {filteredFreeSwimPools.map((p) => (
              <View key={p.id} style={styles.poolCard}>
                <Text style={styles.poolName}>{p.name}</Text>
                {p.region && <Text style={styles.poolMeta}>{p.region}</Text>}
                {p.address && <Text style={styles.poolMeta}>{p.address}</Text>}
                {p.freeSwimNote && <Text style={styles.poolFreeSwim}>{p.freeSwimNote}</Text>}
                {p.pricingNote && <Text style={styles.poolMeta}>요금: {p.pricingNote}</Text>}
                <View style={styles.poolActionsRow}>
                  {p.phone && (
                    <TouchableOpacity onPress={() => Linking.openURL(`tel:${p.phone}`)}>
                      <Text style={styles.poolAction}>전화하기</Text>
                    </TouchableOpacity>
                  )}
                  {p.websiteUrl && (
                    <TouchableOpacity onPress={() => Linking.openURL(p.websiteUrl!)}>
                      <Text style={styles.poolAction}>홈페이지</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* 글쓰기 모달 */}
      <Modal visible={postModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.modalCardTall]}>
            <ScrollView>
              <Text style={styles.modalTitle}>글쓰기</Text>
              <View style={styles.categoryPickRow}>
                {BOARD_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.categoryChip, postCategory === c && styles.categoryChipActive]}
                    onPress={() => setPostCategory(c)}
                  >
                    <Text
                      style={[styles.categoryChipText, postCategory === c && styles.categoryChipTextActive]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={postTitle}
                onChangeText={setPostTitle}
                placeholder="제목"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, styles.textarea]}
                value={postBody}
                onChangeText={setPostBody}
                placeholder="내용을 적어주세요"
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <View style={styles.modalRow}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setPostModal(false)}>
                  <Text style={styles.modalCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={handleSubmitPost}>
                  <Text style={styles.modalConfirmText}>올리기</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 수영장 추가 모달 */}
      <Modal visible={poolModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.modalCardTall]}>
            <ScrollView>
              <Text style={styles.modalTitle}>자유수영 정보 추가</Text>
              <TextInput
                style={styles.input}
                value={poolDraft.name}
                onChangeText={(v) => setPoolDraft((d) => ({ ...d, name: v }))}
                placeholder="수영장 이름 *"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.input}
                value={poolDraft.region ?? ''}
                onChangeText={(v) => setPoolDraft((d) => ({ ...d, region: v }))}
                placeholder="지역 (예: 서울 강남구)"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.input}
                value={poolDraft.address ?? ''}
                onChangeText={(v) => setPoolDraft((d) => ({ ...d, address: v }))}
                placeholder="주소"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={styles.input}
                value={poolDraft.phone ?? ''}
                onChangeText={(v) => setPoolDraft((d) => ({ ...d, phone: v }))}
                placeholder="전화번호"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.input}
                value={poolDraft.websiteUrl ?? ''}
                onChangeText={(v) => setPoolDraft((d) => ({ ...d, websiteUrl: v }))}
                placeholder="홈페이지 URL"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                value={poolDraft.pricingNote ?? ''}
                onChangeText={(v) => setPoolDraft((d) => ({ ...d, pricingNote: v }))}
                placeholder="등록 시기 · 구민/타구민 요금"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, styles.textarea]}
                value={poolDraft.freeSwimNote ?? ''}
                onChangeText={(v) => setPoolDraft((d) => ({ ...d, freeSwimNote: v }))}
                placeholder="자유수영 시간대"
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <View style={styles.modalRow}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setPoolModal(false)}>
                  <Text style={styles.modalCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={handleSubmitPool}>
                  <Text style={styles.modalConfirmText}>추가하기</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <PoolMapModal visible={mapVisible} pools={officialPools} onClose={() => setMapVisible(false)} />
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
  empty: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, lineHeight: 20 },
  postCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.hairline + 4 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: colors.cardSoft, borderRadius: radius.pill, paddingHorizontal: spacing.hairline + 2, paddingVertical: 2, marginBottom: 4 },
  categoryBadgeText: { fontFamily: fonts.bold, color: colors.blueSea, fontSize: 10 },
  postTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  postMeta: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 4,
    marginBottom: spacing.xs,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  loading: { marginTop: spacing.lg },
  mapToggle: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.pill,
    paddingVertical: spacing.hairline + 4,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  mapToggleText: { fontFamily: fonts.semibold, color: colors.blueSea, fontSize: 13 },
  poolCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.hairline + 4 },
  poolName: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  poolMeta: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  poolStatus: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 11, marginTop: 2 },
  poolFreeSwim: { fontFamily: fonts.semibold, color: colors.blueSea, fontSize: 12, marginTop: 4 },
  poolActionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  poolAction: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(10,51,88,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: { width: '100%', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  modalCardTall: { maxHeight: '85%' },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
  categoryPickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.hairline, marginBottom: spacing.xs },
  categoryChip: { backgroundColor: colors.cardSoft, borderRadius: radius.pill, paddingHorizontal: spacing.xs, paddingVertical: spacing.hairline },
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
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  modalCancel: { flex: 1, alignItems: 'center', paddingVertical: spacing.hairline + 4 },
  modalCancelText: { fontFamily: fonts.semibold, color: colors.textMuted },
  modalConfirm: { flex: 1, alignItems: 'center', paddingVertical: spacing.hairline + 4, backgroundColor: colors.primary, borderRadius: radius.pill },
  modalConfirmText: { fontFamily: fonts.semibold, color: colors.white },
});
