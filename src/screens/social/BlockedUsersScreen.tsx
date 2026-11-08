import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../../components/ScreenBackground';
import { colors, fonts, radius, spacing } from '../../theme';
import { BlockedUser, getBlockedUsers, unblockUser } from '../../storage/safety';

// 내가 차단한 사람 목록. 여기서 차단을 풀면 그 사람의 글·댓글·채팅이 다시 보인다.
export default function BlockedUsersScreen() {
  const [users, setUsers] = useState<BlockedUser[] | null>(null);

  const reload = useCallback(async () => {
    setUsers(await getBlockedUsers());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function handleUnblock(u: BlockedUser) {
    try {
      await unblockUser(u.id);
      setUsers((prev) => prev?.filter((x) => x.id !== u.id) ?? prev);
    } catch {
      Alert.alert('해제 실패', '잠시 후 다시 시도해주세요.');
    }
  }

  return (
    <ScreenBackground>
      {users === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>차단한 사용자가 없어요.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.nickname}</Text>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(item)}>
                <Text style={styles.unblockText}>차단 해제</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, gap: spacing.xs },
  empty: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  name: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  unblockBtn: { backgroundColor: colors.cardSoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  unblockText: { fontFamily: fonts.bold, color: colors.primary, fontSize: 13 },
});
