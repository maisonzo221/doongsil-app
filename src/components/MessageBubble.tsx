import React, { memo, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  /** 이 메시지를 아직 안 읽은 사람 수 (카카오톡처럼 말풍선 옆에 숫자로). 0이면 표시하지 않는다. */
  unread?: number;
}

// 말풍선 "밖"(바로 아래)에서 피어나는 작은 공기방울. 말풍선 위로 올라가 겹치지 않고, 아래에서 살짝 떠오르다 사라진다.
const DOTS = [
  { size: 13, drift: 0, rise: 12 },
  { size: 9, drift: 15, rise: 16 },
  { size: 6, drift: 5, rise: 10 },
];

function BubbleDots({ mine }: { mine: boolean }) {
  const values = useRef(DOTS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      120,
      values.map((v) => Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }))
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
                opacity: t.interpolate({ inputRange: [0, 0.18, 0.75, 1], outputRange: [0, 1, 0.85, 0] }),
                transform: [
                  { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [10, -d.rise + 10] }) },
                  { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, dir * 3, dir * -2] }) },
                  { scale: t.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0.2, 1.15, 0.8] }) },
                ],
              },
            ]}
          >
            <View style={[styles.dotShine, { width: d.size * 0.32, height: d.size * 0.32, borderRadius: d.size * 0.16, top: d.size * 0.16, left: d.size * 0.2 }]} />
          </Animated.View>
        );
      })}
    </View>
  );
}

function MessageBubbleBase({ item, mine, nickname, fresh, rowKey, onAnimated, unread = 0 }: Props) {
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

  // 아래에서 위로 살짝 떠오르며 커진다. 공기방울(BubbleDots)은 이 움직임과 따로, 말풍선이 멈춘 자리 바로 아래에서 피어난다.
  const bubbleStyle = animate
    ? {
        opacity: rise.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
        transformOrigin: mine ? 'right bottom' : 'left bottom',
        transform: [
          { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
          { translateX: wobble.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] }) },
          { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) },
        ],
      }
    : undefined;

  const text = [styles.bubbleText, mine && styles.bubbleTextMine];

  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      {!mine && <Text style={styles.sender}>{nickname}</Text>}
      <View style={[styles.line, mine ? styles.lineMine : styles.lineOther]}>
        {mine && unread > 0 && <Text style={[styles.unread, styles.unreadMine]}>{unread}</Text>}
        <View style={styles.bubbleOuter}>
          <Animated.View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, bubbleStyle as object]}>
            {/* 비눗방울처럼 투명한 유리 느낌: 반투명 색 + 무지개빛 번짐 + 윗쪽 반사광 */}
            <LinearGradient
              colors={mine ? GLASS_MINE : GLASS_OTHER}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient colors={SHEEN} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.shine} />
            <View pointerEvents="none" style={styles.glint} />
            <View pointerEvents="none" style={styles.rimLight} />
            {item.type === 'text' && <Text style={text}>{item.text}</Text>}
            {item.type === 'record_share' && (
              <View>
                <Text style={[styles.shareLabel, mine && styles.bubbleTextMine]}>🏊 수영 기록 공유</Text>
                <Text style={text}>{item.sharedSummary}</Text>
              </View>
            )}
          </Animated.View>
          {dots && <BubbleDots mine={mine} />}
        </View>
        {!mine && unread > 0 && <Text style={[styles.unread, styles.unreadOther]}>{unread}</Text>}
      </View>
    </View>
  );
}

const MessageBubble = memo(MessageBubbleBase);
export default MessageBubble;

// 비눗방울 색: 거의 투명한 반투명 유리. 내 말풍선은 푸른 기운, 상대 말풍선은 흰 기운이 돈다.
const GLASS_MINE = ['rgba(53,195,214,0.36)', 'rgba(10,120,166,0.26)'] as const;
const GLASS_OTHER = ['rgba(255,255,255,0.78)', 'rgba(205,236,246,0.36)'] as const;
const SHEEN = ['rgba(255,170,205,0.16)', 'rgba(255,255,255,0)', 'rgba(125,205,255,0.2)'] as const;

const styles = StyleSheet.create({
  bubbleRow: { marginBottom: spacing.hairline, alignItems: 'flex-start' },
  bubbleRowMine: { alignItems: 'flex-end' },
  sender: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  bubbleOuter: { maxWidth: '78%', flexShrink: 1 },
  // 말풍선 + 안 읽은 사람 수. 내 메시지는 숫자가 왼쪽, 상대 메시지는 오른쪽(카카오톡과 같다).
  line: { flexDirection: 'row', alignItems: 'flex-end', maxWidth: '100%' },
  lineMine: { alignSelf: 'flex-end' },
  lineOther: { alignSelf: 'flex-start' },
  unread: { fontFamily: fonts.bold, color: colors.blueSea, fontSize: 11, marginBottom: 3 },
  unreadMine: { marginRight: 5 },
  unreadOther: { marginLeft: 5 },
  // 안쪽 여백은 예전(가로 8, 세로 6)보다 2씩 늘렸다.
  bubble: {
    borderRadius: 20,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.hairline + 4,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  bubbleMine: { borderColor: 'rgba(255,255,255,0.85)' },
  bubbleOther: { borderColor: 'rgba(110,200,222,0.75)' },
  bubbleText: { fontFamily: fonts.regular, color: colors.text, fontSize: 14 },
  bubbleTextMine: { color: colors.deepSea },
  shareLabel: { fontFamily: fonts.semibold, fontSize: 12, marginBottom: 2, color: colors.text },
  // 윗쪽 반사광(길쭉한 하이라이트), 작은 점 반사, 아랫쪽 테두리 빛
  shine: { position: 'absolute', top: 3, left: 10, width: 15, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.9)', transform: [{ rotate: '-12deg' }] },
  glint: { position: 'absolute', top: 3, left: 28, width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.85)' },
  rimLight: { position: 'absolute', bottom: 2, right: 12, width: 12, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.6)' },
  dots: { position: 'absolute', top: '100%', flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  dotsMine: { right: 12, flexDirection: 'row-reverse' },
  dotsOther: { left: 12 },
  dot: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1.4,
    borderColor: 'rgba(53,195,214,0.9)',
  },
  dotShine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.95)' },
});
