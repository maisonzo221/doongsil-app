import React, { useCallback, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import '../utils/calendarLocale';
import ScreenBackground from '../components/ScreenBackground';
import WaterDrop from '../components/WaterDrop';
import RecordCard from '../components/RecordCard';
import DailyOceanCard from '../components/DailyOceanCard';
import { SwimRecord } from '../types';
import { colors, fonts, moodColors, radius, spacing } from '../theme';
import { getAllRecords } from '../storage/records';
import { computeStreak } from '../utils/streak';
import { monthlySummary, totalDistanceLabel } from '../utils/summary';
import { currentYearMonth, formatMonthLabel, formatDateLabel, todayString } from '../utils/date';

const RECENT_COUNT = 5;
const MAX_DOTS_PER_DAY = 3;

function todayHeaderParts() {
  const now = new Date();
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][now.getDay()];
  return {
    year: now.getFullYear(),
    day: now.getDate(),
    month: now.getMonth() + 1,
    weekday,
  };
}

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
  const recentRecords = useMemo(() => records.slice(0, RECENT_COUNT), [records]);

  const selectedRecords = selectedDate ? recordsByDate.get(selectedDate) ?? [] : [];
  const header = todayHeaderParts();

  return (
    <ScreenBackground>
      <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
        {/* 닌텐도 투데이 스타일 헤더 */}
        <View style={styles.todayHeader}>
          <Text style={styles.year}>{header.year}</Text>
          <View style={styles.dateRow}>
            <Text style={styles.bigDay}>{header.day}</Text>
            <View style={styles.dateMeta}>
              <Text style={styles.month}>{header.month}월</Text>
              <Text style={styles.weekday}>{header.weekday}요일</Text>
            </View>
          </View>
        </View>

        <DailyOceanCard />

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

        <View style={styles.calendarCard}>
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
              textMonthFontWeight: '700',
              todayTextColor: colors.blueSea,
              arrowColor: colors.blueSea,
              dayTextColor: colors.text,
              textDisabledColor: colors.border,
            }}
            dayComponent={({ date, state }: any) => {
              if (!date) return <View />;
              const dayRecords = (recordsByDate.get(date.dateString) ?? []).slice(0, MAX_DOTS_PER_DAY);
              const isToday = date.dateString === todayString();
              return (
                <TouchableOpacity
                  style={styles.dayCell}
                  onPress={() => dayRecords.length && setSelectedDate(date.dateString)}
                >
                  <View style={[styles.dayNumberWrap, isToday && styles.dayNumberWrapToday]}>
                    <Text
                      style={[
                        styles.dayNumber,
                        isToday && styles.dayNumberToday,
                        state === 'disabled' && { color: colors.border },
                      ]}
                    >
                      {date.day}
                    </Text>
                  </View>
                  <View style={styles.dotsRow}>
                    {dayRecords.map((r) => (
                      <View key={r.id} style={[styles.dot, { backgroundColor: moodColors[r.mood] }]} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={styles.distanceCard}>
          <Text style={styles.distanceText}>{distanceLabel}</Text>
        </View>

        {recentRecords.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>최근 기록</Text>
            {recentRecords.map((r) => (
              <RecordCard key={r.id} record={r} />
            ))}
          </View>
        )}
      </ScrollView>

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
              <RecordCard key={r.id} record={r} />
            ))}
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  todayHeader: { marginBottom: spacing.sm },
  year: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  bigDay: { fontFamily: fonts.bold, color: colors.text, fontSize: 56, lineHeight: 58 },
  dateMeta: { paddingBottom: 6 },
  month: { fontFamily: fonts.bold, color: colors.text, fontSize: 20 },
  weekday: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 13 },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  dropsRow: { flexDirection: 'row', alignItems: 'center' },
  streakText: { color: colors.text, fontFamily: fonts.semibold },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryMonth: { color: colors.blueSea, fontFamily: fonts.bold, fontSize: 12 },
  summaryText: { color: colors.text, marginTop: 4, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  calendarCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  dayCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4, gap: 3 },
  dayNumberWrap: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  dayNumberWrapToday: { backgroundColor: colors.primary },
  dayNumber: { color: colors.text, fontSize: 14, fontFamily: fonts.medium },
  dayNumberToday: { color: colors.white, fontFamily: fonts.bold },
  dotsRow: { flexDirection: 'row', gap: 3, height: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  distanceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  distanceText: { color: colors.blueSea, fontFamily: fonts.bold, fontSize: 15 },
  recentSection: { marginTop: spacing.lg },
  recentTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 15, marginBottom: spacing.xs },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,51,88,0.35)',
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
    marginBottom: spacing.sm,
  },
  modalTitle: { fontSize: 18, fontFamily: fonts.bold, color: colors.text },
  modalClose: { color: colors.blueSea, fontFamily: fonts.bold },
});
