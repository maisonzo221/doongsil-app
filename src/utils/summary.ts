import { Mood, SwimRecord } from '../types';

const MOOD_SCORE: Record<Mood, number> = {
  great: 5,
  good: 4,
  okay: 3,
  tired: 2,
  hard: 1,
};

const PHRASES_BY_TIER: string[][] = [
  // tier 0: mostly hard/tired
  [
    '이번 달은 파도가 조금 거칠었어요. 그래도 물속에 있었다는 게 중요해요.',
    '힘든 날이 많았던 달이었어요. 잘 버텨냈어요.',
  ],
  // tier 1: mixed
  [
    '이번 달은 잔잔한 파도와 거친 파도가 번갈아 왔어요.',
    '오르락내리락, 파도 같은 한 달이었어요.',
  ],
  // tier 2: okay-good
  [
    '이번 달은 물결처럼 잔잔했어요.',
    '고요한 물속에서 여유를 찾은 한 달이었어요.',
  ],
  // tier 3: mostly great
  [
    '이번 달은 햇살 가득한 수면처럼 반짝였어요.',
    '기분 좋은 첨벙임이 가득했던 한 달이에요.',
  ],
];

export function monthlySummary(records: SwimRecord[]): string | null {
  if (records.length === 0) return null;
  const avg =
    records.reduce((sum, r) => sum + MOOD_SCORE[r.mood], 0) / records.length;

  let tier: number;
  if (avg < 2) tier = 0;
  else if (avg < 3) tier = 1;
  else if (avg < 4) tier = 2;
  else tier = 3;

  const options = PHRASES_BY_TIER[tier];
  const index = records.length % options.length;
  return options[index];
}

export function totalDistanceLabel(records: SwimRecord[]): string {
  const totalMeters = records.reduce((sum, r) => sum + (r.distanceMeters ?? 0), 0);
  if (totalMeters === 0) {
    return '기록에 거리를 남기면 여기에 총합이 쌓여요';
  }
  const km = totalMeters / 1000;
  const formatted = km >= 10 ? km.toFixed(0) : km.toFixed(1);
  return `지금까지 총 ${formatted}km 헤엄쳤어요`;
}
