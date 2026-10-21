import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { BEAR_FRAME_COUNT, BEAR_FRAMES, BEAR_SIZE, BearLayer, BearSet } from './frames';
import type { Equipped } from '../../storage/bear';

export type BearMode = 'idle' | 'practice' | 'swim';

interface Props {
  mode: BearMode;
  /** 곰 키(pt). 폭은 그림 비율대로 정해진다. */
  height: number;
  equipped: Equipped;
  fps?: number;
  /** true면 곰을 눌렀을 때 서서 자유형 팔돌리기를 두 바퀴 한다(mode가 idle일 때). */
  interactive?: boolean;
  /** 그림이 멈춘 채 첫 장만 보이게 한다. */
  paused?: boolean;
  onPress?: () => void;
}

const SET_OF: Record<BearMode, BearSet> = { idle: 'stand-idle', practice: 'stand-practice', swim: 'swim-swim' };
const PRACTICE_CYCLES = 2;

/** 3D로 렌더한 곰 그림(base)에 입고 있는 아이템 그림을 겹쳐서 프레임을 넘기며 보여준다. */
function BearSpriteBase({ mode, height, equipped, fps = 14, interactive, paused, onPress }: Props) {
  const view = mode === 'swim' ? 'swim' : 'stand';
  const size = BEAR_SIZE[view];
  const width = (height * size.w) / size.h;

  // 눌렀을 때 연습 동작을 몇 프레임 더 보여줄지
  const [practiceLeft, setPracticeLeft] = useState(0);
  const practiceRef = useRef(0);
  practiceRef.current = practiceLeft;
  const effectiveMode: BearMode = mode === 'idle' && practiceLeft > 0 ? 'practice' : mode;
  const set = SET_OF[effectiveMode];

  const [frame, setFrame] = useState(0);
  const lastMode = useRef(effectiveMode);
  useEffect(() => {
    if (lastMode.current !== effectiveMode) {
      lastMode.current = effectiveMode;
      setFrame(0);
    }
  }, [effectiveMode]);

  useEffect(() => {
    if (paused) {
      setFrame(0);
      return;
    }
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % BEAR_FRAME_COUNT);
      if (practiceRef.current > 0) setPracticeLeft((n) => Math.max(0, n - 1));
    }, 1000 / fps);
    return () => clearInterval(timer);
  }, [fps, paused]);

  const handlePress = useCallback(() => {
    if (interactive && mode === 'idle') setPracticeLeft(BEAR_FRAME_COUNT * PRACTICE_CYCLES);
    onPress?.();
  }, [interactive, mode, onPress]);

  const layers: BearLayer[] = ['base'];
  if (equipped.suit) layers.push(equipped.suit);
  if (equipped.medal) layers.push('medal');
  if (equipped.goggles) layers.push('goggles');
  if (equipped.cap) layers.push('cap');

  const body = (
    <View style={{ width, height }} pointerEvents="none">
      {layers.map((layer) => (
        <Image
          key={layer}
          source={BEAR_FRAMES[set][layer][frame]}
          style={{ position: 'absolute', left: 0, top: 0, width, height }}
          resizeMode="contain"
          fadeDuration={0}
        />
      ))}
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
