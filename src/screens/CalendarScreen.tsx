import React, { useCallback, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import '../utils/calendarLocale';
import ScreenBackground from '../components/ScreenBackground';
import WaterDrop from '../components/WaterDrop';
import RecordCard from '../components/RecordCard';
import { SwimRecord } from '../types';
import { colors, moodColors, radius, spacing } from '../theme';
import { getAllRecords } from '../storage/records';
import { computeStreak } from '../utils/streak';
import { monthlySummary, totalDistanceLabel } from '../utils/summary';
import { currentYearMonth, formatDateLabel, formatMonthLabel } from '../utils/date';

export default function CalendarScreen() {
  const [records, setRecords] = useState<SwimRecord[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(currentYearMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getAllRecords().then(setRecords);
    }, [])
  );

  const recordsByDate = useMemo(() => {
    const map = new Map<string, SwimRecord[]>();
    for (const r of records) {
      const list = map.get(r.date) ?? [];
      list.push(r);
      map.set(r.date, list);
    }
    return map;
  }, [records]);

  const monthRecords = useMemo(
    () => records.filter((r) => r.date.startsWith(visibleMonth)),
    [records, visibleMonth]
  );

  const streak = useMemo(() => computeStreak(records), [records]);
  const summary = useMemo(() => monthlySummary(monthRecords), [monthRecords]);
  const distanceLabel = useMemo(() => totalDistanceLabel(records), [records]);

  const selectedRecords = selectedDate ? recordsByDate.get(selectedDate) ?? [] : [];

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>캘린더</Text>

        <View style={styles.streakRow}>
          <View style={styles.dropsRow}>
            {Array.from({ length: Math.min(streak, 5) }).map((_, i) => (
              <View key={i} style={{ marginLeft: i === 0 ? 0 : -4 }}>
                <WaterDrop color={colors.primary} size={18 + i} />
              </View>
            ))}
          </View>
          <Text style={styles.streakText}>
            {streak > 0 ? `연속 ${streak}일째 풍덩!` : '오늘 기록을 남기고 스트릭을 시작해보세요'}
          </Text>
        </View>

        {summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryMonth}>{formatMonthLabel(visibleMonth)}</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </View>
        )}

        <Calendar
          current={`${visibleMonth}-01`}
          monthFormat="yyyy년 M월"
          onMonthChange={(m: DateData) => setVisibleMonth(m.dateString.slice(0, 7))}
          onDayPress={(d: DateData) => {
            if (recordsByDate.has(d.dateString)) setSelectedDate(d.dateString);
          }}
          theme={{
            backgroundColor: 'transparent',
            calendarBackground: 'transparent',
            textSectionTitleColor: colors.textMuted,
            monthTextColor: colors.text,
            textMonthFontWeight: '800',
            todayTextColor: colors.primaryDark,
            arrowColor: colors.primaryDark,
            dayTextColor: colors.text,
            textDisabledColor: colors.border,
          }}
          dayComponent={({ date, state }: any) => {
            if (!date) return <View />;
            const dayRecords = recordsByDate.get(date.dateString) ?? [];
            const topMood = dayRecords[0]?.mood;
            return (
              <TouchableOpacity
                style={styles.dayCell}
                onPress={() => dayRecords.length && setSelectedDate(date.dateString)}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    state === 'disabled' && { color: colors.border },
                  ]}
                >
                  {date.day}
                </Text>
                {topMood && <WaterDrop color={moodColors[topMood]} size={12} />}
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.distanceCard}>
          <Text style={styles.distanceText}>{distanceLabel}</Text>
        </View>
      </View>

      <Modal
        visible={!!selectedDate}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDate(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate ? formatDateLabel(selectedDate) : ''}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate(null)}>
                <Text style={styles.modalClose}>닫기</Text>
              </TouchableOpacity>
            </View>
            {selectedRecords.map((r) => (
              <RecordCard key={r.id} record={r} onPress={() => {}} />
            ))}
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dropsRow: { flexDirection: 'row', alignItems: 'center' },
  streakText: { color: colors.text, fontWeight: '700' },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryMonth: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  summaryText: { color: colors.text, marginTop: 4, fontSize: 14, lineHeight: 20 },
  dayCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 2 },
  dayNumber: { color: colors.text, fontSize: 14 },
  distanceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  distanceText: { color: colors.primaryDark, fontWeight: '700', fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(44,74,82,0.35)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalClose: { color: colors.primaryDark, fontWeight: '700' },
});
