import React, { useCallback, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import '../utils/calendarLocale';
import ScreenBackground from '../components/ScreenBackground';
import WaterDrop from '../components/WaterDrop';
import RecordCard from '../components/RecordCard';
import DailyOceanCard from '../components/DailyOceanCard';
import ActivityRings, { MiniActivityRing } from '../components/ActivityRings';
import RoutineRecommendations from '../components/RoutineRecommendations';
import { NotingIcon } from '../components/icons/TabIcons';
import { SwimRecord } from '../types';
import { colors, fonts, radius, spacing } from '../theme';
import { getAllRecords } from '../storage/records';
import {
  getMonthActivitySummaries,
  getTodayActivitySummary,
  TodayActivitySummary,
} from '../services/appleHealth';
import { computeStreak } from '../utils/streak';
import { monthlySummary, totalDistanceLabel } from '../utils/summary';
import { avgPaceSecPer100m, avgStrokeCount, avgSwolf, totalDistanceMeters } from '../utils/stats';
import { formatPace } from '../utils/pace';
import { currentYearMonth, formatMonthLabel, formatDateLabel, todayString } from '../utils/date';
import { CalendarStackParamList } from '../navigation/types';

const RECENT_COUNT = 5;

type Props = NativeStackScreenProps<CalendarStackParamList, 'CalendarHome'>;

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

export default function CalendarScreen({ navigation }: Props) {
  const [records, setRecords] = useState<SwimRecord[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(currentYearMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [todayActivity, setTodayActivity] = useState<TodayActivitySummary>({
    activeCalories: 0,
    swimMeters: 0,
  });
  const [monthActivity, setMonthActivity] = useState<Record<string, TodayActivitySummary>>({});

  useFocusEffect(
    useCallback(() => {
      getAllRecords().then(setRecords);
      getTodayActivitySummary(todayString()).then((summary) => {
        if (summary) setTodayActivity(summary);
      });
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      getMonthActivitySummaries(visibleMonth).then(setMonthActivity);
    }, [visibleMonth])
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
  const selectedDaySwimMeters = selectedRecords.reduce((sum, r) => sum + (r.distanceMeters ?? 0), 0);
  const selectedDayCalories = selectedDate ? monthActivity[selectedDate]?.activeCalories ?? 0 : 0;
  const header = todayHeaderParts();

  const totalDistance = useMemo(() => totalDistanceMeters(records), [records]);
  const swolf = useMemo(() => avgSwolf(records), [records]);
  const strokeCount = useMemo(() => avgStrokeCount(records), [records]);
  const pace = useMemo(() => avgPaceSecPer100m(records), [records]);

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

        <View style={styles.ringsCard}>
          <ActivityRings activeCalories={todayActivity.activeCalories} swimMeters={todayActivity.swimMeters} />
        </View>

        <TouchableOpacity
          style={styles.addRecordBtn}
          onPress={() => navigation.navigate('RecordForm')}
        >
          <NotingIcon color={colors.white} size={18} />
          <Text style={styles.addRecordBtnText}>오늘 수영 +</Text>
        </TouchableOpacity>

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
              const dayRecords = recordsByDate.get(date.dateString) ?? [];
              const daySwimMeters = dayRecords.reduce((sum, r) => sum + (r.distanceMeters ?? 0), 0);
              const dayCalories = monthActivity[date.dateString]?.activeCalories ?? 0;
              const isToday = date.dateString === todayString();
              return (
                <TouchableOpacity style={styles.dayCell} onPress={() => setSelectedDate(date.dateString)}>
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
                  <MiniActivityRing activeCalories={dayCalories} swimMeters={daySwimMeters} />
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={styles.distanceCard}>
          <Text style={styles.distanceText}>{distanceLabel}</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatTile
            label="누적거리"
            value={totalDistance >= 1000 ? `${(totalDistance / 1000).toFixed(1)}km` : `${totalDistance}m`}
            onPress={() => navigation.navigate('StatDetail', { metric: 'distance', allRecords: records })}
          />
          <StatTile
            label="SWOLF 추이"
            value={swolf != null ? `${Math.round(swolf)}` : '-'}
            onPress={() => navigation.navigate('StatDetail', { metric: 'swolf', allRecords: records })}
          />
          <StatTile
            label="스트로크 효율"
            value={strokeCount != null ? `평균 ${Math.round(strokeCount)}회` : '-'}
            onPress={() => navigation.navigate('StatDetail', { metric: 'strokes', allRecords: records })}
          />
          <StatTile
            label="내 평균 기록"
            value={pace != null ? formatPace(Math.round(pace)) : '-'}
            onPress={() => navigation.navigate('StatDetail', { metric: 'averages', allRecords: records })}
          />
        </View>

        {recentRecords.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.recentTitle}>최근 기록</Text>
            {recentRecords.map((r) => (
              <RecordCard key={r.id} record={r} />
            ))}
          </View>
        )}

        <RoutineRecommendations />
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

            <ScrollView>
              <View style={styles.modalRingRow}>
                <ActivityRings activeCalories={selectedDayCalories} swimMeters={selectedDaySwimMeters} />
              </View>

              {selectedRecords.length > 0 ? (
                selectedRecords.map((r) => (
                  <RecordCard
                    key={r.id}
                    record={r}
                    onPress={() => {
                      setSelectedDate(null);
                      navigation.navigate('RecordDetail', { id: r.id });
                    }}
                  />
                ))
              ) : (
                <Text style={styles.modalEmpty}>이 날은 남긴 수영 기록이 없어요.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

function StatTile({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.statTile} onPress={onPress}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </TouchableOpacity>
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
  ringsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  addRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.hairline,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  addRecordBtnText: { fontFamily: fonts.bold, color: colors.white, fontSize: 15 },
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
  distanceCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  distanceText: { color: colors.blueSea, fontFamily: fonts.bold, fontSize: 15 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  statTile: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  statLabel: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 12 },
  statValue: { fontFamily: fonts.bold, color: colors.text, fontSize: 18, marginTop: 4 },
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
  modalRingRow: { alignItems: 'center', marginBottom: spacing.sm },
  modalEmpty: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
