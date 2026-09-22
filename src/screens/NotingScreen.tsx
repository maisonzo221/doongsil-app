import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import MoodPicker from '../components/MoodPicker';
import StrokePicker from '../components/StrokePicker';
import { Mood, Stroke } from '../types';
import { colors, radius, spacing } from '../theme';
import { addRecord } from '../storage/records';
import { getGoal, setGoal } from '../storage/goals';
import { currentYearMonth, formatDateLabel, formatMonthLabel, todayString } from '../utils/date';

export default function NotingScreen() {
  const [mood, setMood] = useState<Mood>('good');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [memo, setMemo] = useState('');
  const [condition, setCondition] = useState('');
  const [saving, setSaving] = useState(false);

  const [goalText, setGoalText] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  useFocusEffect(
    useCallback(() => {
      getGoal(currentYearMonth()).then(setGoalText);
    }, [])
  );

  function resetForm() {
    setMood('good');
    setStrokes([]);
    setDistance('');
    setDuration('');
    setMemo('');
    setCondition('');
  }

  async function handleSave() {
    setSaving(true);
    try {
      await addRecord({
        date: todayString(),
        mood,
        strokes,
        distanceMeters: distance ? Number(distance) : undefined,
        durationMinutes: duration ? Number(duration) : undefined,
        memo: memo.trim() || undefined,
        condition: condition.trim() || undefined,
      });
      resetForm();
      Alert.alert('기록 완료', '오늘의 수영이 둥실 담겼어요 🌊');
    } finally {
      setSaving(false);
    }
  }

  async function saveGoal() {
    await setGoal(currentYearMonth(), goalDraft.trim());
    setGoalText(goalDraft.trim());
    setEditingGoal(false);
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>노팅</Text>
          <Text style={styles.subtitle}>{formatDateLabel(todayString())}</Text>

          <View style={styles.goalCard}>
            <Text style={styles.goalLabel}>{formatMonthLabel(currentYearMonth())} 목표</Text>
            {editingGoal ? (
              <View style={styles.goalEditRow}>
                <TextInput
                  style={styles.goalInput}
                  value={goalDraft}
                  onChangeText={setGoalDraft}
                  placeholder="예: 접영 배우기"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <TouchableOpacity onPress={saveGoal} style={styles.goalSaveBtn}>
                  <Text style={styles.goalSaveText}>저장</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setGoalDraft(goalText);
                  setEditingGoal(true);
                }}
              >
                <Text style={goalText ? styles.goalText : styles.goalPlaceholder}>
                  {goalText || '탭해서 이번 달 목표를 적어보세요'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘, 물속에서 어땠나요?</Text>
            <MoodPicker value={mood} onChange={setMood} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘 연습한 종목</Text>
            <StrokePicker value={strokes} onChange={setStrokes} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기록 (선택)</Text>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="거리(m)"
                  placeholderTextColor={colors.textMuted}
                  value={distance}
                  onChangeText={setDistance}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="시간(분)"
                  placeholderTextColor={colors.textMuted}
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘의 한줄 메모</Text>
            <TextInput
              style={styles.textarea}
              multiline
              placeholder="오늘 물속에서의 기분을 남겨보세요"
              placeholderTextColor={colors.textMuted}
              value={memo}
              onChangeText={setMemo}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘 몸 상태 (선택)</Text>
            <TextInput
              style={styles.input}
              placeholder="뻐근함, 개운함 등"
              placeholderTextColor={colors.textMuted}
              value={condition}
              onChangeText={setCondition}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? '저장 중...' : '오늘 기록 남기기'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.textMuted, marginTop: 2, marginBottom: spacing.lg },
  goalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  goalLabel: { color: colors.primaryDark, fontWeight: '700', fontSize: 12, marginBottom: 4 },
  goalText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  goalPlaceholder: { color: colors.textMuted, fontSize: 14 },
  goalEditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  goalInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
    color: colors.text,
  },
  goalSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  goalSaveText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
    marginBottom: spacing.sm,
  },
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
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});
