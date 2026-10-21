import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse } from 'react-native-svg';
import { colors, fonts } from '../theme';

interface Props {
  onFinish: () => void;
}

// 로딩 화면: 북극곰이 물 위를 떠다니는 장면.
// 그림(assets/landing)은 물 배경과 곰을 따로 잘라둔 두 장이라, 물은 천천히 흐르고 곰은 따로 둥실거린다.
// 아래 숫자는 그 이미지들의 픽셀 좌표다.
const BG_W = 1003;
const BG_H = 1534;
const PAINTING_W = 1003; // 배경 이미지에서 그림이 차지하는 폭
const BEAR = { x: 259, y: 499, w: 525, h: 472 };
const BEAR_CENTER = { x: 509, y: 742 };
// 화면 폭에 그림의 이 비율만 보이게 확대한다(곰이 화면 폭의 70% 안팎으로 크게 보인다).
const VISIBLE_RATIO = 0.74;

const DISPLAY_MS = 3400;
const FADE_MS = 500;

/** 곰 몸통 둘레로 퍼져나가는 물결 한 겹. */
function Ripple({ cx, cy, size, delay }: { cx: number; cy: number; size: number; delay: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 3800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx - size / 2,
        top: cy - size * 0.32,
        width: size,
        height: size * 0.64,
        opacity: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.65, 0] }),
        // 곰 몸이 누운 방향(왼쪽 위 → 오른쪽 아래)과 같게 기울인다.
        transform: [{ rotate: '32deg' }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] }) }],
      }}
    >
      <Svg width={size} height={size * 0.64}>
        <Ellipse cx={size / 2} cy={size * 0.32} rx={size / 2 - 2} ry={size * 0.32 - 2} stroke="rgba(255,255,255,0.8)" strokeWidth={2} fill="none" />
      </Svg>
    </Animated.View>
  );
}

/** 곰 옆에서 떠오르는 작은 거품. */
function Bubble({ x, y, size, delay, duration }: { x: number; y: number; size: number; delay: number; duration: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay, duration]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.9)',
        backgroundColor: 'rgba(255,255,255,0.25)',
        opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.5, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -90] }) },
          { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 6, -4] }) },
        ],
      }}
    />
  );
}

/** 0 ↔ 1을 사인 곡선으로 오가는 값 (자연스럽게 출렁이는 느낌). */
function useSway(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration, delay]);
  return v;
}

