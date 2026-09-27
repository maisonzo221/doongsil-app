import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, spacing } from '../theme';

// 개인 목표 설정 기능이 아직 없어서, 애플 건강 링과 비슷한 시각적 진행률을 보여주기 위한
// 기본 참고값. 나중에 목표 설정 기능이 생기면 이 기본값을 사용자 값으로 대체한다.
const DEFAULT_CALORIE_GOAL = 500;
const DEFAULT_SWIM_GOAL_METERS = 1000;

interface RingProps {
  size: number;
  radius: number;
  strokeWidth: number;
  progress: number; // 0~1
  trackColor: string;
  color: string;
}

function Ring({ size, radius, strokeWidth, progress, trackColor, color }: RingProps) {
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const center = size / 2;
  return (
    <>
      <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${circumference * clamped} ${circumference}`}
        fill="none"
        transform={`rotate(-90 ${center} ${center})`}
      />
    </>
  );
}

interface Props {
  activeCalories: number;
  swimMeters: number;
  calorieGoal?: number;
  swimGoalMeters?: number;
}

const SIZE = 132;
const STROKE = 14;
const OUTER_R = SIZE / 2 - STROKE / 2;
const INNER_R = OUTER_R - STROKE - 6;

export default function ActivityRings({
  activeCalories,
  swimMeters,
  calorieGoal = DEFAULT_CALORIE_GOAL,
  swimGoalMeters = DEFAULT_SWIM_GOAL_METERS,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Ring
            size={SIZE}
            radius={OUTER_R}
            strokeWidth={STROKE}
            progress={activeCalories / calorieGoal}
            trackColor={colors.ringActivityTrack}
            color={colors.ringActivity}
          />
          <Ring
            size={SIZE}
            radius={INNER_R}
            strokeWidth={STROKE}
            progress={swimMeters / swimGoalMeters}
            trackColor={colors.ringSwimTrack}
            color={colors.ringSwim}
          />
        </Svg>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: colors.ringActivity }]} />
          <Text style={styles.legendLabel}>오늘 활동량</Text>
          <Text style={styles.legendValue}>{activeCalories}kcal</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.dot, { backgroundColor: colors.ringSwim }]} />
          <Text style={styles.legendLabel}>오늘 수영량</Text>
          <Text style={styles.legendValue}>{swimMeters}m</Text>
        </View>
      </View>
    </View>
  );
}

interface MiniProps {
  activeCalories: number;
  swimMeters: number;
  calorieGoal?: number;
  swimGoalMeters?: number;
  size?: number;
}

const MINI_STROKE = 2.4;

/** 캘린더 날짜 칸 안에 들어가는 아주 작은 이중 링. */
export function MiniActivityRing({
  activeCalories,
  swimMeters,
  calorieGoal = DEFAULT_CALORIE_GOAL,
  swimGoalMeters = DEFAULT_SWIM_GOAL_METERS,
  size = 20,
}: MiniProps) {
  const outerR = size / 2 - MINI_STROKE / 2;
  const innerR = outerR - MINI_STROKE - 1.5;
  return (
    <Svg width={size} height={size}>
      <Ring
        size={size}
        radius={outerR}
        strokeWidth={MINI_STROKE}
        progress={activeCalories / calorieGoal}
        trackColor={colors.ringActivityTrack}
        color={colors.ringActivity}
      />
      <Ring
        size={size}
        radius={innerR}
        strokeWidth={MINI_STROKE}
        progress={swimMeters / swimGoalMeters}
        trackColor={colors.ringSwimTrack}
        color={colors.ringSwim}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ringWrap: { width: SIZE, height: SIZE },
  legend: { flex: 1, gap: spacing.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.hairline },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13, flex: 1 },
  legendValue: { fontFamily: fonts.bold, color: colors.text, fontSize: 14 },
});
