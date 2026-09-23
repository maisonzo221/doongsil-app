// Color system: emerald sea / blue sea / deep sea.
export const colors = {
  emerald: '#0EA894', // emerald sea — primary active color
  blueSea: '#1878B8', // blue sea — secondary/accent
  deepSea: '#0A3358', // deep sea — pressed state, strongest text

  background: '#E3F5F1',
  backgroundGradient: ['#E3F5F1', '#D2E8F4'] as const,
  card: '#FFFFFF',
  cardSoft: '#EFFBF8',

  primary: '#0EA894',
  primaryPressed: '#0A3358',
  disabled: '#C7CCD2',
  disabledText: '#9AA1A8',

  text: '#0A3358',
  textMuted: '#5F7A8C',
  border: '#D6EAE6',
  white: '#FFFFFF',
  shadow: '#8FCBE0',
};

export const moodColors: Record<string, string> = {
  great: '#8FE3D8',
  good: '#4FC7C0',
  okay: '#1878B8',
  tired: '#155F94',
  hard: '#0A3358',
};

// 2nd (good) = wide open grin, 5th (hard) = Apple's melting face.
export const moodEmoji: Record<string, string> = {
  great: '\u{1F606}',
  good: '\u{1F601}',
  okay: '\u{1F610}',
  tired: '\u{1F62A}',
  hard: '\u{1FAE0}',
};

export const moodLabel: Record<string, string> = {
  great: '최고예요',
  good: '좋았어요',
  okay: '그냥 그래요',
  tired: '피곤해요',
  hard: '힘들었어요',
};

// 접영 = butterfly (direct match), 평영 = frog stroke (common KR nickname),
// 배영 = freestyle glyph flipped (on-your-back visual), 자유형 = swimmer.
export const strokeEmoji: Record<string, string> = {
  freestyle: '\u{1F3CA}',
  backstroke: '\u{1F3CA}',
  breaststroke: '\u{1F438}',
  butterfly: '\u{1F98B}',
};

// 8pt grid. `hairline` is the one documented exception, for icon-to-label gaps.
export const spacing = {
  hairline: 4,
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

// Spoqa Han Sans Neo has no true Semibold, so semibold falls back to Bold.
// Gotham is a paid commercial font we can't bundle; Montserrat stands in as
// the closest free geometric-sans until real Gotham files are provided.
export const fonts = {
  light: 'SpoqaHanSansNeo-Light',
  regular: 'SpoqaHanSansNeo-Regular',
  medium: 'SpoqaHanSansNeo-Medium',
  semibold: 'SpoqaHanSansNeo-Bold',
  bold: 'SpoqaHanSansNeo-Bold',

  enLight: 'Montserrat_300Light',
  enRegular: 'Montserrat_400Regular',
  enMedium: 'Montserrat_500Medium',
  enSemibold: 'Montserrat_600SemiBold',
  enBold: 'Montserrat_700Bold',

  // Brand wordmark only ("둥실" on the splash/logo) — not general UI text.
  heading: 'Jua_400Regular',
};