export default function LandingScreen({ onFinish }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const screenFade = useRef(new Animated.Value(1)).current;
  const paintFade = useRef(new Animated.Value(0)).current;
  const wordFade = useRef(new Animated.Value(0)).current;
  const wordRise = useRef(new Animated.Value(14)).current;

  // 화면을 덮도록(가로 74%만 보이게, 세로가 모자라면 더 키워서) 그림 크기와 위치를 정한다.
  const layout = useMemo(() => {
    const s = Math.max(W / (VISIBLE_RATIO * PAINTING_W), H / BG_H);
    const left = (W - BG_W * s) / 2;
    const top = (H - BG_H * s) / 2;
    return {
      s,
      left,
      top,
      imgW: BG_W * s,
      imgH: BG_H * s,
      bear: { left: left + BEAR.x * s, top: top + BEAR.y * s, w: BEAR.w * s, h: BEAR.h * s },
      cx: left + BEAR_CENTER.x * s,
      cy: top + BEAR_CENTER.y * s,
    };
  }, [W, H]);

  // 물: 아주 천천히 흐르듯 움직이고, 겹쳐 놓은 두 번째 물이 반짝임을 만든다.
  const driftX = useSway(7000);
  const driftY = useSway(9000, 600);
  const shimmer = useSway(3200);
  // 곰: 위아래로 둥실, 살짝 기울고, 옆으로 조금씩 밀린다. 주기를 다르게 해서 규칙적으로 안 보이게.
  const bob = useSway(2300);
  const tilt = useSway(3100, 400);
  const sway = useSway(4100, 900);

  useEffect(() => {
    Animated.timing(paintFade, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    Animated.parallel([
      Animated.timing(wordFade, { toValue: 1, duration: 700, delay: 500, useNativeDriver: true }),
      Animated.timing(wordRise, { toValue: 0, duration: 700, delay: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(screenFade, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [paintFade, wordFade, wordRise, screenFade, onFinish]);

  const { s } = layout;
  const waterStyle = {
    position: 'absolute' as const,
    left: layout.left,
    top: layout.top,
    width: layout.imgW,
    height: layout.imgH,
  };

  return (
    // 네이티브 스플래시와 같은 바탕색에서 시작해서, 그림이 서서히 나타난다.
    <Animated.View style={[styles.fill, { opacity: screenFade }]}>
      <Animated.View style={[styles.fill, { opacity: paintFade }]}>
        <Animated.View
          style={[
            waterStyle,
            {
              transform: [
                { scale: 1.05 },
                { translateX: driftX.interpolate({ inputRange: [0, 1], outputRange: [-18 * s, 18 * s] }) },
                { translateY: driftY.interpolate({ inputRange: [0, 1], outputRange: [-12 * s, 12 * s] }) },
              ],
            },
          ]}
        >
          <Image source={require('../../assets/landing/water.jpg')} style={styles.fill} />
          {/* 좌우를 뒤집은 물을 반투명하게 겹쳐서 물결이 일렁이며 반짝이게 한다. */}
          <Animated.Image
            source={require('../../assets/landing/water.jpg')}
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.2] }),
                transform: [{ scaleX: -1 }, { translateY: shimmer.interpolate({ inputRange: [0, 1], outputRange: [6 * s, -6 * s] }) }],
              },
            ]}
          />
        </Animated.View>

        {/* 곰 둘레로 퍼지는 물결과 거품 */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Ripple cx={layout.cx} cy={layout.cy} size={layout.bear.w * 0.95} delay={0} />
          <Ripple cx={layout.cx} cy={layout.cy} size={layout.bear.w * 0.95} delay={1300} />
          <Ripple cx={layout.cx} cy={layout.cy} size={layout.bear.w * 0.95} delay={2600} />
          <Bubble x={layout.bear.left + layout.bear.w * 0.12} y={layout.bear.top + layout.bear.h * 0.78} size={9} delay={300} duration={2800} />
          <Bubble x={layout.bear.left + layout.bear.w * 0.9} y={layout.bear.top + layout.bear.h * 0.55} size={12} delay={1200} duration={3200} />
          <Bubble x={layout.bear.left + layout.bear.w * 0.32} y={layout.bear.top + layout.bear.h * 0.95} size={7} delay={2000} duration={2600} />
        </View>

        {/* 곰 */}
        <Animated.Image
          source={require('../../assets/landing/bear.png')}
          style={{
            position: 'absolute',
            left: layout.bear.left,
            top: layout.bear.top,
            width: layout.bear.w,
            height: layout.bear.h,
            transform: [
              { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [8 * s, -10 * s] }) },
              { translateX: sway.interpolate({ inputRange: [0, 1], outputRange: [-6 * s, 6 * s] }) },
              { rotate: tilt.interpolate({ inputRange: [0, 1], outputRange: ['-1.6deg', '1.6deg'] }) },
              { scale: bob.interpolate({ inputRange: [0, 1], outputRange: [0.995, 1.012] }) },
            ],
          }}
        />

        {/* 글씨가 읽히도록 아래쪽만 살짝 어둡게 */}
        <LinearGradient pointerEvents="none" colors={['rgba(11,42,74,0)', 'rgba(11,42,74,0.5)']} style={styles.bottomShade} />
        <Animated.View style={[styles.wordWrap, { opacity: wordFade, transform: [{ translateY: wordRise }] }]}>
          <Text style={styles.wordmark}>둥실</Text>
          <Text style={styles.tagline}>수영을 기록하는 감성 다이어리</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 네이티브 스플래시 배경색(app.json)과 같다.
  fill: { flex: 1, backgroundColor: colors.splashBackground, overflow: 'hidden' },
  bottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%' },
  wordWrap: { position: 'absolute', left: 0, right: 0, bottom: 64, alignItems: 'center' },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: 44,
    color: colors.white,
    letterSpacing: 3,
    textShadowColor: 'rgba(11,42,74,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 6,
    textShadowColor: 'rgba(11,42,74,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
