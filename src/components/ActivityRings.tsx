import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts, spacing } from '../theme';

// 개인 목표 설정 기능이 아직 없어서, 애플 건강 링과 비슷한 시각적 진행률을 보여주기 위한
// 기본 참고값. 나중에 목표 설정 기능이 생기면 이 기본값을 사용자 값으로 대체한다.
const DEFAULT_CALORIE_GOAL = 500;
const DEFAULT_SWIM_GOAL_METERS = 1000;

const SIZE = 132;
const STROKE = 14;
const OUTER_R = SIZE / 2 - STROKE / 2;
const INNER_R = OUTER_R - STROKE - 6;

interface RingProps {
  radius: number;
  progress: number; // 0~1
  trackColor: string;
  color: string;
}

function Ring({ radius, progress, trackColor, color }: RingProps) {
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <>
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={STROKE}
        fill="none"
      />
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={radius}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={`${circumference * clamped} ${circumference}`}
        fill="none"
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
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
            radius={OUTER_R}
            progress={activeCalories / calorieGoal}
            trackColor={colors.ringActivityTrack}
            color={colors.ringActivity}
          />
          <Ring
            radius={INNER_R}
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ringWrap: { width: SIZE, height: SIZE },
  legend: { flex: 1, gap: spacing.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.hairline },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13, flex: 1 },
  legendValue: { fontFamily: fonts.bold, color: colors.text, fontSize: 14 },
});
