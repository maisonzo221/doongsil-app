import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import WaterDrop from './WaterDrop';
import { colors, fonts, radius, spacing } from '../theme';

// 실제 사진/캐릭터 애니메이션이 들어오기 전까지의 자리표시자.
// 날짜(연중 일수)로 팔레트를 골라 매일 다른 느낌을 준다.
// 캡션(흰 글씨)이 아래쪽에 놓이므로 아래쪽 색은 항상 진한 색이어야 글씨가 읽힌다.
const PALETTES: readonly [string, string][] = [
  [colors.aqua, colors.primary],
  [colors.primary, colors.deepSea],
  ['#5BD0DD', colors.blueSea],
  [colors.blueSea, colors.deepSea],
  ['#2FA8C9', colors.splashBackground],
];

const CAPTIONS = [
  '오늘의 수영 명소',
  '잔잔한 아침 수영장',
  '해질녘 바다 수영',
  '한적한 야외 풀',
  '푸른 실내 수영장',
];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

export default function DailyOceanCard() {
  const idx = dayOfYear(new Date()) % PALETTES.length;
  const [from, to] = PALETTES[idx];

  return (
    <LinearGradient colors={[from, to]} style={styles.card}>
      <View style={styles.dropsRow}>
        <WaterDrop color="rgba(255,255,255,0.9)" size={22} />
        <WaterDrop color="rgba(255,255,255,0.5)" size={14} />
      </View>
      <Text style={styles.caption}>{CAPTIONS[idx]}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 96,
    borderRadius: radius.lg,
    padding: spacing.sm,
    justifyContent: 'space-between',
  },
  dropsRow: { flexDirection: 'row', gap: spacing.hairline, alignItems: 'flex-end' },
  caption: {
    fontFamily: fonts.semibold,
    color: colors.white,
    fontSize: 13,
  },
});
