import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import WaterDrop from '../components/WaterDrop';
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

function Wave({ color, baseY, amplitude, speed, opacity }: {
  color: string;
  baseY: number;
  amplitude: number;
  speed: number;
  opacity: number;
}) {
  const phase = useRef(new Animated.Value(0)).current;
  const pathA = `M0,${baseY} C 100,${baseY - amplitude} 300,${baseY + amplitude} 400,${baseY} L400,400 L0,400 Z`;
  const pathB = `M0,${baseY} C 100,${baseY + amplitude} 300,${baseY - amplitude} 400,${baseY} L400,400 L0,400 Z`;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const loop = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: speed,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [phase, speed]);

  const d = phase.interpolate({ inputRange: [0, 1], outputRange: [pathA, pathB] });

  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 400" style={StyleSheet.absoluteFill}>
      {Platform.OS === 'web' ? (
        <Path d={pathA} fill={color} opacity={opacity} />
      ) : (
        <AnimatedPath d={d as unknown as string} fill={color} opacity={opacity} />
      )}
    </Svg>
  );
}

export default function LandingScreen({ onFinish }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(screenFade, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, DISPLAY_MS);

    return () => clearTimeout(timer);
  }, [fade, scale, screenFade, onFinish]);

  return (
    <Animated.View style={[styles.fill, { opacity: screenFade }]}>
      <LinearGradient
        colors={[colors.emerald, colors.blueSea, colors.deepSea]}
        style={styles.fill}
      >
        <Wave color={colors.blueSea} baseY={260} amplitude={18} speed={5200} opacity={0.5} />
        <Wave color={colors.deepSea} baseY={300} amplitude={14} speed={6800} opacity={0.6} />

        <View style={styles.center}>
          <Animated.View
            style={[
              styles.logoWrap,
              { opacity: fade, transform: [{ scale }] },
            ]}
          >
            <View style={styles.logoCircle}>
              <WaterDrop color={colors.white} size={44} />
            </View>
            <Text style={styles.wordmark}>둥실</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center' },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: colors.white,
    letterSpacing: 2,
  },
});
