import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import { colors, fonts, radius, spacing } from '../theme';

interface Props {
  title: string;
  emoji: string;
  description: string;
}

// 실제 외부 데이터(유튜브/네이버 API, 지도 API 등) 연동 전까지 쓰는 자리표시자 화면.
export default function ComingSoonScreen({ title, emoji, description }: Props) {
  return (
    <ScreenBackground>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>{title}</Text>
        <View style={styles.banner}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.bannerTitle}>{title} 준비중이에요.</Text>
          <Text style={styles.bannerSubtitle}>{description}</Text>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: spacing.lg },
  pageTitle: { fontSize: 28, fontFamily: fonts.bold, color: colors.text, marginBottom: spacing.sm },
  banner: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  emoji: { fontSize: 40, marginBottom: spacing.sm },
  bannerTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.text, marginBottom: 4 },
  bannerSubtitle: { color: colors.textMuted, fontFamily: fonts.regular, textAlign: 'center', lineHeight: 20 },
});
