import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../../components/ScreenBackground';
import { colors, fonts, radius, spacing } from '../../theme';
import { TipRoomStackParamList } from '../../navigation/tipRoomTypes';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../storage/auth';
import { addFriendById, isFriend } from '../../storage/social';
import { getCommentCountByAuthor, getPostCountByAuthor } from '../../storage/tipRoom';
import { getProfileStats, ProfileStats } from '../../storage/profileStats';
import { swimTenureLabel } from '../../utils/swimTenure';

type Props = NativeStackScreenProps<TipRoomStackParamList, 'UserProfile'>;

interface ProfileData {
  nicknameKo: string;
  swimSince: string | null;
  postCount: number;
  commentCount: number;
}

export default function UserProfileScreen({ route }: Props) {
  const { userId } = route.params;
  const [myId, setMyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [friend, setFriend] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingFriend, setAddingFriend] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const [me, { data: row }, postCount, commentCount, friendStatus] = await Promise.all([
      getCurrentUser(),
      supabase.from('public_profiles').select('nickname_ko, swim_since').eq('id', userId).maybeSingle(),
      getPostCountByAuthor(userId),
      getCommentCountByAuthor(userId),
      isFriend(userId),
    ]);
    setMyId(me?.id ?? null);
    setProfile({
      nicknameKo: row?.nickname_ko ?? '알 수 없음',
      swimSince: row?.swim_since ?? null,
      postCount,
      commentCount,
    });
    setFriend(friendStatus);
    if (friendStatus || me?.id === userId) {
      setStats(await getProfileStats(userId));
    } else {
      setStats(null);
    }
    setLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function handleAddFriend() {
    setAddingFriend(true);
    try {
      await addFriendById(userId);
      Alert.alert('완료', '수친으로 추가했어요.');
      await reload();
    } catch {
      Alert.alert('실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setAddingFriend(false);
    }
  }

  if (loading || !profile) {
    return (
      <ScreenBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenBackground>
    );
  }

  const isMe = myId === userId;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>{profile.nicknameKo.slice(0, 1)}</Text>
        </View>
        <Text style={styles.nickname}>{profile.nicknameKo}</Text>
        <Text style={styles.tenure}>{swimTenureLabel(profile.swimSince)}</Text>

        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.postCount}</Text>
            <Text style={styles.statLabel}>게시글</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.commentCount}</Text>
            <Text style={styles.statLabel}>댓글</Text>
          </View>
        </View>

        {!isMe && !friend && (
          <TouchableOpacity style={styles.addFriendBtn} onPress={handleAddFriend} disabled={addingFriend}>
            {addingFriend ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.addFriendBtnText}>수친으로 추가하기</Text>
            )}
          </TouchableOpacity>
        )}

        {(isMe || friend) && (
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>평균 수영 데이터</Text>
            {stats && stats.sessionCount > 0 ? (
              <>
                <View style={styles.statsRow}>
                  <Text style={styles.statsLabel}>평균 거리</Text>
                  <Text style={styles.statsValue}>
                    {stats.avgDistanceM ? `${Math.round(stats.avgDistanceM)}m` : '-'}
                  </Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statsLabel}>평균 시간</Text>
                  <Text style={styles.statsValue}>
                    {stats.avgDurationMin ? `${Math.round(stats.avgDurationMin)}분` : '-'}
                  </Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statsLabel}>총 기록 수</Text>
                  <Text style={styles.statsValue}>{stats.sessionCount}회</Text>
                </View>
              </>
            ) : (
              <Text style={styles.statsEmpty}>아직 쌓인 수영 기록이 없어요.</Text>
            )}
          </View>
        )}

        {!isMe && !friend && (
          <Text style={styles.hint}>수친이 되면 평균 수영 데이터도 볼 수 있어요.</Text>
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1, alignItems: 'center', paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarInitial: { fontFamily: fonts.bold, fontSize: 28, color: colors.blueSea },
  nickname: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  tenure: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primary, marginTop: 2 },
  statRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.xl },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addFriendBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  addFriendBtnText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 14 },
  statsCard: {
    marginTop: spacing.lg,
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  statsCardTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 14, marginBottom: spacing.xs },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  statsLabel: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 13 },
  statsValue: { fontFamily: fonts.semibold, color: colors.text, fontSize: 13 },
  statsEmpty: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 13 },
  hint: { marginTop: spacing.md, fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12 },
});
