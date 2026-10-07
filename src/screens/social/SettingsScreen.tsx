import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../../components/ScreenBackground';
import { colors, fonts, radius, spacing } from '../../theme';
import { FriendsStackParamList } from '../../navigation/socialTypes';
import { deleteAccount, getCurrentUser, signOut, updateSwimSince, UserProfile } from '../../storage/auth';
import { PRIVACY_POLICY_URL } from '../../config/links';
import { swimTenureLabel } from '../../utils/swimTenure';

type Props = NativeStackScreenProps<FriendsStackParamList, 'Settings'>;

export default function SettingsScreen({}: Props) {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingTenure, setEditingTenure] = useState(false);
  const [tenureYear, setTenureYear] = useState('');
  const [tenureMonth, setTenureMonth] = useState('');
  const [tenureDay, setTenureDay] = useState('');
  const [savingTenure, setSavingTenure] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      setMe(user);
      if (user?.swimSince) {
        const [y, m, d] = user.swimSince.split('-');
        setTenureYear(y);
        setTenureMonth(m);
        setTenureDay(d);
      }
    });
  }, []);

  async function handleSaveTenure() {
    const y = Number(tenureYear);
    const m = Number(tenureMonth);
    const d = Number(tenureDay);
    const valid =
      y >= 1950 && y <= new Date().getFullYear() && m >= 1 && m <= 12 && d >= 1 && d <= 31;
    if (!valid) {
      Alert.alert('날짜 확인', '연도/월/일을 다시 확인해주세요.');
      return;
    }
    const dateString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    setSavingTenure(true);
    try {
      await updateSwimSince(dateString);
      setMe((prev) => (prev ? { ...prev, swimSince: dateString } : prev));
      setEditingTenure(false);
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setSavingTenure(false);
    }
  }

  function handleSignOut() {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      '계정 삭제',
      '계정을 삭제하면 프로필, 수친, 수톡/톡톡 채팅방과 메시지, 자유게시판 글이 전부 영구히 삭제되고 되돌릴 수 없어요.\n\n(기기에만 저장된 수영 기록·캘린더는 서버에 올라간 적이 없어서, 앱을 삭제하면 같이 지워져요.)',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제할게요', style: 'destructive', onPress: confirmDelete },
      ]
    );
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteAccount();
    } catch {
      Alert.alert('삭제 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>설정</Text>

        {me && me.provider === 'apple' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>닉네임</Text>
            <Text style={styles.cardValue}>{me.nicknameKo}</Text>
            {me.inviteCode && (
              <>
                <Text style={[styles.cardLabel, { marginTop: spacing.sm }]}>초대 코드</Text>
                <Text style={styles.cardValue}>{me.inviteCode}</Text>
              </>
            )}

            <Text style={[styles.cardLabel, { marginTop: spacing.sm }]}>수력</Text>
            {editingTenure ? (
              <View>
                <View style={styles.tenureInputRow}>
                  <TextInput
                    style={styles.tenureInput}
                    placeholder="연도"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={tenureYear}
                    onChangeText={setTenureYear}
                  />
                  <Text style={styles.tenureSep}>년</Text>
                  <TextInput
                    style={styles.tenureInput}
                    placeholder="월"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={tenureMonth}
                    onChangeText={setTenureMonth}
                  />
                  <Text style={styles.tenureSep}>월</Text>
                  <TextInput
                    style={styles.tenureInput}
                    placeholder="일"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={tenureDay}
                    onChangeText={setTenureDay}
                  />
                  <Text style={styles.tenureSep}>일</Text>
                </View>
                <TouchableOpacity style={styles.tenureSaveBtn} onPress={handleSaveTenure} disabled={savingTenure}>
                  {savingTenure ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <Text style={styles.tenureSaveBtnText}>저장</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingTenure(true)}>
                <Text style={styles.cardValue}>
                  {swimTenureLabel(me.swimSince)} {me.swimSince ? '· 수정' : '· 설정하기'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          <Text style={styles.rowText}>개인정보 처리방침</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleSignOut}>
          <Text style={styles.rowText}>로그아웃</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleDeleteAccount} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[styles.rowText, styles.dangerText]}>계정 삭제</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { fontSize: 28, fontFamily: fonts.bold, color: colors.text, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  cardLabel: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12 },
  cardValue: { fontFamily: fonts.semibold, color: colors.text, fontSize: 16, marginTop: 2 },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  rowText: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  dangerText: { color: '#D9453C' },
  tenureInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  tenureInput: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.hairline + 2,
    paddingVertical: 6,
    fontFamily: fonts.regular,
    color: colors.text,
    width: 52,
    textAlign: 'center',
  },
  tenureSep: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 13 },
  tenureSaveBtn: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tenureSaveBtnText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 13 },
});
