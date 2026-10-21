import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Pressable, View } from 'react-native';
import type { Equipped } from '../../storage/bear';

// 둥실곰: 캐릭터 보드(assets/bear)의 그림을 그대로 쓴다. 덧그린 것은 없다.
// - 입은 것에 따라 보드 그림이 통째로 바뀐다: 기본 / 수모 / 메달. 새 아이템 보드가 오면 여기에 한 줄씩 추가한다.
// - 서 있는 모습(정면)과, 헤엄치는 모습(자유형·접영·평영·배영을 번갈아)을 쓴다.

export type BearMode = 'idle' | 'swim';

type Variant = 'base' | 'cap' | 'medal';
type SwimPose = 'free' | 'fly' | 'breast' | 'back';
const SWIM_POSES: SwimPose[] = ['free', 'fly', 'breast', 'back'];

// 포즈마다 모든 변형이 같은 크기의 캔버스에 놓여 있어서, 옷을 바꿔 입어도 곰 위치가 그대로다.
const FRONT = { w: 262, h: 475 };
const SWIM_SIZE: Record<SwimPose, { w: number; h: number }> = {
  free: { w: 407, h: 204 },
  fly: { w: 367, h: 191 },
  breast: { w: 303, h: 200 },
  back: { w: 392, h: 179 },
};
const SWIM_BOX = { w: 407, h: 204 };
const SWIM_HOLD_MS = 4200;
const SWIM_FADE_MS = 600;

const FRONT_IMG: Record<Variant, number> = {
  base: require('../../../assets/bear/base-front.png'),
  cap: require('../../../assets/bear/cap-front.png'),
  medal: require('../../../assets/bear/medal-front.png'),
};
const SWIM_IMG: Record<Variant, Record<SwimPose, number>> = {
  base: {
    free: require('../../../assets/bear/base-free.png'),
    fly: require('../../../assets/bear/base-fly.png'),
    breast: require('../../../assets/bear/base-breast.png'),
    back: require('../../../assets/bear/base-back.png'),
  },
  cap: {
    free: require('../../../assets/bear/cap-free.png'),
    fly: require('../../../assets/bear/cap-fly.png'),
    breast: require('../../../assets/bear/cap-breast.png'),
    back: require('../../../assets/bear/cap-back.png'),
  },
  medal: {
    free: require('../../../assets/bear/medal-free.png'),
    fly: require('../../../assets/bear/medal-fly.png'),
    breast: require('../../../assets/bear/medal-breast.png'),
    back: require('../../../assets/bear/medal-back.png'),
  },
};

// 보드 그림이 있는 아이템만 보인다. 보드 한 장에 한 가지 아이템만 입고 있어서 한 번에 한 가지만 입는다.
function variantOf(e: Equipped): Variant {
  return e.cap ? 'cap' : e.medal ? 'medal' : 'base';
}

/** 곰이 차지하는 상자 크기. 헤엄치는 모습은 가로로 길다. */
export function bearBox(mode: BearMode, height: number): { width: number; height: number; scale: number } {
  if (mode === 'swim') {
    const scale = height / SWIM_BOX.h;
    return { width: SWIM_BOX.w * scale, height, scale };
  }
  const scale = height / FRONT.h;
  return { width: FRONT.w * scale, height, scale };
}

interface Props {
  mode: BearMode;
  /** 곰 상자 높이(pt). 폭은 그림 비율대로 정해진다. */
  height: number;
  equipped: Equipped;
  /** true면 곰을 눌렀을 때 폴짝 뛰며 몸을 흔든다(mode가 idle일 때). */
  interactive?: boolean;
  /** 움직이지 않고 가만히 있게 한다. */
  paused?: boolean;
  onPress?: () => void;
}

