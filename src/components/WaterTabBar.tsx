import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { ClipPath, Defs, Image as SvgImage, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme';

// 하단 메뉴바: 맑은 물이 흐르는 바. 가운데(캘린더) 메뉴가 물 위로 솟아 있고,
// 지금 선택한 메뉴는 물방울 모양 빛이 따라다니며 표시한다.

const WATER_TOP = 18; // 아이콘 줄 위쪽으로 확보한 물 영역 (아이콘 아래 여백과 같게)
const ROW = 60; // 아이콘 줄 높이
const HILL_H = 24; // 가운데 메뉴가 솟아오른 높이
const HILL_B = 66; // 솟아오른 부분의 가로 반폭
// 그림(water.jpg)에서 곰이 없는 물 부분을 잘라 쓴다 (그림 픽셀 좌표).
const PAINT_W = 1003;
const PAINT_H = 1534;
const PAINT_Y = 1040;
const PAINT_SCALE = 0.62;
const WATER = {
  light: '#4FD0EE',
  mid: '#1F9BDA',
  deep: '#0E68AE',
};

/** 가운데에서 dx만큼 떨어진 곳의 수면 높이(위쪽이 음수). 부드럽게 솟아오른 언덕. */
export function surfaceY(dx: number): number {
  const u = Math.abs(dx) / HILL_B;
  if (u >= 1) return 0;
  const bell = 0.5 + 0.5 * Math.cos(Math.PI * u);
  return -HILL_H * Math.pow(bell, 0.85);
}

const LABELS: Record<string, string> = { Friends: '수친', TipRoom: '가이드', Calendar: '캘린더', Teaching: '티칭', Shop: '샵' };

/** 물결무늬 띠 하나: 좌우로 끝없이 흘러간다. */
function WaveStrip({
  width,
  height,
  top,
  period,
  amplitude,
  duration,
  reverse,
  fill,
  delay = 0,
}: {
  width: number;
  height: number;
  top: number;
  period: number;
  amplitude: number;
  duration: number;
  reverse?: boolean;
  fill: string;
  delay?: number;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration, delay]);

  const total = width + period * 2;
  const d = useMemo(() => {
    let p = `M0,${height} L0,${amplitude}`;
    const n = Math.ceil(total / period) + 1;
    for (let i = 0; i < n; i++) {
      const x = i * period;
      p += ` Q${x + period / 4},${0} ${x + period / 2},${amplitude} Q${x + (period * 3) / 4},${amplitude * 2} ${x + period},${amplitude}`;
    }
    return `${p} L${n * period},${height} Z`;
  }, [total, period, amplitude, height]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top,
        width: total,
        height,
        transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: reverse ? [-period, 0] : [0, -period] }) }],
      }}
    >
      <Svg width={total} height={height}>
        <Path d={d} fill={fill} />
      </Svg>
    </Animated.View>
  );
}

type TabIcon = React.ComponentType<{ color: string; size?: number }>;

