import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Pressable, View } from 'react-native';
import type { Equipped } from '../../storage/bear';

// 둥실곰: 캐릭터 보드(assets/bear)의 그림만 쓴다. 덧그린 것은 없다.
// - 서 있는 곰(정면): 기본 곰 한 장 위에, 입은 아이템(수영복·메달·수모·수경)을 보드 그림에서 깨끗하게 오려낸 조각으로
//   겹쳐 보여준다. 조각은 모두 같은 크기의 캔버스라서 겹쳐 놓기만 하면 맞고, 몸은 항상 같은 곰이라 아이템을 바꿔도
//   뚱뚱해지지 않는다. 네 가지 아이템을 마음대로 켜고 끌 수 있다.
// - 헤엄치는 곰: 헤엄 그림은 보드마다 통째로 그려져 있어서, 입은 것 안에서만(안 입은 것은 절대 안 보이게)
//   가장 많이 입은 보드를 고른다.

export type BearMode = 'idle' | 'swim';

type SwimPose = 'free' | 'fly' | 'breast' | 'back';
const SWIM_POSES: SwimPose[] = ['free', 'fly', 'breast', 'back'];

const FRONT = { w: 290, h: 509 };
const SWIM_SIZE: Record<SwimPose, { w: number; h: number }> = {
  free: { w: 408, h: 218 },
  fly: { w: 374, h: 200 },
  breast: { w: 312, h: 200 },
  back: { w: 393, h: 185 },
};
const SWIM_BOX = { w: 408, h: 218 };
const SWIM_HOLD_MS = 4200;
const SWIM_FADE_MS = 600;

const FRONT_BASE = require('../../../assets/bear/front-base.png');
const FRONT_LAYER = {
  onepiece: require('../../../assets/bear/front-onepiece.png'),
  trunks: require('../../../assets/bear/front-trunks.png'),
  medal1: require('../../../assets/bear/front-medal1.png'),
  medal2: require('../../../assets/bear/front-medal2.png'),
  medal3: require('../../../assets/bear/front-medal3.png'),
  medal4: require('../../../assets/bear/front-medal4.png'),
  cap: require('../../../assets/bear/front-cap.png'),
  goggles: require('../../../assets/bear/front-goggles.png'),
};

interface SwimBoard {
  suit: 'onepiece' | 'trunks' | null;
  cap: boolean;
  goggles: boolean;
  images: Record<SwimPose, number>;
}
const swimSet = (v: string): Record<SwimPose, number> => ({
  free: SWIM_FILES[v].free,
  fly: SWIM_FILES[v].fly,
  breast: SWIM_FILES[v].breast,
  back: SWIM_FILES[v].back,
});
const SWIM_FILES: Record<string, Record<SwimPose, number>> = {
  base: {
    free: require('../../../assets/bear/swim-base-free.png'),
    fly: require('../../../assets/bear/swim-base-fly.png'),
    breast: require('../../../assets/bear/swim-base-breast.png'),
    back: require('../../../assets/bear/swim-base-back.png'),
  },
  cap: {
    free: require('../../../assets/bear/swim-cap-free.png'),
    fly: require('../../../assets/bear/swim-cap-fly.png'),
    breast: require('../../../assets/bear/swim-cap-breast.png'),
    back: require('../../../assets/bear/swim-cap-back.png'),
  },
  onepiece: {
    free: require('../../../assets/bear/swim-onepiece-free.png'),
    fly: require('../../../assets/bear/swim-onepiece-fly.png'),
    breast: require('../../../assets/bear/swim-onepiece-breast.png'),
    back: require('../../../assets/bear/swim-onepiece-back.png'),
  },
  trunks: {
    free: require('../../../assets/bear/swim-trunks-free.png'),
    fly: require('../../../assets/bear/swim-trunks-fly.png'),
    breast: require('../../../assets/bear/swim-trunks-breast.png'),
    back: require('../../../assets/bear/swim-trunks-back.png'),
  },
};
// 각 헤엄 보드가 입고 있는 것 (수영복 보드에는 수모와 수경도 같이 그려져 있다).
const SWIM_BOARDS: SwimBoard[] = [
  { suit: null, cap: false, goggles: false, images: swimSet('base') },
  { suit: null, cap: true, goggles: false, images: swimSet('cap') },
  { suit: 'onepiece', cap: true, goggles: true, images: swimSet('onepiece') },
  { suit: 'trunks', cap: true, goggles: true, images: swimSet('trunks') },
];

/** 입은 것에 포함되는 그림만 후보로 두고, 그중 가장 많이 입은(수영복 > 수모·수경) 보드를 고른다. */
function pickSwimBoard(e: Equipped): SwimBoard {
  let best = SWIM_BOARDS[0];
  let bestScore = -1;
  for (const b of SWIM_BOARDS) {
    if (b.suit && b.suit !== e.suit) continue;
    if (b.cap && !e.cap) continue;
    if (b.goggles && !e.goggles) continue;
    const score = (b.suit ? 3 : 0) + (b.cap ? 1 : 0) + (b.goggles ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  return best;
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
  const set = pickSwimBoard(equipped).images;
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
        <Image source={FRONT_BASE} style={layer} />
        {equipped.suit ? <Image source={FRONT_LAYER[equipped.suit]} style={layer} /> : null}
        {equipped.medal ? <Image source={FRONT_LAYER[equipped.medal]} style={layer} /> : null}
        {equipped.cap ? <Image source={FRONT_LAYER.cap} style={layer} /> : null}
        {equipped.goggles ? <Image source={FRONT_LAYER.goggles} style={layer} /> : null}
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
