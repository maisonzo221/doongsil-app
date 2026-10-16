import React from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

interface Props {
  size?: number;
  /** 한 화면에 여러 개를 그릴 때 그라데이션 id가 겹치지 않게 하는 접두사. */
  uid?: string;
}

// 둥실 브랜드 마크: 고글을 쓴 북극곰이 파도 위에 둥실 떠 있는 원형 뱃지.
// assets/brand/logo-badge.svg(앱 아이콘/스플래시와 같은 원본)에서 변환한 것이라 모양이 같다.
export default function BrandMark({ size = 120, uid = 'bm' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240">
      <Defs>
        <LinearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#46CFE0" />
          <Stop offset="0.55" stopColor="#0E88B4" />
          <Stop offset="1" stopColor="#0B5F8F" />
        </LinearGradient>
        <LinearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0D6E9F" />
          <Stop offset="1" stopColor="#0B2A4A" />
        </LinearGradient>
        <RadialGradient id={`fur-${uid}`} cx="0.38" cy="0.3" r="0.85">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.7" stopColor="#F4FBFC" />
          <Stop offset="1" stopColor="#DDF0F4" />
        </RadialGradient>
        <LinearGradient id={`lens-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#EAFCFE" />
          <Stop offset="1" stopColor="#8FE0EC" />
        </LinearGradient>
      </Defs>
      <Defs>
        <ClipPath id={`clip-${uid}`}>
          <Circle cx="120" cy="120" r="116" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#clip-${uid})`}>
        <Rect width="240" height="240" fill={`url(#bg-${uid})`} />
        <Circle cx="206" cy="66" r="5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" opacity="0.85" />
        <Circle cx="219" cy="44" r="3" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.7" />
        <Circle cx="30" cy="84" r="4" fill="none" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.75" />
        <Ellipse cx="62" cy="212" rx="17" ry="3.6" fill="#FFFFFF" opacity="0.28" />
        <Ellipse cx="182" cy="216" rx="13" ry="3" fill="#FFFFFF" opacity="0.22" />
        <Circle cx="68" cy="58" r="21" fill={`url(#fur-${uid})`} />
        <Circle cx="172" cy="58" r="21" fill={`url(#fur-${uid})`} />
        <Circle cx="69" cy="60" r="11" fill="#FFB3A1" />
        <Circle cx="171" cy="60" r="11" fill="#FFB3A1" />
        <Circle cx="120" cy="108" r="68" fill={`url(#fur-${uid})`} />
        <Path d="M73 102 L53 97" stroke="#FF7E5F" strokeWidth="7" strokeLinecap="round" />
        <Path d="M167 102 L187 97" stroke="#FF7E5F" strokeWidth="7" strokeLinecap="round" />
        <Rect x="104" y="98" width="32" height="9" rx="4.5" fill="#FF7E5F" />
        <Circle cx="90" cy="103" r="23" fill="#FF7E5F" />
        <Circle cx="150" cy="103" r="23" fill="#FF7E5F" />
        <Circle cx="90" cy="103" r="18" fill={`url(#lens-${uid})`} />
        <Circle cx="150" cy="103" r="18" fill={`url(#lens-${uid})`} />
        <Path d="M78 96 q5 -8 14 -9" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" fill="none" opacity="0.9" />
        <Path d="M138 96 q5 -8 14 -9" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" fill="none" opacity="0.9" />
        <Path d="M82 106 q8 8 16 0" stroke="#0B2A4A" strokeWidth="3.6" strokeLinecap="round" fill="none" />
        <Path d="M142 106 q8 8 16 0" stroke="#0B2A4A" strokeWidth="3.6" strokeLinecap="round" fill="none" />
        <Ellipse cx="120" cy="128" rx="9" ry="6.5" fill="#0B2A4A" />
        <Path d="M111 137 q9 7 18 0" stroke="#0B2A4A" strokeWidth="3" strokeLinecap="round" fill="none" />
        <Circle cx="73" cy="130" r="8" fill="#FF7E5F" opacity="0.38" />
        <Circle cx="167" cy="130" r="8" fill="#FF7E5F" opacity="0.38" />
        <Path d="M-10 160 C 30 148 72 148 112 158 S 190 170 250 152 L250 250 L-10 250 Z" fill="#B4EAF1" />
        <Ellipse cx="66" cy="164" rx="27" ry="15" fill="#FFFFFF" rotation={-8} origin="66, 164" />
        <Ellipse cx="174" cy="163" rx="27" ry="15" fill="#FFFFFF" rotation={8} origin="174, 163" />
        <Path d="M54 160 v5 M64 158 v6 M74 158 v6" stroke="#C5E3EA" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <Path d="M166 158 v6 M176 158 v6 M186 160 v5" stroke="#C5E3EA" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <Path d="M-10 182 C 40 170 92 174 132 184 S 204 194 250 176 L250 250 L-10 250 Z" fill={`url(#water-${uid})`} />
      </G>
    </Svg>
  );
}
