import React, { useMemo, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import { SwimRecord } from '../types';
import WaterDrop from './WaterDrop';
import { colors, fonts, radius, spacing } from '../theme';
import {
  buildDailySeries,
  formatTrendValue,
  movingAverage,
  niceMax,
  summarizeSeries,
  TREND_METRIC_LABEL,
  TrendMetric,
} from '../utils/dailyTrend';

// 매일의 수영을 막대로, 7일 평균을 물결선으로 보여주는 추이 그래프.
// 막대는 물기둥처럼 위는 맑은 물색, 아래는 깊은 물색으로 칠하고, 눌러서(또는 쓸어서) 그날 값을 볼 수 있다.

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

const PLOT_H = 112;
const PAD = { l: 38, r: 8, t: 30, b: 24 };
const CHART_H = PAD.t + PLOT_H + PAD.b;
const TOOLTIP_W = 104;
const LABEL_W = 36;
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

function weekdayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAY[new Date(y, m - 1, d).getDay()];
}

function shortDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}`;
}

/** 꺾이지 않고 부드럽게 이어지는 선(가로 방향 접선). */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const cx = (a.x + b.x) / 2;
    d += ` C${cx},${a.y} ${cx},${b.y} ${b.x},${b.y}`;
  }
  return d;
}

export default function DailyTrendCard({ records }: { records: SwimRecord[] }) {
  const [days, setDays] = useState<Period>(30);
  const [metric, setMetric] = useState<TrendMetric>('distance');
  const [selected, setSelected] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  const series = useMemo(() => buildDailySeries(records, days, metric), [records, days, metric]);
  const avg = useMemo(() => movingAverage(series, 7), [series]);
  const summary = useMemo(() => summarizeSeries(series), [series]);
  const showAvg = days >= 14;

  const rawMax = Math.max(0, ...series.map((p) => p.value), ...(showAvg ? avg : []));
  const yMax = rawMax > 0 ? niceMax(rawMax) : metric === 'distance' ? 1000 : 60;

  const plotW = Math.max(0, width - PAD.l - PAD.r);
  const slot = series.length > 0 ? plotW / series.length : 0;
  const barW = Math.min(22, Math.max(2, slot * 0.62));
  const xAt = (i: number) => PAD.l + (i + 0.5) * slot;
  const yAt = (v: number) => PAD.t + PLOT_H - (v / yMax) * PLOT_H;

  // 첫 기록이 있는 날부터 평균선을 그린다(그 전에는 바닥에 선이 깔려 보이기만 한다).
  const firstSwim = series.findIndex((p) => p.count > 0);
  const avgPoints = firstSwim < 0 ? [] : series.map((_, i) => ({ x: xAt(i), y: yAt(avg[i]) })).slice(firstSwim);

  // 아래 날짜 글씨: 7일은 요일을 전부, 그 이상은 몇 군데만.
  const labelIdx = useMemo(() => {
    if (days <= 7) return series.map((_, i) => i);
    const last = series.length - 1;
    return [0, Math.round(last / 3), Math.round((last * 2) / 3), last];
  }, [days, series]);

  function touch(e: GestureResponderEvent) {
    if (slot <= 0) return;
    const i = Math.floor((e.nativeEvent.locationX - PAD.l) / slot);
    setSelected(Math.min(series.length - 1, Math.max(0, i)));
  }

  const sel = selected != null ? series[selected] : null;
  const yTicks = [0, yMax / 2, yMax];

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <WaterDrop color={colors.aqua} size={16} />
        <Text style={styles.title}>수영 추이</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.segment}>
          {(['distance', 'duration'] as TrendMetric[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, metric === m && styles.chipOn]}
              onPress={() => {
                setMetric(m);
                setSelected(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: metric === m }}
            >
              <Text style={[styles.chipText, metric === m && styles.chipTextOn]}>{TREND_METRIC_LABEL[m]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.segment}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, days === p && styles.chipOn]}
              onPress={() => {
                setDays(p);
                setSelected(null);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: days === p }}
            >
              <Text style={[styles.chipText, days === p && styles.chipTextOn]}>{p}일</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.summaryRow}>
        <SummaryCell label="수영한 날" value={`${summary.swimDays}일`} />
        <SummaryCell label={`${TREND_METRIC_LABEL[metric]} 합계`} value={formatTrendValue(summary.total, metric)} />
        <SummaryCell label="수영한 날 평균" value={summary.swimDays > 0 ? formatTrendValue(summary.avgPerSwimDay, metric) : '-'} />
      </View>

      <View
        style={{ height: CHART_H }}
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={touch}
        onResponderMove={touch}
      >
        {width > 0 && (
          <>
            <Svg width={width} height={CHART_H} pointerEvents="none">
              <Defs>
                <SvgGradient id="trendBar" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.aqua} stopOpacity="1" />
                  <Stop offset="1" stopColor={colors.primary} stopOpacity="0.9" />
                </SvgGradient>
                <SvgGradient id="trendBarSel" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.blueSea} stopOpacity="1" />
                  <Stop offset="1" stopColor={colors.deepSea} stopOpacity="1" />
                </SvgGradient>
              </Defs>

              {yTicks.map((t, i) => (
                <Line
                  key={i}
                  x1={PAD.l}
                  x2={width - PAD.r}
                  y1={yAt(t)}
                  y2={yAt(t)}
                  stroke={colors.border}
                  strokeWidth={1}
                  strokeDasharray={i === 0 ? undefined : '3,4'}
                />
              ))}

              {series.map((p, i) => {
                if (p.value <= 0) {
                  // 쉰 날은 바닥에 작은 점, 거리·시간을 안 적은 기록은 조금 더 진한 점.
                  return <Circle key={p.date} cx={xAt(i)} cy={yAt(0)} r={p.count > 0 ? 2.6 : 1.5} fill={p.count > 0 ? colors.aqua : colors.border} />;
                }
                const h = Math.max(3, yAt(0) - yAt(p.value));
                return (
                  <Rect
                    key={p.date}
                    x={xAt(i) - barW / 2}
                    y={yAt(0) - h}
                    width={barW}
                    height={h}
                    rx={Math.min(barW / 2, 6)}
                    fill={selected === i ? 'url(#trendBarSel)' : 'url(#trendBar)'}
                  />
                );
              })}

              {showAvg && rawMax > 0 && avgPoints.length > 1 && (
                <>
                  <Path d={smoothPath(avgPoints)} stroke={colors.white} strokeWidth={4.2} strokeLinecap="round" fill="none" />
                  <Path d={smoothPath(avgPoints)} stroke={colors.coral} strokeWidth={2.2} strokeLinecap="round" fill="none" />
                </>
              )}

              {sel && selected != null && (
                <Circle cx={xAt(selected)} cy={yAt(sel.value) - 0.5} r={3.4} fill={colors.white} stroke={colors.deepSea} strokeWidth={1.6} />
              )}
            </Svg>

            {yTicks.map((t, i) => (
              <Text key={i} pointerEvents="none" style={[styles.yLabel, { top: yAt(t) - 7 }]}>
                {t === 0 ? '0' : formatTrendValue(t, metric)}
              </Text>
            ))}

            {labelIdx.map((i) => {
              const isToday = i === series.length - 1;
              const left = Math.min(width - LABEL_W, Math.max(0, xAt(i) - LABEL_W / 2));
              const text = isToday ? '오늘' : days <= 7 ? weekdayOf(series[i].date) : shortDate(series[i].date);
              return (
                <Text key={i} pointerEvents="none" style={[styles.xLabel, { left, top: PAD.t + PLOT_H + 6 }, isToday && styles.xLabelToday]}>
                  {text}
                </Text>
              );
            })}

            {sel && selected != null && (
              <View
                pointerEvents="none"
                style={[
                  styles.tooltip,
                  {
                    left: Math.min(width - TOOLTIP_W, Math.max(0, xAt(selected) - TOOLTIP_W / 2)),
                    top: Math.max(0, yAt(sel.value) - 32),
                  },
                ]}
              >
                <Text style={styles.tooltipText} numberOfLines={1}>
                  {shortDate(sel.date)}({weekdayOf(sel.date)}) {sel.count > 0 ? formatTrendValue(sel.value, metric) : '쉬었어요'}
                </Text>
              </View>
            )}

            {summary.swimDays === 0 && (
              <View pointerEvents="none" style={styles.empty}>
                <Text style={styles.emptyText}>이 기간에는 수영 기록이 없어요</Text>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendBar} />
          <Text style={styles.legendText}>하루 {TREND_METRIC_LABEL[metric]}</Text>
        </View>
        {showAvg && (
          <View style={styles.legendItem}>
            <View style={styles.legendLine} />
            <Text style={styles.legendText}>7일 평균</Text>
          </View>
        )}
        <Text style={styles.hint}>막대를 눌러 보세요</Text>
      </View>
    </View>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryCell}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginTop: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.hairline },
  title: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  segment: { flexDirection: 'row', backgroundColor: colors.cardSoft, borderRadius: radius.pill, padding: 3 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 12 },
  chipTextOn: { color: colors.white, fontFamily: fonts.bold },
  summaryRow: { flexDirection: 'row', marginTop: spacing.xs + 2, marginBottom: spacing.hairline },
  summaryCell: { flex: 1 },
  summaryLabel: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 11 },
  summaryValue: { fontFamily: fonts.bold, color: colors.text, fontSize: 16, marginTop: 2 },
  yLabel: { position: 'absolute', left: 0, width: PAD.l - 6, textAlign: 'right', fontFamily: fonts.medium, color: colors.textMuted, fontSize: 10 },
  xLabel: { position: 'absolute', width: LABEL_W, textAlign: 'center', fontFamily: fonts.medium, color: colors.textMuted, fontSize: 10 },
  xLabelToday: { fontFamily: fonts.bold, color: colors.blueSea },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_W,
    backgroundColor: colors.deepSea,
    borderRadius: radius.pill,
    paddingVertical: 4,
    alignItems: 'center',
  },
  tooltipText: { fontFamily: fonts.bold, color: colors.white, fontSize: 11 },
  empty: { position: 'absolute', left: PAD.l, right: PAD.r, top: PAD.t + PLOT_H / 2 - 12, alignItems: 'center' },
  emptyText: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 12 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.hairline },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBar: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.aqua },
  legendLine: { width: 14, height: 3, borderRadius: 2, backgroundColor: colors.coral },
  legendText: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 11 },
  hint: { marginLeft: 'auto', fontFamily: fonts.regular, color: colors.textMuted, fontSize: 11 },
});
