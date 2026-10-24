import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BearStamp from './BearStamp';
import { BUY_GEAR_LIST, ETIQUETTE_LIST, ITEMS, LEVEL_NAMES, MissionDef, TIERS } from '../data/missions';
import { ITEM_IMAGES } from '../data/itemImages';
import { autoValue, completeMission, currentTier, levelOf, setEquipped, syncAutoMissions, useBearState } from '../storage/bear';
import type { CompleteResult, SwimStats } from '../storage/bear';
import { colors, fonts, radius, spacing } from '../theme';

interface Props {
  /** 지금까지 남긴 수영 기록에서 뽑은 값(횟수·누적 거리·영법) — 기록으로 확인되는 미션을 자동으로 완료하는 데 쓴다. */
  stats: SwimStats;
  onAddRecord: () => void;
  onOpenCustomize: () => void;
}

/** 도장 칸: 찍히면 곰 얼굴 도장이 쾅 찍힌다. */
function StampSlot({ done, isNext }: { done: boolean; isNext: boolean }) {
  const press = useRef(new Animated.Value(done ? 1 : 0)).current;
  const wasDone = useRef(done);
  useEffect(() => {
    if (done && !wasDone.current) {
      press.setValue(0);
      Animated.spring(press, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
    } else if (!done) {
      press.setValue(0);
    }
    wasDone.current = done;
  }, [done, press]);

  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isNext) {
      glow.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isNext, glow]);

  return (
    <View style={[styles.slot, isNext && styles.slotNext, done && styles.slotDone]}>
      {isNext && <Animated.View pointerEvents="none" style={[styles.slotGlow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.6] }) }]} />}
      {done && (
        <Animated.View
          style={{
            opacity: press.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
            transform: [
              { scale: press.interpolate({ inputRange: [0, 1], outputRange: [2.2, 1] }) },
              { rotate: press.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
            ],
          }}
        >
          <BearStamp size={38} />
        </Animated.View>
      )}
    </View>
  );
}

