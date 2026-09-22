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

export interface SwimRecord {
  id: string;
  date: string; // YYYY-MM-DD
  mood: Mood;
  strokes: Stroke[];
  distanceMeters?: number;
  durationMinutes?: number;
  memo?: string;
  condition?: string;
  createdAt: number;
  updatedAt: number;
}

export type SwimRecordInput = Omit<SwimRecord, 'id' | 'createdAt' | 'updatedAt'>;
