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
import RecordCard from '../components/RecordCard';
import { Mood, Stroke, SwimRecord } from '../types';
import { colors, fonts, radius, spacing } from '../theme';
import { addRecord, deleteRecord, getAllRecords } from '../storage/records';
import { getGoal, setGoal } from '../storage/goals';
import { getTodaySwimWorkout } from '../services/appleHealth';
import { toggleBoldWrap, toggleBulletLine } from '../utils/memoFormat';
import { currentYearMonth, formatDateLabel, formatMonthLabel, todayString } from '../utils/date';

const MAX_RECORDS_PER_DAY = 3;

export default function NotingScreen() {
  const [mood, setMood] = useState<Mood>('good');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [avgHeartRate, setAvgHeartRate] = useState('');
  const [memo, setMemo] = useState('');
  const [condition, setCondition] = useState('');
  const [source, setSource] = useState<'manual' | 'health'>('manual');
  const [saving, setSaving] = useState(false);

  const [goalText, setGoalText] = useState('');
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  const [todayRecords, setTodayRecords] = useState<SwimRecord[]>([]);

  const loadTodayRecords = useCallback(async () => {
    const all = await getAllRecords();
    setTodayRecords(all.filter((r) => r.date === todayString()));
  }, []);

  useFocusEffect(
    useCallback(() => {
      getGoal(currentYearMonth()).then(setGoalText);
      loadTodayRecords();
    }, [loadTodayRecords])
  );

  // 오늘 기록이 아직 없으면 애플 피트니스에서 오늘의 수영 운동을 불러와 채워준다.
  // 실측이 부정확할 수 있어서 값은 그대로 두되 사용자가 자유롭게 고칠 수 있다.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getAllRecords().then(async (all) => {
        if (cancelled) return;
        const hasToday = all.some((r) => r.date === todayString());
        if (!hasToday) {
          const imported = await getTodaySwimWorkout(todayString());
          if (cancelled || !imported) return;
          setDistance(String(imported.distanceMeters));
          setDuration(String(imported.durationMinutes));
          setCalories(String(imported.calories));
          setAvgHeartRate(String(imported.avgHeartRate));
          setStrokes(imported.strokes);
          setSource('health');
        }
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  function resetForm() {
    setMood('good');
    setStrokes([]);
    setDistance('');
    setDuration('');
    setCalories('');
    setAvgHeartRate('');
    setMemo('');
    setCondition('');
    setSource('manual');
  }

  const reachedDailyLimit = todayRecords.length >= MAX_RECORDS_PER_DAY;

  async function handleSave() {
    if (reachedDailyLimit) {
      Alert.alert('오늘은 그만!', `하루에 최대 ${MAX_RECORDS_PER_DAY}개까지만 기록할 수 있어요.`);
      return;
    }
    setSaving(true);
    try {
      await addRecord({
        sport: 'swim',
        date: todayString(),
        mood,
        strokes,
        distanceMeters: distance ? Number(distance) : undefined,
        durationMinutes: duration ? Number(duration) : undefined,
        calories: calories ? Number(calories) : undefined,
        avgHeartRate: avgHeartRate ? Number(avgHeartRate) : undefined,
        memo: memo.trim() || undefined,
        condition: condition.trim() || undefined,
        source,
      });
      resetForm();
      await loadTodayRecords();
      Alert.alert('기록 완료', '오늘의 수영이 둥실 담겼어요 🌊');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditToday(record: SwimRecord) {
    await deleteRecord(record.id);
    await loadTodayRecords();
    setMood(record.mood);
    setStrokes(record.strokes);
    setDistance(record.distanceMeters ? String(record.distanceMeters) : '');
    setDuration(record.durationMinutes ? String(record.durationMinutes) : '');
    setCalories(record.calories ? String(record.calories) : '');
    setAvgHeartRate(record.avgHeartRate ? String(record.avgHeartRate) : '');
    setMemo(record.memo ?? '');
    setCondition(record.condition ?? '');
    setSource(record.source);
  }

  function handleDeleteToday(record: SwimRecord) {
    Alert.alert('기록 삭제', '오늘 남긴 이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(record.id);
          await loadTodayRecords();
        },
      },
    ]);
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

          {todayRecords.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>오늘 남긴 기록 ({todayRecords.length}/{MAX_RECORDS_PER_DAY})</Text>
              {todayRecords.map((r) => (
                <RecordCard
                  key={r.id}
                  record={r}
                  onEdit={() => handleEditToday(r)}
                  onDelete={() => handleDeleteToday(r)}
                />
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘, 물속에서 어땠나요?</Text>
            <MoodPicker value={mood} onChange={setMood} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>오늘 연습한 종목</Text>
            <StrokePicker value={strokes} onChange={setStrokes} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>기록 (선택)</Text>
              {source === 'health' && (
                <Text style={styles.healthHint}>애플 피트니스에서 불러왔어요 · 필요하면 고쳐도 돼요</Text>
              )}
            </View>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="거리(m)"
                  placeholderTextColor={colors.textMuted}
                  value={distance}
                  onChangeText={(v) => {
                    setDistance(v);
                    setSource('manual');
                  }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="시간(분)"
                  placeholderTextColor={colors.textMuted}
                  value={duration}
                  onChangeText={(v) => {
                    setDuration(v);
                    setSource('manual');
                  }}
                />
              </View>
            </View>
            <View style={[styles.row, styles.rowSpacingTop]}>
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="칼로리(kcal)"
                  placeholderTextColor={colors.textMuted}
                  value={calories}
                  onChangeText={(v) => {
                    setCalories(v);
                    setSource('manual');
                  }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="평균 심박수(bpm)"
                  placeholderTextColor={colors.textMuted}
                  value={avgHeartRate}
                  onChangeText={(v) => {
                    setAvgHeartRate(v);
                    setSource('manual');
                  }}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>오늘의 한줄 메모</Text>
              <View style={styles.memoTools}>
                <TouchableOpacity
                  style={styles.memoToolBtn}
                  onPress={() => setMemo((m) => toggleBoldWrap(m))}
                >
                  <Text style={styles.memoToolBold}>B</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.memoToolBtn}
                  onPress={() => setMemo((m) => toggleBulletLine(m))}
                >
                  <Text style={styles.memoToolText}>{'•'}</Text>
                </TouchableOpacity>
              </View>
            </View>
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
            style={[styles.saveBtn, (saving || reachedDailyLimit) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving || reachedDailyLimit}
          >
            <Text style={[styles.saveBtnText, (saving || reachedDailyLimit) && styles.saveBtnTextDisabled]}>
              {reachedDailyLimit ? '오늘은 이미 다 기록했어요' : saving ? '저장 중...' : '오늘 기록 남기기'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { fontSize: 28, fontFamily: fonts.bold, color: colors.text },
  subtitle: { color: colors.textMuted, fontFamily: fonts.regular, marginTop: 2, marginBottom: spacing.lg },
  goalCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  goalLabel: { color: colors.blueSea, fontFamily: fonts.bold, fontSize: 12, marginBottom: 4 },
  goalText: { color: colors.text, fontSize: 15, fontFamily: fonts.semibold },
  goalPlaceholder: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.regular },
  goalEditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  goalInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  goalSaveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  goalSaveText: { color: colors.white, fontFamily: fonts.bold, fontSize: 12 },
  section: { marginBottom: spacing.lg },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    color: colors.text,
    fontSize: 15,
  },
  healthHint: { fontFamily: fonts.regular, color: colors.blueSea, fontSize: 11, flexShrink: 1, textAlign: 'right' },
  row: { flexDirection: 'row', gap: spacing.xs },
  rowSpacingTop: { marginTop: spacing.xs },
  halfInput: { flex: 1 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  memoTools: { flexDirection: 'row', gap: spacing.hairline },
  memoToolBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoToolBold: { fontFamily: fonts.bold, color: colors.text, fontSize: 13 },
  memoToolText: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  textarea: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    color: colors.text,
    fontFamily: fonts.regular,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  saveBtnDisabled: { backgroundColor: colors.disabled },
  saveBtnText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  saveBtnTextDisabled: { color: colors.disabledText },
});
