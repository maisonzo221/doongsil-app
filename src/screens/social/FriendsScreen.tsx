import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import { colors, fonts, radius, spacing } from '../../theme';
import {
  addFriendByInviteCode,
  addFriendById,
  Friend,
  findRegisteredContacts,
  getFriends,
  MatchedContact,
} from '../../storage/social';
import { getCurrentUser, syncContacts, updateNicknames, UserProfile } from '../../storage/auth';

export default function FriendsScreen() {
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

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>친구</Text>

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
              <View style={styles.friendCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.nicknameKo.slice(0, 1)}</Text>
                </View>
                <View style={styles.friendBody}>
                  <Text style={styles.friendName}>{item.nicknameKo}</Text>
                  <Text style={styles.friendNote}>{item.nicknameEn}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>아직 수친이 없어요. 연락처나 가입 코드로 추가해보세요.</Text>
            }
          />
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
