import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../components/ScreenBackground';
import RecordCard from '../components/RecordCard';
import { colors, fonts, radius, spacing } from '../theme';
import { CalendarStackParamList } from '../navigation/types';
import { SwimRecord } from '../types';
import { formatPace } from '../utils/pace';
import {
  PERIOD_LABEL,
  StatPeriod,
  avgCalories,
  avgPaceSecPer100m,
  avgStrokeCount,
  avgSwolf,
  recordsInPeriod,
  totalDistanceMeters,
} from '../utils/stats';

type Props = NativeStackScreenProps<CalendarStackParamList, 'StatDetail'>;

const PERIODS: StatPeriod[] = ['week', 'month', 'year'];

const METRIC_TITLE: Record<Props['route']['params']['metric'], string> = {
  distance: '누적 거리',
  swolf: 'SWOLF 추이',
  strokes: '스트로크 효율',
  averages: '내 평균 기록',
};

function distanceLabel(meters: number): string {
  if (meters === 0) return '0m';
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${meters}m`;
}

export default function StatDetailScreen({ route, navigation }: Props) {
  const { metric, allRecords } = route.params;
  const [period, setPeriod] = useState<StatPeriod>('week');

  const records = useMemo(() => recordsInPeriod(allRecords, period), [allRecords, period]);

  const headline = useMemo(() => {
    switch (metric) {
      case 'distance':
        return distanceLabel(totalDistanceMeters(records));
      case 'swolf': {
        const v = avgSwolf(records);
        return v != null ? `${Math.round(v)}` : '-';
      }
      case 'strokes': {
        const v = avgStrokeCount(records);
        return v != null ? `평균 ${Math.round(v)}회` : '-';
      }
      case 'averages':
        return null;
    }
  }, [metric, records]);

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{'‹ 닫기'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{METRIC_TITLE[metric]}</Text>
      </View>

      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, p === period && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, p === period && styles.periodTextActive]}>
              {PERIOD_LABEL[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {metric === 'averages' ? (
        <View style={styles.averagesGrid}>
          <AverageTile label="SWOLF" value={avgSwolf(records)} format={(v) => `${Math.round(v)}`} />
          <AverageTile
            label="거리"
            value={totalDistanceMeters(records) / Math.max(1, records.length)}
            format={(v) => distanceLabel(Math.round(v))}
          />
          <AverageTile
            label="페이스"
            value={avgPaceSecPer100m(records)}
            format={(v) => formatPace(Math.round(v))}
          />
          <AverageTile
            label="칼로리"
            value={avgCalories(records)}
            format={(v) => `${Math.round(v)}kcal`}
          />
        </View>
      ) : (
        <View style={styles.headlineCard}>
          <Text style={styles.headlineValue}>{headline}</Text>
          <Text style={styles.headlineCaption}>
            {PERIOD_LABEL[period]} · 기록 {records.length}개
          </Text>
        </View>
      )}

      <FlatList
        data={records}
        keyExtractor={(r: SwimRecord) => r.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <RecordCard
            record={item}
            onPress={() => navigation.navigate('RecordDetail', { id: item.id })}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>이 기간에는 기록이 없어요.</Text>}
      />
    </ScreenBackground>
  );
}

function AverageTile({
  label,
  value,
  format,
}: {
  label: string;
  value?: number;
  format: (v: number) => string;
}) {
  return (
    <View style={styles.averageTile}>
      <Text style={styles.averageLabel}>{label}</Text>
      <Text style={styles.averageValue}>{value != null ? format(value) : '-'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  back: { color: colors.blueSea, fontFamily: fonts.semibold, marginBottom: spacing.xs },
  title: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.hairline,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  periodBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
  },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 13 },
  periodTextActive: { color: colors.white },
  headlineCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headlineValue: { fontFamily: fonts.bold, color: colors.text, fontSize: 36 },
  headlineCaption: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginTop: spacing.hairline },
  averagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  averageTile: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  averageLabel: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 12 },
  averageValue: { fontFamily: fonts.bold, color: colors.text, fontSize: 20, marginTop: 4 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  empty: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
