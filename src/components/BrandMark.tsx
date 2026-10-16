import React from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

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
        <LinearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1B86B8" />
          <Stop offset="1" stopColor="#58CDE0" />
        </LinearGradient>
        <LinearGradient id={`sea-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="114.6" x2="0" y2="240">
          <Stop offset="0" stopColor="#2AA5C7" />
          <Stop offset="1" stopColor="#0B2A4A" />
        </LinearGradient>
        <LinearGradient id={`fade-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="114.6" x2="0" y2="184.6">
          <Stop offset="0" stopColor="#2AA5C7" stopOpacity="0" />
          <Stop offset="1" stopColor="#1A6586" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id={`fur-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="65" x2="0" y2="114.6">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.65" stopColor="#FBFEFF" />
          <Stop offset="1" stopColor="#D3EEF5" />
        </LinearGradient>
        <LinearGradient id={`sun-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFB08F" />
          <Stop offset="1" stopColor="#FF7E5F" />
        </LinearGradient>
        <ClipPath id={`above-${uid}`}>
          <Path d="M0 0 H240 V114.6 C 205 109.6 175 119.6 120 114.6 C 65 109.6 35 119.6 0 114.6 Z" />
        </ClipPath>
        <ClipPath id={`below-${uid}`}>
          <Path d="M0 114.6 C 35 119.6 65 109.6 120 114.6 C 175 119.6 205 109.6 240 114.6 V240 H0 Z" />
        </ClipPath>
      </Defs>
      <Defs>
        <ClipPath id={`clip-${uid}`}>
          <Circle cx="120" cy="120" r="116" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#clip-${uid})`}>
        <Rect width="240" height="240" fill={`url(#sky-${uid})`} />
        <Circle cx="57" cy="62" r="15" fill={`url(#sun-${uid})`} />
        <Path d="M0 114.6 C 35 119.6 65 109.6 120 114.6 C 175 119.6 205 109.6 240 114.6 V240 H0 Z" fill={`url(#sea-${uid})`} />
        <G clipPath={`url(#below-${uid})`}>
          <G>
            <Path d="M140.1 133.4 L161.3 171.2" stroke="#8ADBEA" strokeWidth="16.5" strokeLinecap="round" fill="none" />
            <Path d="M121.2 135.8 L140.1 178.3" stroke="#8ADBEA" strokeWidth="16.5" strokeLinecap="round" fill="none" />
            <Path d="M71.6 135.8 L59.8 178.3" stroke="#8ADBEA" strokeWidth="16.5" strokeLinecap="round" fill="none" />
            <Path d="M52.7 131.1 L36.2 168.8" stroke="#8ADBEA" strokeWidth="16.5" strokeLinecap="round" fill="none" />
            <Ellipse cx="97.6" cy="119.3" rx="72" ry="30.7" fill="#8ADBEA" />
            <Ellipse cx="114.1" cy="99.2" rx="31.9" ry="15.3" fill="#8ADBEA" />
            <Ellipse cx="151.9" cy="96.9" rx="27.1" ry="18.9" fill="#8ADBEA" rotation={-38} origin="151.9, 96.9" />
            <Ellipse cx="177.8" cy="83.9" rx="23.6" ry="17.7" fill="#8ADBEA" />
            <Ellipse cx="201.4" cy="91" rx="17.7" ry="9.4" fill="#8ADBEA" rotation={6} origin="201.4, 91" />
            <Circle cx="168.4" cy="68.5" r="7.1" fill="#8ADBEA" />
            <Circle cx="28" cy="113.4" r="8.3" fill="#8ADBEA" />
          </G>
          <Rect x="0" y="114.6" width="240" height="125.4" fill={`url(#fade-${uid})`} />
        </G>
        <G clipPath={`url(#above-${uid})`}>
          <Path d="M140.1 133.4 L161.3 171.2" stroke={`url(#fur-${uid})`} strokeWidth="16.5" strokeLinecap="round" fill="none" />
          <Path d="M121.2 135.8 L140.1 178.3" stroke={`url(#fur-${uid})`} strokeWidth="16.5" strokeLinecap="round" fill="none" />
          <Path d="M71.6 135.8 L59.8 178.3" stroke={`url(#fur-${uid})`} strokeWidth="16.5" strokeLinecap="round" fill="none" />
          <Path d="M52.7 131.1 L36.2 168.8" stroke={`url(#fur-${uid})`} strokeWidth="16.5" strokeLinecap="round" fill="none" />
          <Ellipse cx="97.6" cy="119.3" rx="72" ry="30.7" fill={`url(#fur-${uid})`} />
          <Ellipse cx="114.1" cy="99.2" rx="31.9" ry="15.3" fill={`url(#fur-${uid})`} />
          <Ellipse cx="151.9" cy="96.9" rx="27.1" ry="18.9" fill={`url(#fur-${uid})`} rotation={-38} origin="151.9, 96.9" />
          <Ellipse cx="177.8" cy="83.9" rx="23.6" ry="17.7" fill={`url(#fur-${uid})`} />
          <Ellipse cx="201.4" cy="91" rx="17.7" ry="9.4" fill={`url(#fur-${uid})`} rotation={6} origin="201.4, 91" />
          <Circle cx="168.4" cy="68.5" r="7.1" fill={`url(#fur-${uid})`} />
          <Circle cx="28" cy="113.4" r="8.3" fill={`url(#fur-${uid})`} />
          <Circle cx="186.1" cy="79.2" r="2.7" fill="#0B2A4A" />
          <Ellipse cx="217.9" cy="89.8" rx="4.5" ry="3.7" fill="#0B2A4A" />
        </G>
        <Path d="M0 114.6 C 35 119.6 65 109.6 120 114.6 C 175 119.6 205 109.6 240 114.6" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.7" />
        <Ellipse cx="149.5" cy="117.6" rx="35.4" ry="4.7" fill="none" stroke="#FFFFFF" strokeWidth="1.7" opacity="0.6" />
        <Ellipse cx="102.3" cy="120.6" rx="92" ry="7.1" fill="none" stroke="#FFFFFF" strokeWidth="1.4" opacity="0.26" />
      </G>
    </Svg>
  );
}
