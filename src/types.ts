export type Mood = 'great' | 'good' | 'okay' | 'tired' | 'hard';

export const MOOD_ORDER: Mood[] = ['great', 'good', 'okay', 'tired', 'hard'];

export type Stroke = 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly';

export const STROKE_LABEL: Record<Stroke, string> = {
  freestyle: '자유형',
  backstroke: '배영',
  breaststroke: '평영',
  butterfly: '접영',
};

export const STROKE_ORDER: Stroke[] = ['freestyle', 'backstroke', 'breaststroke', 'butterfly'];

// 러닝 등 다른 운동 종류를 추후 추가하기 위한 확장 포인트. 지금은 수영만 사용.
export type SportType = 'swim';

export interface SwimRecord {
  id: string;
  sport: SportType;
  date: string; // YYYY-MM-DD
  mood: Mood;
  strokes: Stroke[];
  distanceMeters?: number;
  durationMinutes?: number;
  calories?: number;
  avgHeartRate?: number;
  memo?: string;
  condition?: string;
  /** 애플 피트니스에서 자동으로 불러온 기록인지, 직접 입력했는지 */
  source: 'manual' | 'health';
  createdAt: number;
  updatedAt: number;
}

export type SwimRecordInput = Omit<SwimRecord, 'id' | 'createdAt' | 'updatedAt'>;