export default function WaterTabBar({
  state,
  navigation,
  insets,
  icons,
  alertRoute,
  alerting,
}: BottomTabBarProps & { icons: Record<string, TabIcon>; alertRoute?: string; alerting?: boolean }) {
  const { width: W } = useWindowDimensions();
  const n = state.routes.length;
  const slot = W / n;
  const calendarIndex = Math.max(0, state.routes.findIndex((r) => r.name === 'Calendar'));
  const cx = (calendarIndex + 0.5) * slot;
  const height = WATER_TOP + ROW + insets.bottom;
  // 선택된 메뉴 뒤를 따라다니는 물방울 빛
  const targetX = (state.index + 0.5) * slot;
  const glowX = useRef(new Animated.Value(targetX)).current;
  useEffect(() => {
    Animated.spring(glowX, { toValue: targetX, friction: 8, tension: 60, useNativeDriver: true }).start();
  }, [glowX, targetX]);

  // 모집 알림 아이콘이 붉게 깜빡인다.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!alerting) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [alerting, pulse]);

  // 수면(언덕 포함) 모양 경로. SVG는 위쪽으로 HILL_H만큼 더 높게 그린다.
  const surfacePath = useMemo(() => {
    const total = HILL_H + height;
    let d = `M0,${total} L0,${HILL_H}`;
    for (let x = 0; x <= W; x += 2) d += ` L${x},${HILL_H + surfaceY(x - cx)}`;
    return `${d} L${W},${total} Z`;
  }, [W, cx, height]);
  const highlightPath = useMemo(() => {
    let d = '';
    for (let x = 0; x <= W; x += 2) d += `${x === 0 ? 'M' : 'L'}${x},${HILL_H + surfaceY(x - cx)}`;
    return d;
  }, [W, cx]);

  return (
    <View style={[styles.bar, { height }]}>
      {/* 물 (뒤) */}
      <Svg width={W} height={HILL_H + height} style={{ position: 'absolute', left: 0, top: -HILL_H }} pointerEvents="none">
        <Defs>
          <SvgGradient id="waterBack" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={WATER.light} stopOpacity="0.35" />
            <Stop offset="0.35" stopColor={WATER.mid} stopOpacity="0.72" />
            <Stop offset="1" stopColor={WATER.deep} stopOpacity="0.92" />
          </SvgGradient>
          <ClipPath id="waterShape">
            <Path d={surfacePath} />
          </ClipPath>
        </Defs>
        {/* 로딩 화면 그림의 물결 붓터치를 바닥 질감으로 깔고, 그 위에 맑은 물색을 덮는다 */}
        <SvgImage
          href={require('../../assets/landing/water.jpg')}
          x={-70}
          y={-PAINT_Y * PAINT_SCALE}
          width={PAINT_W * PAINT_SCALE}
          height={PAINT_H * PAINT_SCALE}
          preserveAspectRatio="none"
          clipPath="url(#waterShape)"
        />
        <Path d={surfacePath} fill="url(#waterBack)" />
      </Svg>

      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        <WaveStrip width={W} height={height} top={4} period={150} amplitude={6} duration={9000} fill="rgba(255,255,255,0.16)" />
        <WaveStrip width={W} height={height} top={14} period={96} amplitude={5} duration={6500} reverse fill="rgba(40,214,190,0.34)" delay={500} />
        <WaveStrip width={W} height={height} top={26} period={210} amplitude={7} duration={13000} fill="rgba(150,214,255,0.24)" delay={1200} />
        <WaveStrip width={W} height={height} top={40} period={120} amplitude={5} duration={8200} reverse fill="rgba(150,140,255,0.16)" />
      </View>

      {/* 물 (앞): 투명한 물을 한 겹 더 덮어 깊이를 준다 */}
      <Svg width={W} height={HILL_H + height} style={{ position: 'absolute', left: 0, top: -HILL_H }} pointerEvents="none">
        <Defs>
          <SvgGradient id="waterFront" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={WATER.light} stopOpacity="0.5" />
            <Stop offset="0.4" stopColor={WATER.mid} stopOpacity="0.42" />
            <Stop offset="1" stopColor={WATER.deep} stopOpacity="0.3" />
          </SvgGradient>
        </Defs>
        <Path d={surfacePath} fill="url(#waterFront)" />
        <Path d={highlightPath} stroke="rgba(255,255,255,0.75)" strokeWidth={1.6} fill="none" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
        <WaveStrip width={W} height={height} top={0} period={110} amplitude={4} duration={7000} reverse fill="rgba(255,255,255,0.22)" delay={300} />
      </View>

      {/* 선택한 메뉴 표시 */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          { top: WATER_TOP + (ROW - 46) / 2 - 2, transform: [{ translateX: Animated.add(glowX, -23) }] },
        ]}
      />

      {/* 메뉴 아이콘 */}
      <View style={[styles.row, { top: WATER_TOP, height: ROW }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = icons[route.name];
          const isCenter = route.name === 'Calendar';
          const isAlert = !!alerting && route.name === alertRoute;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) (navigation.navigate as (name: string, params?: object) => void)(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={LABELS[route.name] ?? route.name}
              style={styles.tab}
            >
              <View style={[styles.iconWrap, isCenter && styles.iconWrapCenter]}>
                {isAlert && <Animated.View style={[styles.alertGlow, { opacity: pulse }]} />}
                {Icon && <Icon color={focused || isAlert ? colors.white : 'rgba(255,255,255,0.92)'} size={isCenter ? 34 : 28} />}
                {isAlert && <View style={styles.alertDot} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { width: '100%', overflow: 'visible' },
  row: { position: 'absolute', left: 0, right: 0, flexDirection: 'row' },
  glow: { position: 'absolute', left: 0, width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.24)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  iconWrapCenter: { marginTop: -8 },
  alertGlow: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: colors.alert },
  alertDot: { position: 'absolute', top: 2, right: 2, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.alert, borderWidth: 1.5, borderColor: colors.white },
});
