import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import { colors, radius, spacing } from '../theme';

const COMING_SOON_ITEMS = [
  { emoji: '\u{1F3CA}', label: '둥실 물안경' },
  { emoji: '\u{1F4D3}', label: '수영 다이어리 굿즈' },
  { emoji: '\u{1F9F4}', label: '방수 스티커 팩' },
];

export default function ShopScreen() {
  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>샵</Text>
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>{'\u{1F6DF}'}</Text>
          <Text style={styles.bannerTitle}>샵은 준비 중이에요</Text>
          <Text style={styles.bannerSubtitle}>
            둥실과 함께할 굿즈를 준비하고 있어요.{'\n'}조금만 기다려주세요!
          </Text>
        </View>

        <Text style={styles.sectionTitle}>곧 만나요</Text>
        {COMING_SOON_ITEMS.map((item) => (
          <View key={item.label} style={styles.itemCard}>
            <Text style={styles.itemEmoji}>{item.emoji}</Text>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>Coming soon</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  banner: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  bannerEmoji: { fontSize: 40, marginBottom: spacing.sm },
  bannerTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 4 },
  bannerSubtitle: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    opacity: 0.7,
  },
  itemEmoji: { fontSize: 24, marginRight: spacing.md },
  itemLabel: { flex: 1, color: colors.text, fontWeight: '600' },
  soonBadge: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  soonBadgeText: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
});
