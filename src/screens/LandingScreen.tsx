import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import BrandMark from '../components/BrandMark';
import { colors, fonts } from '../theme';

// react-native-svg's web renderer doesn't support Animated.createAnimatedComponent(Path)
// with a string-interpolated `d` (throws on every render), so the wave only animates
// natively and falls back to a static path on web.
const AnimatedPath = Platform.OS === 'web' ? Path : Animated.createAnimatedComponent(Path);

interface Props {
  onFinish: () => void;
}

const DISPLAY_MS = 2600;
const FADE_MS = 400;
// 네이티브 스플래시(app.json의 imageWidth)와 같은 크기여야 스플래시에서 이 화면으로
// 넘어갈 때 곰 뱃지가 제자리에 그대로 있다.
const BADGE_SIZE = 200;
const WAVE_HEIGHT = 240;

function Wave({ color, baseY, amplitude, speed, opacity }: {
  color: string;
  baseY: number;
  amplitude: number;
  speed: number;
  opacity: number;
}) {
  const phase = useRef(new Animated.Value(0)).current;
  const pathA = `M0,${baseY} C 100,${baseY - amplitude} 300,${baseY + amplitude} 400,${baseY} L400,${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`;
  const pathB = `M0,${baseY} C 100,${baseY + amplitude} 300,${baseY - amplitude} 400,${baseY} L400,${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, { toValue: 1, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(phase, { toValue: 0, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase, speed]);

  const d = phase.interpolate({ inputRange: [0, 1], outputRange: [pathA, pathB] });

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 400 ${WAVE_HEIGHT}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      {Platform.OS === 'web' ? (
        <Path d={pathA} fill={color} opacity={opacity} />
      ) : (
        <AnimatedPath d={d as unknown as string} fill={color} opacity={opacity} />
      )}
    </Svg>
  );
}

// 곰 뱃지 옆에서 천천히 떠오르는 거품.
function Bubble({ left, size, delay, duration }: { left: number; size: number; delay: number; duration: number }) {
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

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -130] });
  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.85, 0.5, 0] });

  return (
    <Animated.View
      style={[
        styles.bubble,
        { left, bottom: 24, width: size, height: size, borderRadius: size / 2, opacity, transform: [{ translateY }] },
      ]}
    />
  );
}

export default function LandingScreen({ onFinish }: Props) {
  const screenFade = useRef(new Animated.Value(1)).current;
  const wordFade = useRef(new Animated.Value(0)).current;
  const wordRise = useRef(new Animated.Value(12)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 곰은 스플래시에서 이미 그 자리에 있으니 따로 등장시키지 않고, 글씨만 떠오르게 한다.
    Animated.parallel([
      Animated.timing(wordFade, { toValue: 1, duration: 600, delay: 250, useNativeDriver: true }),
      Animated.timing(wordRise, { toValue: 0, duration: 600, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // "둥실" — 물 위에서 살짝 오르내리는 느낌.
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -8, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    bobLoop.start();

    const timer = setTimeout(() => {
      Animated.timing(screenFade, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, DISPLAY_MS);

    return () => {
      clearTimeout(timer);
      bobLoop.stop();
    };
  }, [wordFade, wordRise, bob, screenFade, onFinish]);

  return (
    <Animated.View style={[styles.fill, { opacity: screenFade }]}>
      <LinearGradient colors={colors.splashGradient} style={styles.fill}>
        <View style={styles.waves} pointerEvents="none">
          <Wave color={colors.aqua} baseY={90} amplitude={16} speed={2600} opacity={0.35} />
          <Wave color="#0E88B4" baseY={130} amplitude={12} speed={3400} opacity={0.6} />
          <Wave color={colors.deepSea} baseY={170} amplitude={10} speed={2300} opacity={0.75} />
        </View>

        <View style={styles.center} pointerEvents="none">
          <Animated.View style={{ transform: [{ translateY: bob }] }}>
            <View style={styles.stage}>
              <Bubble left={-26} size={10} delay={0} duration={2600} />
              <Bubble left={BADGE_SIZE + 12} size={14} delay={900} duration={3000} />
              <Bubble left={BADGE_SIZE - 6} size={8} delay={1700} duration={2400} />
              <BrandMark size={BADGE_SIZE} uid="landing" />
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.wordWrap, { opacity: wordFade, transform: [{ translateY: wordRise }] }]}>
          <Text style={styles.wordmark}>둥실</Text>
          <Text style={styles.tagline}>수영을 기록하는 감성 다이어리</Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  waves: { position: 'absolute', left: 0, right: 0, bottom: 0, height: WAVE_HEIGHT },
  // 화면 정중앙에 뱃지를 둔다 — 네이티브 스플래시도 이미지를 정중앙에 그린다.
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  stage: { width: BADGE_SIZE, height: BADGE_SIZE },
  bubble: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' },
  wordWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: BADGE_SIZE / 2 + 28,
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: 44,
    color: colors.white,
    letterSpacing: 3,
  },
  tagline: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },
});
