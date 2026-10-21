import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, Pressable, View } from 'react-native';
import type { Equipped } from '../../storage/bear';

// 둥실곰: 로딩 화면 그림 속 북극곰을 그대로 세워 놓은 그림이다.
// 그림에서 팔 두 개만 따로 잘라 두었고(빈자리는 털로 메워둠), 수영복/수경/수모/메달은 같은 수채화 느낌으로 그려 위에 얹는다.
// 모든 조각이 같은 크기(486x669)의 캔버스라서 겹쳐 놓기만 하면 맞는다.

export type BearMode = 'idle' | 'practice' | 'swim';

const CANVAS = { w: 486, h: 669 };
// 팔 조각의 캔버스 안 위치와, 어깨(팔이 돌아가는 축) 위치
const ARM_L = { x: 10, y: 238, w: 236, h: 134, pivot: { x: 45, y: 292 } };
const ARM_R = { x: 252, y: 286, w: 154, h: 96, pivot: { x: 385, y: 322 } };

const IMG = {
  body: require('../../../assets/bear/body.png'),
  armL: require('../../../assets/bear/armL.png'),
  armR: require('../../../assets/bear/armR.png'),
  trunks: require('../../../assets/bear/item-trunks.png'),
  onepiece: require('../../../assets/bear/item-onepiece.png'),
  goggles: require('../../../assets/bear/item-goggles.png'),
  cap: require('../../../assets/bear/item-cap.png'),
  medal: require('../../../assets/bear/item-medal.png'),
};

/** 곰이 차지하는 상자 크기. 수영 모드는 곰이 누워서(가로로) 헤엄치니 가로세로가 바뀐다. */
export function bearBox(mode: BearMode, height: number): { width: number; height: number; scale: number } {
  if (mode === 'swim') {
    const scale = height / CANVAS.w;
    return { width: CANVAS.h * scale, height, scale };
  }
  const scale = height / CANVAS.h;
  return { width: CANVAS.w * scale, height, scale };
}

interface Props {
  mode: BearMode;
  /** 곰 상자 높이(pt). 폭은 그림 비율대로 정해진다. */
  height: number;
  equipped: Equipped;
  /** true면 곰을 눌렀을 때 자유형 팔돌리기 연습을 한다(mode가 idle일 때). */
  interactive?: boolean;
  /** 움직이지 않고 가만히 있게 한다. */
  paused?: boolean;
  onPress?: () => void;
}

function BearSpriteBase({ mode, height, equipped, interactive, paused, onPress }: Props) {
  const box = bearBox(mode, height);
  const { scale } = box;
  const swim = mode === 'swim';

  const breathe = useRef(new Animated.Value(0)).current; // 0↔1 숨쉬기/둥실
  const armLv = useRef(new Animated.Value(0)).current; // 팔 회전(바퀴 수)
  const armRv = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(0)).current; // 연습할 때 들썩임
  const practicing = useRef(false);

  // 평소: 천천히 둥실, 숨쉬기
  useEffect(() => {
    if (paused) {
      breathe.setValue(0);
      return;
    }
    const period = swim ? 1100 : 1800;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: period, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, swim, paused]);

  // 수영: 팔이 쉬지 않고 돌아간다 (두 팔이 엇갈려서)
  useEffect(() => {
    if (!swim || paused) {
      armLv.setValue(0);
      armRv.setValue(0);
      return;
    }
    const spin = (v: Animated.Value) => Animated.loop(Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true }));
    const l = spin(armLv);
    const r = spin(armRv);
    l.start();
    r.start();
    return () => {
      l.stop();
      r.stop();
    };
  }, [swim, paused, armLv, armRv]);

  // 눌렀을 때: 서서 자유형 팔돌리기 두 바퀴
  const practice = useCallback(() => {
    if (practicing.current || mode !== 'idle') return;
    practicing.current = true;
    armLv.setValue(0);
    armRv.setValue(0);
    hop.setValue(0);
    Animated.parallel([
      Animated.timing(armLv, { toValue: 2, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(260),
        Animated.timing(armRv, { toValue: 2, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.loop(
        Animated.sequence([
          Animated.timing(hop, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(hop, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]),
        { iterations: 5 }
      ),
    ]).start(() => {
      armLv.setValue(0);
      armRv.setValue(0);
      practicing.current = false;
    });
  }, [mode, armLv, armRv, hop]);

  const handlePress = useCallback(() => {
    if (interactive) practice();
    onPress?.();
  }, [interactive, practice, onPress]);

  // 서 있을 땐 두 팔이 마주 보고 날개처럼(왼팔 시계, 오른팔 반시계), 수영할 땐 같은 방향으로 엇갈려 돈다.
  const armLRot = armLv.interpolate({ inputRange: [0, 1, 2], outputRange: ['0deg', '360deg', '720deg'] });
  const armRRot = armRv.interpolate({
    inputRange: [0, 1, 2],
    outputRange: swim ? ['180deg', '540deg', '900deg'] : ['0deg', '-360deg', '-720deg'],
  });

  const lift = swim ? 0 : height * 0.012;
  const stageStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      width: CANVAS.w * scale,
      height: CANVAS.h * scale,
      left: (box.width - CANVAS.w * scale) / 2,
      top: (box.height - CANVAS.h * scale) / 2,
    }),
    [scale, box.width, box.height]
  );
  const transform = [
    {
      translateY: Animated.add(
        breathe.interpolate({ inputRange: [0, 1], outputRange: [lift, -lift] }),
        hop.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.05] })
      ),
    },
    { rotate: swim ? '90deg' : (breathe.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] }) as unknown as string) },
  ];

  const layer = { position: 'absolute' as const, left: 0, top: 0, width: CANVAS.w * scale, height: CANVAS.h * scale };
  const arm = (a: typeof ARM_L, src: number, rot: Animated.AnimatedInterpolation<string>) => (
    <Animated.Image
      source={src}
      style={{
        position: 'absolute',
        left: a.x * scale,
        top: a.y * scale,
        width: a.w * scale,
        height: a.h * scale,
        transformOrigin: [(a.pivot.x - a.x) * scale, (a.pivot.y - a.y) * scale, 0],
        transform: [{ rotate: rot }],
      }}
      resizeMode="stretch"
    />
  );

  const body = (
    <View style={{ width: box.width, height: box.height }} pointerEvents="none">
      <Animated.View style={[stageStyle, { transform }]}>
        <Image source={IMG.body} style={layer} />
        {equipped.suit ? <Image source={IMG[equipped.suit]} style={layer} /> : null}
        {arm(ARM_L, IMG.armL, armLRot)}
        {arm(ARM_R, IMG.armR, armRRot)}
        {equipped.medal ? <Image source={IMG.medal} style={layer} /> : null}
        {equipped.goggles ? <Image source={IMG.goggles} style={layer} /> : null}
        {equipped.cap ? <Image source={IMG.cap} style={layer} /> : null}
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

const BearSprite = memo(BearSpriteBase);
export default BearSprite;
