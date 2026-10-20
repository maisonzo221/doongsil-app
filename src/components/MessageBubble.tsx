import React, { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import type { ChatMessage } from '../storage/social';

// "동작 줄이기"를 켠 사람에게는 애니메이션을 생략한다. 메시지마다 비동기로 물어보면 시작이 늦어지니 한 번만 읽어둔다.
let reduceMotion = false;
AccessibilityInfo.isReduceMotionEnabled().then((v) => {
  reduceMotion = v;
});
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
  reduceMotion = v;
});

interface Props {
  item: ChatMessage;
  mine: boolean;
  nickname: string;
  /** 방금 새로 생긴 메시지면 true — 물방울처럼 떠오르는 효과를 한 번 보여준다. */
  fresh: boolean;
  rowKey: string;
  onAnimated: (rowKey: string) => void;
}

const DOTS = [
  { size: 13, drift: 0, delay: 0, rise: 22 },
  { size: 9, drift: 14, delay: 110, rise: 28 },
  { size: 6, drift: 4, delay: 220, rise: 20 },
];

/** 말풍선 바로 아래에서 작은 공기방울이 뽈뽈 피어나 떠오르다 사라진다. */
function BubbleDots({ mine }: { mine: boolean }) {
  const values = useRef(DOTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      110,
      values.map((v) => Animated.timing(v, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }))
    ).start();
  }, [values]);

  return (
    <View pointerEvents="none" style={[styles.dots, mine ? styles.dotsMine : styles.dotsOther]}>
      {DOTS.map((d, i) => {
        const t = values[i];
        const dir = mine ? -1 : 1;
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: d.size,
                height: d.size,
                borderRadius: d.size / 2,
                marginLeft: dir * d.drift,
                opacity: t.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 0.6, 0] }),
                transform: [
                  { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -d.rise] }) },
                  { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dir * 4, dir * -3] }) },
                  { scale: t.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.2, 1.15, 0.7] }) },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function MessageBubbleBase({ item, mine, nickname, fresh, rowKey, onAnimated }: Props) {
  const animate = fresh && !reduceMotion;
  const rise = useRef(new Animated.Value(animate ? 0 : 1)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const [dots, setDots] = useState(animate);

  useEffect(() => {
    if (!fresh) return;
    if (!animate) {
      onAnimated(rowKey);
      return;
    }
    Animated.parallel([
      // 물 속에서 떠오르듯 아래에서 올라와 살짝 넘쳤다가 자리를 잡는다.
      Animated.spring(rise, { toValue: 1, friction: 5.5, tension: 60, useNativeDriver: true }),
      Animated.sequence(
        [-1, 0.8, -0.5, 0.25, 0].map((toValue) =>
          Animated.timing(wobble, { toValue, duration: 110, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        )
      ),
    ]).start(() => onAnimated(rowKey));
    const timer = setTimeout(() => setDots(false), 1500);
    return () => clearTimeout(timer);
    // 마운트될 때 한 번만 재생한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bubbleStyle = animate
    ? {
        opacity: rise.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
        transformOrigin: mine ? 'right bottom' : 'left bottom',
        transform: [
          { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) },
          { translateX: wobble.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] }) },
          { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
        ],
      }
    : undefined;

  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      {!mine && <Text style={styles.sender}>{nickname}</Text>}
      <Animated.View style={[styles.bubble, mine && styles.bubbleMine, bubbleStyle as object]}>
        {item.type === 'text' && <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>}
        {item.type === 'record_share' && (
          <View>
            <Text style={[styles.shareLabel, mine && styles.bubbleTextMine]}>🏊 수영 기록 공유</Text>
            <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.sharedSummary}</Text>
          </View>
        )}
        {dots && <BubbleDots mine={mine} />}
      </Animated.View>
    </View>
  );
}

const MessageBubble = memo(MessageBubbleBase);
export default MessageBubble;

const styles = StyleSheet.create({
  bubbleRow: { marginBottom: spacing.hairline, alignItems: 'flex-start' },
  bubbleRowMine: { alignItems: 'flex-end' },
  sender: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  bubble: {
    maxWidth: '78%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.hairline + 2,
  },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleText: { fontFamily: fonts.regular, color: colors.text, fontSize: 14 },
  bubbleTextMine: { color: colors.white },
  shareLabel: { fontFamily: fonts.semibold, fontSize: 12, marginBottom: 2 },
  dots: { position: 'absolute', top: '100%', flexDirection: 'row', alignItems: 'flex-end', gap: 5, paddingTop: 8 },
  dotsMine: { right: 10, flexDirection: 'row-reverse' },
  dotsOther: { left: 10 },
  dot: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1.5,
    borderColor: colors.aqua,
  },
});
