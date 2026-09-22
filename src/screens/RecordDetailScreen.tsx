import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../components/ScreenBackground';
import MoodPicker from '../components/MoodPicker';
import StrokePicker from '../components/StrokePicker';
import { Mood, Stroke, SwimRecord } from '../types';
import { colors, radius, spacing } from '../theme';
import { deleteRecord, getAllRecords, updateRecord } from '../storage/records';
import { formatDateLabel } from '../utils/date';
import { DiaryStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<DiaryStackParamList, 'RecordDetail'>;

export default function RecordDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [record, setRecord] = useState<SwimRecord | null>(null);
  const [mood, setMood] = useState<Mood>('good');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [memo, setMemo] = useState('');
  const [condition, setCondition] = useState('');

  useFocusEffect(
    useCallback(() => {
      getAllRecords().then((all) => {
        const found = all.find((r) => r.id === id) ?? null;
        setRecord(found);
        if (found) {
          setMood(found.mood);
          setStrokes(found.strokes);
          setDistance(found.distanceMeters ? String(found.distanceMeters) : '');
          setDuration(found.durationMinutes ? String(found.durationMinutes) : '');
          setMemo(found.memo ?? '');
          setCondition(found.condition ?? '');
        }
      });
    }, [id])
  );

  async function handleSave() {
    if (!record) return;
    await updateRecord(record.id, {
      date: record.date,
      mood,
      strokes,
      distanceMeters: distance ? Number(distance) : undefined,
      durationMinutes: duration ? Number(duration) : undefined,
      memo: memo.trim() || undefined,
      condition: condition.trim() || undefined,
    });
    navigation.goBack();
  }

  function handleDelete() {
    if (!record) return;
    Alert.alert('기록 삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(record.id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (!record) return <ScreenBackground><View /></ScreenBackground>;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{formatDateLabel(record.date)}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기분</Text>
          <MoodPicker value={mood} onChange={setMood} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>종목</Text>
          <StrokePicker value={strokes} onChange={setStrokes} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기록</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              keyboardType="numeric"
              placeholder="거리(m)"
              placeholderTextColor={colors.textMuted}
              value={distance}
              onChangeText={setDistance}
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              keyboardType="numeric"
              placeholder="시간(분)"
              placeholderTextColor={colors.textMuted}
              value={duration}
              onChangeText={setDuration}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>한줄 메모</Text>
          <TextInput
            style={styles.textarea}
            multiline
            value={memo}
            onChangeText={setMemo}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>몸 상태</Text>
          <TextInput
            style={styles.input}
            value={condition}
            onChangeText={setCondition}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>저장</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>삭제</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontWeight: '700', color: colors.text, fontSize: 15, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  halfInput: { flex: 1 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
  },
  textarea: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    color: colors.text,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  deleteBtn: { alignItems: 'center', marginTop: spacing.md, paddingVertical: spacing.sm },
  deleteBtnText: { color: '#D96C6C', fontWeight: '700' },
});
