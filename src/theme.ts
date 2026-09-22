export const colors = {
  background: '#EAF7F6',
  backgroundGradient: ['#EAF7F6', '#DCEFFB'] as const,
  card: '#FFFFFF',
  cardSoft: '#F3FBFA',
  primary: '#4FB6E8',
  primaryDark: '#2E86C7',
  accent: '#7FE0D6',
  text: '#2C4A52',
  textMuted: '#7A9AA1',
  border: '#DCEEEC',
  white: '#FFFFFF',
  shadow: '#8FCBE0',
};

export const moodColors: Record<string, string> = {
  great: '#8FE3D8',
  good: '#6FC6EC',
  okay: '#4FA9DE',
  tired: '#3D82C4',
  hard: '#2A5FA0',
};

export const moodEmoji: Record<string, string> = {
  great: '\u{1F606}',
  good: '\u{1F642}',
  okay: '\u{1F610}',
  tired: '\u{1F62A}',
  hard: '\u{1F62B}',
};

export const moodLabel: Record<string, string> = {
  great: '최고예요',
  good: '좋았어요',
  okay: '그냥 그래요',
  tired: '피곤해요',
  hard: '힘들었어요',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const fonts = {
  heading: 'Jua_400Regular',
  body: undefined,
};