function SwimBear({ height, equipped, paused }: { height: number; equipped: Equipped; paused?: boolean }) {
  const box = bearBox('swim', height);
  const v = variantOf(equipped);
  const set = SWIM_IMG[v];
  const fades = useRef(SWIM_POSES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const current = useRef(0);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      const from = current.current;
      const to = (from + 1) % SWIM_POSES.length;
      current.current = to;
      Animated.parallel([
        Animated.timing(fades[from], { toValue: 0, duration: SWIM_FADE_MS, useNativeDriver: true }),
        Animated.timing(fades[to], { toValue: 1, duration: SWIM_FADE_MS, useNativeDriver: true }),
      ]).start();
    }, SWIM_HOLD_MS);
    return () => clearInterval(timer);
  }, [fades, paused]);

  return (
    <View style={{ width: box.width, height: box.height }} pointerEvents="none">
      {SWIM_POSES.map((pose, i) => {
        const size = SWIM_SIZE[pose];
        return (
          <Animated.Image
            key={pose}
            source={set[pose]}
            style={{
              position: 'absolute',
              left: (box.width - size.w * box.scale) / 2,
              top: (box.height - size.h * box.scale) / 2,
              width: size.w * box.scale,
              height: size.h * box.scale,
              opacity: fades[i],
            }}
          />
        );
      })}
    </View>
  );
}

function StandingBear({ height, equipped, interactive, paused, onPress }: Omit<Props, 'mode'>) {
  const box = bearBox('idle', height);
  const { scale } = box;
  const breathe = useRef(new Animated.Value(0)).current; // 0↔1 숨쉬기
  const hop = useRef(new Animated.Value(0)).current; // 눌렀을 때 폴짝
  const wiggle = useRef(new Animated.Value(0)).current; // 눌렀을 때 좌우 흔들
  const busy = useRef(false);

  useEffect(() => {
    if (paused) {
      breathe.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, paused]);

  const handlePress = useCallback(() => {
    if (interactive && !busy.current) {
      busy.current = true;
      hop.setValue(0);
      wiggle.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(hop, { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 0.6, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(wiggle, { toValue: 1, duration: 140, useNativeDriver: true }),
          Animated.timing(wiggle, { toValue: -1, duration: 220, useNativeDriver: true }),
          Animated.timing(wiggle, { toValue: 1, duration: 220, useNativeDriver: true }),
          Animated.timing(wiggle, { toValue: 0, duration: 140, useNativeDriver: true }),
        ]),
      ]).start(() => {
        busy.current = false;
      });
    }
    onPress?.();
  }, [interactive, onPress, hop, wiggle]);

  const lift = height * 0.01;
  const stageStyle = useMemo(
    () => ({ position: 'absolute' as const, width: FRONT.w * scale, height: FRONT.h * scale, left: 0, top: 0, transformOrigin: '50% 100%' as const }),
    [scale]
  );
  // 숨쉬기(±0.7°)와 눌렀을 때 흔들기(±4°)를 더해서 한 번에 돌린다.
  const rotate = Animated.add(
    breathe.interpolate({ inputRange: [0, 1], outputRange: [-0.7, 0.7] }),
    wiggle.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] })
  ).interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });
  const transform = [
    {
      translateY: Animated.add(
        breathe.interpolate({ inputRange: [0, 1], outputRange: [lift, -lift] }),
        hop.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.07] })
      ),
    },
    { rotate },
  ];
  const layer = { position: 'absolute' as const, left: 0, top: 0, width: FRONT.w * scale, height: FRONT.h * scale };

  const body = (
    <View style={{ width: box.width, height: box.height }} pointerEvents="none">
      <Animated.View style={[stageStyle, { transform }]}>
        <Image source={FRONT_IMG[variantOf(equipped)]} style={layer} />
      </Animated.View>
    </View>
  );

  if (!interactive && !onPress) return body;
  return (
    <Pressable onPress={handlePress} accessibilityRole="button" accessibilityLabel="둥실곰">
      {body}
    </Pressable>
  );
}

function BearSpriteBase({ mode, ...rest }: Props) {
  if (mode === 'swim') return <SwimBear height={rest.height} equipped={rest.equipped} paused={rest.paused} />;
  return <StandingBear {...rest} />;
}

const BearSprite = memo(BearSpriteBase);
export default BearSprite;
