import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../components/ScreenBackground';
import RecordCard from '../components/RecordCard';
import { SwimRecord } from '../types';
import { colors, fonts, spacing } from '../theme';
import { getAllRecords } from '../storage/records';
import { DiaryStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<DiaryStackParamList, 'DiaryList'>;

export default function DiaryScreen({ navigation }: Props) {
  const [records, setRecords] = useState<SwimRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      getAllRecords().then(setRecords);
    }, [])
  );

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>다이어리</Text>
        <FlatList
          data={records}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <RecordCard
              record={item}
              onPress={() => navigation.navigate('RecordDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>아직 기록이 없어요.{'\n'}오늘 첫 기록을 남겨보세요!</Text>
            </View>
          }
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: 28, fontFamily: fonts.bold, color: colors.text, marginBottom: spacing.sm },
  list: { paddingBottom: spacing.xl },
  empty: { alignItems: 'center', marginTop: spacing.xl * 2 },
  emptyText: { color: colors.textMuted, fontFamily: fonts.regular, textAlign: 'center', lineHeight: 22 },
});
