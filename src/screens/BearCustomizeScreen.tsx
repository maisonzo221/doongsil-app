import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenBackground from '../components/ScreenBackground';
import BearSprite from '../components/bear/BearSprite';
import { ITEMS, ItemId, LEVEL_NAMES } from '../data/missions';
import { ITEM_IMAGES } from '../data/itemImages';
import { levelOf, setEquipped, useBearState } from '../storage/bear';
import type { Equipped } from '../storage/bear';
import { colors, fonts, radius, spacing } from '../theme';

// 내 둥실곰 꾸미기: 가진 아이템을 골라 입힌다. 곰을 누르면 서서 자유형 팔돌리기 연습을 한다.

interface Slot {
  key: string;
  label: string;
  items: ItemId[];
  /** 지금 이 칸에서 입고 있는 아이템 */
  selected: (e: Equipped) => ItemId | null;
  /** 아이템을 입거나 벗을 때 바꿀 값 */
  patch: (id: ItemId | null) => Partial<Equipped>;
}

const SLOTS: Slot[] = [
  {
    key: 'suit',
    label: '수영복',
    items: ['trunks', 'onepiece'],
    selected: (e) => e.suit,
    patch: (id) => ({ suit: id as Equipped['suit'] }),
  },
  { key: 'goggles', label: '수경', items: ['goggles'], selected: (e) => (e.goggles ? 'goggles' : null), patch: (id) => ({ goggles: id === 'goggles' }) },
  { key: 'cap', label: '수모', items: ['cap'], selected: (e) => (e.cap ? 'cap' : null), patch: (id) => ({ cap: id === 'cap' }) },
  { key: 'medal', label: '메달', items: ['medal'], selected: (e) => (e.medal ? 'medal' : null), patch: (id) => ({ medal: id === 'medal' }) },
];

export default function BearCustomizeScreen() {
  const bear = useBearState();
  const level = levelOf(bear);

  return (
    <ScreenBackground edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient colors={['#8EDAF0', '#3FB1DE']} style={styles.stage}>
          <BearSprite mode="idle" height={300} equipped={bear.equipped} interactive />
          <Text style={styles.stageHint}>곰을 눌러보세요! 서서 자유형 연습을 해요</Text>
        </LinearGradient>

        <Text style={styles.levelText}>
          Lv.{level} {LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)]}
        </Text>

        {SLOTS.map((slot) => {
          const current = slot.selected(bear.equipped);
          return (
            <View key={slot.key} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{slot.label}</Text>
                {current && (
                  <Pressable onPress={() => setEquipped(slot.patch(null))} hitSlop={8}>
                    <Text style={styles.takeOff}>벗기</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.tiles}>
                {slot.items.map((id) => {
                  const owned = bear.owned.includes(id);
                  const on = current === id;
                  return (
                    <Pressable
                      key={id}
                      disabled={!owned}
                      onPress={() => setEquipped(slot.patch(on ? null : id))}
                      style={[styles.tile, on && styles.tileOn, !owned && styles.tileLocked]}
                      accessibilityRole="button"
                      accessibilityLabel={`${ITEMS[id].name}${owned ? '' : ' (미션 보상)'}`}
                    >
                      <View style={styles.thumb}>
                        <Image source={ITEM_IMAGES[id]} style={[styles.thumbImg, !owned && { opacity: 0.25 }]} resizeMode="contain" />
                        {!owned && <Text style={styles.lock}>🔒</Text>}
                      </View>
                      <Text style={styles.tileName} numberOfLines={2}>
                        {ITEMS[id].name}
                      </Text>
                      <Text style={[styles.tileState, on && styles.tileStateOn]}>{!owned ? '미션 보상' : on ? '입는 중' : '입기'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  stage: { borderRadius: radius.lg, alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs },
  stageHint: { fontFamily: fonts.semibold, color: colors.white, fontSize: 12, marginTop: 4 },
  levelText: { fontFamily: fonts.bold, color: colors.blueSea, fontSize: 14, textAlign: 'center', marginVertical: spacing.xs },
  section: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.xs },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  sectionTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: 15 },
  takeOff: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 13 },
  tiles: { flexDirection: 'row', gap: spacing.xs },
  tile: { flex: 1, alignItems: 'center', backgroundColor: colors.cardSoft, borderRadius: radius.md, padding: spacing.xs, borderWidth: 2, borderColor: 'transparent' },
  tileOn: { borderColor: colors.primary, backgroundColor: '#E1F4FB' },
  tileLocked: { opacity: 0.9 },
  thumb: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#CFEBF6', alignItems: 'center', justifyContent: 'center' },
  thumbImg: { width: 64, height: 64 },
  lock: { position: 'absolute', fontSize: 22 },
  tileName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 12, marginTop: 6, textAlign: 'center' },
  tileState: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 11, marginTop: 2 },
  tileStateOn: { color: colors.primary, fontFamily: fonts.bold },
});