export default function MissionCard({ stats, onAddRecord, onOpenCustomize }: Props) {
  const bear = useBearState();
  const progress = currentTier(bear);
  const level = levelOf(bear);
  const tier = progress?.tier ?? TIERS[TIERS.length - 1];
  const nextIndex = progress ? progress.nextIndex : tier.missions.length;
  const doneCount = tier.missions.filter((m) => bear.done[m.id]).length;

  const [detail, setDetail] = useState<MissionDef | null>(null);
  const [reward, setReward] = useState<CompleteResult | null>(null);
  const [busy, setBusy] = useState(false);

  // 기록이 쌓이면 기록으로 확인되는 미션(첫 수영·횟수·거리·영법)을 (순서가 되었을 때) 자동으로 완료한다.
  useEffect(() => {
    if (stats.count <= 0) return;
    syncAutoMissions(stats).then((r) => r && setReward(r));
  }, [stats, bear.done]);

  async function handleComplete(m: MissionDef) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await completeMission(m.id);
      setDetail(null);
      if (result) {
        // 도장이 찍히는 모습을 먼저 보여주고 보상 창을 연다.
        setTimeout(() => result.gained.length > 0 && setReward(result), 650);
      }
    } finally {
      setBusy(false);
    }
  }

  const hint = progress
    ? `다음 미션: ${tier.missions[nextIndex].title} · 글씨를 눌러보세요`
    : `모든 단계를 마쳤어요! ${tier.name} 둥실곰이 되었어요 🎉`;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>미션</Text>
          <View style={styles.tierChip}>
            <Text style={styles.tierChipText}>{tier.name}</Text>
          </View>
        </View>
        <View style={styles.levelBox}>
          <Text style={styles.levelText}>
            Lv.{level} {LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)]}
          </Text>
          <Text style={styles.countText}>
            {doneCount}/{tier.missions.length}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        {tier.missions.map((m, i) => {
          const done = !!bear.done[m.id];
          const isNext = progress != null && i === nextIndex;
          const locked = !done && !isNext;
          return (
            <View key={m.id} style={styles.col}>
              <Pressable onPress={() => setDetail(m)} hitSlop={6} accessibilityRole="button" accessibilityLabel={m.title}>
                <Text style={[styles.missionTitle, locked && styles.missionTitleLocked, isNext && styles.missionTitleNext]} numberOfLines={3}>
                  {m.label}
                </Text>
              </Pressable>
              <StampSlot done={done} isNext={isNext} />
            </View>
          );
        })}
      </View>

      <View style={styles.hintRow}>
        <Text style={styles.hint} numberOfLines={2}>
          {hint}
        </Text>
        <TouchableOpacity onPress={onOpenCustomize} style={styles.dressBtn}>
          <Text style={styles.dressBtnText}>캐릭터 꾸미기</Text>
        </TouchableOpacity>
      </View>

      {/* 미션 설명 */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {detail && (
              <MissionDetail
                mission={detail}
                done={!!bear.done[detail.id]}
                isNext={progress != null && tier.missions[nextIndex].id === detail.id}
                stats={stats}
                busy={busy}
                onComplete={() => handleComplete(detail)}
                onClose={() => setDetail(null)}
                onAddRecord={() => {
                  setDetail(null);
                  onAddRecord();
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* 보상 */}
      <Modal visible={!!reward} transparent animationType="fade" onRequestClose={() => setReward(null)}>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, styles.rewardSheet]}>
            {reward && (
              <>
                <Text style={styles.rewardTitle}>{reward.tierCompleted ? `${reward.tierCompleted.name} 승급!` : reward.mission.doneMessage}</Text>
                {reward.tierCompleted && <Text style={styles.rewardSub}>Lv.{levelOf(bear)} 둥실곰이 되었어요</Text>}
                {reward.gained.length > 0 && <Text style={styles.rewardSub}>아이템을 받았어요!</Text>}
                <View style={styles.rewardItems}>
                  {reward.gained.map((id) => (
                    <View key={id} style={styles.rewardItem}>
                      <View style={styles.rewardThumb}>
                        <Image source={ITEM_IMAGES[id]} style={styles.rewardImg} resizeMode="contain" />
                      </View>
                      <Text style={styles.rewardName}>{ITEMS[id].name}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.rewardButtonsCol}>
                  <TouchableOpacity style={styles.secondaryBtn} onPress={() => setReward(null)}>
                    <Text style={styles.secondaryBtnText}>확인</Text>
                  </TouchableOpacity>
                  {reward.gained.length > 0 && (
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={async () => {
                        // 받은 아이템 중 바로 입을 수 있는 것을 입혀준다(수영복은 팬티가 기본).
                        const patch: Record<string, unknown> = {};
                        for (const id of reward.gained) {
                          if (id === 'trunks' && !patch.suit) patch.suit = 'trunks';
                          else if (id === 'onepiece' && !patch.suit) patch.suit = 'onepiece';
                          else if (id === 'goggles') patch.goggles = true;
                          else if (id === 'cap') patch.cap = true;
                          else if (id.startsWith('medal')) patch.medal = id;
                        }
                        await setEquipped(patch);
                        setReward(null);
                        onOpenCustomize();
                      }}
                    >
                      <Text style={styles.primaryBtnText}>곰에게 입히러 가기</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MissionDetail({
  mission,
  done,
  isNext,
  stats,
  busy,
  onComplete,
  onClose,
  onAddRecord,
}: {
  mission: MissionDef;
  done: boolean;
  isNext: boolean;
  stats: SwimStats;
  busy: boolean;
  onComplete: () => void;
  onClose: () => void;
  onAddRecord: () => void;
}) {
  const reward = mission.reward.map((id) => ITEMS[id].name).join(', ');
  return (
    <>
      <Text style={styles.detailTitle}>{mission.title}</Text>
      {done && <Text style={styles.doneBadge}>{mission.doneMessage}</Text>}

      <ScrollView style={styles.detailBody}>
        {mission.id === 'buy-gear' && (
          <>
            <Text style={styles.detailLead}>수영장에 가기 전에 이 세 가지를 준비해요.</Text>
            {BUY_GEAR_LIST.map((t) => (
              <Text key={t} style={styles.bullet}>
                • {t}
              </Text>
            ))}
          </>
        )}
        {mission.id === 'etiquette' && (
          <>
            <Text style={styles.detailLead}>모두가 기분 좋게 수영하려면 이것만은 꼭 지켜요.</Text>
            {ETIQUETTE_LIST.map((t, i) => (
              <Text key={t} style={styles.bullet}>
                {i + 1}. {t}
              </Text>
            ))}
          </>
        )}
        {mission.id === 'register-pool' && (
          <Text style={styles.detailLead}>
            다니고 싶은 수영장에 수강 등록을 마쳤다면 눌러주세요. 수영장 찾기에서 가까운 수영장을 찾아볼 수 있어요.
          </Text>
        )}
        {mission.id === 'first-swim' && (
          <Text style={styles.detailLead}>
            수영 기록을 하나 남기면 자동으로 완료돼요. 앞 미션을 먼저 마치면 기록한 날 바로 도장이 찍혀요.
          </Text>
        )}
        {mission.id === 'kickboard' && (
          <Text style={styles.detailLead}>킥판을 잡고 물장구(발차기)를 해보았다면 눌러주세요. 처음이라 어색해도 괜찮아요!</Text>
        )}
        {mission.desc && <Text style={styles.detailLead}>{mission.desc}</Text>}
        {mission.auto && (
          <Text style={styles.progressLine}>
            지금까지 {Math.min(autoValue(mission.auto, stats), mission.auto.target).toLocaleString()} / {mission.auto.target.toLocaleString()}
            {mission.auto.unit}
          </Text>
        )}
        {mission.auto && <Text style={styles.sourceNote}>애플워치로 한 수영과, 오늘의 수영에 직접 남긴 기록이 모두 반영돼요.</Text>}
        {reward ? <Text style={styles.rewardLine}>보상: {reward}</Text> : null}
      </ScrollView>

      <View style={styles.rewardButtons}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onClose}>
          <Text style={styles.secondaryBtnText}>닫기</Text>
        </TouchableOpacity>
        {!done && (mission.kind === 'auto-first-swim' || mission.kind === 'auto-stats') && (
          <TouchableOpacity style={styles.primaryBtn} onPress={onAddRecord}>
            <Text style={styles.primaryBtnText}>수영 기록하러 가기</Text>
          </TouchableOpacity>
        )}
        {!done && mission.kind === 'confirm' && (
          <TouchableOpacity style={[styles.primaryBtn, (!isNext || busy) && styles.btnDisabled]} disabled={!isNext || busy} onPress={onComplete}>
            <Text style={styles.primaryBtnText}>{isNext ? mission.doneLabel : '앞 미션을 먼저 마쳐요'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.hairline + 2 },
  title: { fontFamily: fonts.bold, color: colors.text, fontSize: 16 },
  tierChip: { backgroundColor: colors.cardSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tierChipText: { fontFamily: fonts.bold, color: colors.blueSea, fontSize: 11 },
  levelBox: { alignItems: 'flex-end' },
  levelText: { fontFamily: fonts.semibold, color: colors.blueSea, fontSize: 11 },
  countText: { fontFamily: fonts.bold, color: colors.text, fontSize: 13 },
  row: { flexDirection: 'row', gap: 4 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  missionTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 10, textAlign: 'center', lineHeight: 14, minHeight: 28 },
  missionTitleLocked: { color: colors.textMuted },
  missionTitleNext: { color: colors.primary, textDecorationLine: 'underline' },
  slot: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSoft,
  },
  slotNext: { borderColor: colors.primary },
  slotDone: { borderStyle: 'solid', borderColor: 'rgba(217,59,59,0.35)', backgroundColor: '#FFF6F5' },
  slotGlow: { position: 'absolute', width: 54, height: 54, borderRadius: 27, backgroundColor: colors.aqua },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, marginTop: spacing.xs },
  hint: { flex: 1, fontFamily: fonts.regular, color: colors.textMuted, fontSize: 11 },
  dressBtn: { backgroundColor: colors.cardSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  dressBtnText: { fontFamily: fonts.bold, color: colors.primary, fontSize: 11 },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,42,74,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxHeight: '80%', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md },
  detailTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.text, marginBottom: spacing.hairline },
  doneBadge: { alignSelf: 'flex-start', fontFamily: fonts.bold, color: colors.white, backgroundColor: '#D93B3B', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, fontSize: 12, marginBottom: spacing.xs },
  detailBody: { marginVertical: spacing.xs },
  detailLead: { fontFamily: fonts.regular, color: colors.text, fontSize: 14, lineHeight: 21, marginBottom: spacing.xs },
  bullet: { fontFamily: fonts.medium, color: colors.text, fontSize: 14, lineHeight: 22, marginBottom: 4 },
  progressLine: { fontFamily: fonts.bold, color: colors.blueSea, fontSize: 14, marginVertical: spacing.xs },
  sourceNote: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginBottom: spacing.xs },
  rewardLine: { fontFamily: fonts.semibold, color: colors.blueSea, fontSize: 13, marginTop: spacing.xs },
  rewardButtons: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  rewardButtonsCol: { flexDirection: 'column-reverse', alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.xs },
  primaryBtn: { flex: 1.6, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { fontFamily: fonts.bold, color: colors.white, fontSize: 14 },
  secondaryBtn: { flex: 1, backgroundColor: colors.cardSoft, borderRadius: radius.pill, paddingVertical: 12, alignItems: 'center' },
  secondaryBtnText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 14 },
  btnDisabled: { opacity: 0.45 },
  rewardSheet: { alignItems: 'center' },
  rewardTitle: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, marginBottom: 4 },
  rewardSub: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 13, marginBottom: 4 },
  rewardItems: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  rewardItem: { alignItems: 'center', width: 96 },
  rewardThumb: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.cardSoft, alignItems: 'center', justifyContent: 'center' },
  rewardImg: { width: 64, height: 64 },
  rewardName: { fontFamily: fonts.semibold, color: colors.text, fontSize: 12, marginTop: 6, textAlign: 'center' },
});
