import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Toss/Kakao 스타일의 단순한 라인 아이콘. 모든 탭에서 같은 형식(라인, 단색)으로 통일한다.
interface IconProps {
  color: string;
  size?: number;
}

const STROKE_WIDTH = 1.8;

function Base({ size = 24, children }: { size?: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

export function NotingIcon({ color, size }: IconProps) {
  return (
    <Base size={size}>
      <Rect x="5" y="4" width="14" height="16" rx="2.5" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path
        d="M8.5 9h7M8.5 12.5h7M8.5 16h4"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Base>
  );
}

export function CalendarIcon({ color, size }: IconProps) {
  return (
    <Base size={size}>
      <Rect x="4" y="5.5" width="16" height="14.5" rx="2.5" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path d="M4 9.8h16" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Path d="M8 3.5v3.2M16 3.5v3.2" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Base>
  );
}

export function FriendsIcon({ color, size }: IconProps) {
  return (
    <Base size={size}>
      <Circle cx="12" cy="8.2" r="3.2" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path
        d="M5.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Base>
  );
}

// 수톡/톡톡 방 안의 "멤버" 버튼용 — 사람 두 명이 겹쳐있는 모양으로 "구성원"을 나타낸다.
export function MembersIcon({ color, size }: IconProps) {
  return (
    <Base size={size}>
      <Circle cx="8.3" cy="8.6" r="2.6" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path
        d="M3.3 19c0-3.1 2.3-5.3 5-5.3.9 0 1.8.25 2.5.72"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
      <Circle cx="15.1" cy="8.2" r="3" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path
        d="M9.2 19.2c0-3.3 2.6-5.7 5.9-5.7s5.9 2.4 5.9 5.7"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Base>
  );
}

export function GroupsIcon({ color, size }: IconProps) {
  return (
    <Base size={size}>
      <Path
        d="M4 6.8A2.8 2.8 0 016.8 4h10.4A2.8 2.8 0 0120 6.8v7.4a2.8 2.8 0 01-2.8 2.8H9l-4.2 3.5a.4.4 0 01-.65-.3V6.8z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
    </Base>
  );
}

export function TeachingIcon({ color, size }: IconProps) {
  return (
    <Base size={size}>
      <Circle cx="12" cy="12" r="8.2" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path
        d="M10 8.7l5.2 3.3-5.2 3.3V8.7z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
    </Base>
  );
}

export function TipRoomIcon({ color, size }: IconProps) {
  return (
    <Base size={size}>
      <Path
        d="M12 21c4.5-4.8 7-8.3 7-11.3A7 7 0 105 9.7C5 12.7 7.5 16.2 12 21z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="9.6" r="2.3" stroke={color} strokeWidth={STROKE_WIDTH} />
    </Base>
  );
}

export function ShopIcon({ color, size }: IconProps) {
  return (
    <Base size={size}>
      <Path
        d="M7.2 8h9.6l1 11.2a1.5 1.5 0 01-1.5 1.6H7.7a1.5 1.5 0 01-1.5-1.6L7.2 8z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Path d="M9 8a3 3 0 016 0" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Base>
  );
}

// 수친 화면 상단 아이콘들 (하단 메뉴바 아이콘과 같은 라인 스타일)
export function SearchIcon({ color, size }: IconProps) {
  return (
    <Base size={size}>
      <Circle cx="10.8" cy="10.8" r="6.2" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path d="M15.5 15.5L20 20" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Base>
  );
}

export function AddFriendIcon({ color, size }: IconProps) {
  return (
    <Base size={size}>
      <Circle cx="9.6" cy="8.4" r="3.3" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path d="M3.4 19.6c0-3.5 2.8-6 6.2-6 1.4 0 2.6.4 3.6 1.1" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Path d="M17.6 11.2v6.4M14.4 14.4h6.4" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Base>
  );
}

export function GearIcon({ color, size }: IconProps) {
  return (
    <Base size={size}>
      <Circle cx="12" cy="12" r="3.1" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Path
        d="M12 3.6l1.3 1.9 2.3-.4.9 2.2 2.2.9-.4 2.3 1.9 1.3-1.9 1.3.4 2.3-2.2.9-.9 2.2-2.3-.4L12 20.4l-1.3-1.9-2.3.4-.9-2.2-2.2-.9.4-2.3L3.8 12l1.9-1.3-.4-2.3 2.2-.9.9-2.2 2.3.4L12 3.6z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
    </Base>
  );
}

export function StarIcon({ color, size, filled }: IconProps & { filled?: boolean }) {
  return (
    <Base size={size}>
      <Path
        d="M12 3.8l2.5 5.1 5.6.8-4 3.9.9 5.6L12 16.6l-5 2.6.9-5.6-4-3.9 5.6-.8L12 3.8z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Base>
  );
}

export function ChevronIcon({ color, size, up }: IconProps & { up?: boolean }) {
  return (
    <Base size={size}>
      <Path d={up ? 'M6 14.5l6-6 6 6' : 'M6 9.5l6 6 6-6'} stroke={color} strokeWidth={STROKE_WIDTH + 0.2} strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  );
}
