import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

/** 북극곰 얼굴 모양 빨간 도장. */
export default function BearStamp({ size = 40, color = '#D93B3B' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G rotation={-10} origin="50, 50">
        <Circle cx="50" cy="50" r="46" stroke={color} strokeWidth="5" fill="none" />
        {/* 귀 */}
        <Circle cx="27" cy="30" r="10.5" fill={color} />
        <Circle cx="73" cy="30" r="10.5" fill={color} />
        <Circle cx="27" cy="30" r="5" fill="#FFFFFF" opacity="0.9" />
        <Circle cx="73" cy="30" r="5" fill="#FFFFFF" opacity="0.9" />
        {/* 얼굴 */}
        <Ellipse cx="50" cy="52" rx="29" ry="26" fill={color} />
        {/* 주둥이 */}
        <Ellipse cx="50" cy="62" rx="13" ry="10" fill="#FFFFFF" opacity="0.95" />
        <Ellipse cx="50" cy="57" rx="5" ry="3.6" fill={color} />
        <Path d="M50 60.5 V65 M43.5 66 Q50 71 56.5 66" stroke={color} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        {/* 눈 */}
        <Circle cx="38" cy="46" r="3.6" fill="#FFFFFF" />
        <Circle cx="62" cy="46" r="3.6" fill="#FFFFFF" />
      </G>
    </Svg>
  );
}
