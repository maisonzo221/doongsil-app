import React from 'react';
import { Image } from 'react-native';

interface Props {
  size?: number;
  /** 예전 SVG 마크와 호환용 — 이미지라 쓰지 않는다. */
  uid?: string;
}

// 둥실 브랜드 마크: 물 위에 둥실 떠 있는 북극곰 그림을 동그랗게 잘라낸 것.
// 앱 아이콘과 같은 그림(assets/brand/logo-mark.png)이다.
export default function BrandMark({ size = 120 }: Props) {
  return (
    <Image
      source={require('../../assets/brand/logo-mark.png')}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      accessibilityLabel="둥실 북극곰 로고"
    />
  );
}
