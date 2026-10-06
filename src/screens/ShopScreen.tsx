import React from 'react';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import { colors, fonts, radius, spacing } from '../theme';
import { SHOP_NEWS } from '../data/shopNews';

function formatNewsDate(dateString: string): string {
  const [y, m, d] = dateString.split('-');
  return `${y}.${m}.${d}`;
}

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
          <Text style={styles.bannerTitle}>샵 준비중이에요.</Text>
          <Text style={styles.bannerSubtitle}>
            둥실과 함께할 굿즈를 준비하고 있어요.{'\n'}조금만 기다려주세요!
          </Text>
        </View>

        <Text style={styles.sectionTitle}>신제품뉴스</Text>
        {SHOP_NEWS.map((article) => (
          <TouchableOpacity
            key={article.id}
            style={styles.newsCard}
            onPress={() => Linking.openURL(article.link)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: article.imageUrl }} style={styles.newsImage} resizeMode="cover" />
            <View style={styles.newsBrandBadge}>
              <Text style={styles.newsBrandText}>{article.brand}</Text>
            </View>
            <View style={styles.newsBody}>
              <View style={styles.newsTitleRow}>
                <Text style={styles.newsTitle}>{article.title}</Text>
                <Text style={styles.newsPrice}>{article.price}</Text>
              </View>
              <Text style={styles.newsSummary}>{article.summary}</Text>
              <View style={styles.newsFooterRow}>
                <Text style={styles.newsSource}>
                  {article.source} · {formatNewsDate(article.date)} 확인
                </Text>
                <Text style={styles.newsLink}>구매하러 가기 →</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>곧 만나요</Text>
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
  title: { fontSize: 28, fontFamily: fonts.bold, color: colors.text, marginBottom: spacing.sm },
  banner: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  bannerEmoji: { fontSize: 40, marginBottom: spacing.sm },
  bannerTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.text, marginBottom: 4 },
  bannerSubtitle: { color: colors.textMuted, fontFamily: fonts.regular, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontFamily: fonts.bold, color: colors.text, marginBottom: spacing.xs },
  sectionTitleSpaced: { marginTop: spacing.lg },
  newsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  newsImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.cardSoft },
  newsBrandBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: 'rgba(10,51,88,0.65)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.hairline + 2,
    paddingVertical: 2,
  },
  newsBrandText: { fontFamily: fonts.bold, color: colors.white, fontSize: 11 },
  newsBody: { padding: spacing.sm },
  newsTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.hairline },
  newsTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 15, flex: 1 },
  newsPrice: { fontFamily: fonts.bold, color: colors.primary, fontSize: 14, flexShrink: 0 },
  newsSummary: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  newsFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  newsSource: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 11 },
  newsLink: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 12 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    opacity: 0.7,
  },
  itemEmoji: { fontSize: 24, marginRight: spacing.sm },
  itemLabel: { flex: 1, color: colors.text, fontFamily: fonts.semibold },
  soonBadge: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  soonBadgeText: { color: colors.blueSea, fontSize: 11, fontFamily: fonts.enSemibold },
});
