// Expo Go에서는 진짜 HealthKit을 쓸 수 없어서(네이티브 모듈, 개발 빌드 필요),
// 오늘의 그럴듯한 수영 데이터를 흉내만 내는 목(mock) 서비스.
// 실제 연동 시: `expo-health-connect` 또는 커스텀 HealthKit 네이티브 모듈을
// 붙이고, 이 함수의 반환값 형태(HealthImportResult)만 그대로 채우면 된다.

import { Stroke } from '../types';

export interface HealthImportResult {
  distanceMeters: number;
  durationMinutes: number;
  calories: number;
  avgHeartRate: number;
  strokes: Stroke[];
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/** 오늘 날짜를 시드로 써서, 하루 동안은 같은 값이 나오게 만든 가짜 데이터. */
export function getTodayHealthImportMock(dateString: string): HealthImportResult {
  const seed = dateString.split('-').reduce((acc, part) => acc + Number(part), 0);
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 1);
  const r3 = seededRandom(seed + 2);

  const distanceMeters = Math.round((800 + r1 * 1200) / 25) * 25;
  const durationMinutes = Math.round(20 + r2 * 40);
  const calories = Math.round(180 + r3 * 320);
  const avgHeartRate = Math.round(110 + seededRandom(seed + 3) * 40);

  return {
    distanceMeters,
    durationMinutes,
    calories,
    avgHeartRate,
    strokes: ['freestyle'],
  };
}
