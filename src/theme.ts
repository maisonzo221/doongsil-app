// 둥실 브랜드 팔레트 — 로딩 화면 그림(북극곰이 떠 있는 맑은 물)에서 뽑은 물색 블루/아쿠아 + 곰의 크림색.
// 글씨 위에 흰색을 얹는 primary/blueSea는 모두 WCAG AA(4.5:1) 이상이다.
export const colors = {
  aqua: '#3BACD5', // 장식용 하이라이트/그라데이션 (글씨 배경으로는 쓰지 않는다)
  blueSea: '#0E66A0', // 보조 강조 — 작은 글씨에 쓰는 진한 바다색
  deepSea: '#0B2A4A', // 가장 진한 글씨/눌림 상태
  alert: '#E5243B', // 모집 알림 전용 빨강 — 흰 글씨와 대비 4.5:1
  alertSoft: '#FDE8EB',
  coral: '#FF7E5F', // 브랜드 포인트 — 지도 핀/배지 등 장식용 (글씨 색으로는 대비 부족)

  background: '#EAF7FC',
  backgroundGradient: ['#F0FAFD', '#C9E9F6'] as const,
  // 그림 속 곰 털 색 — 카드 위 포인트/하이라이트용
  cream: '#F7F2E6',
  // 티칭 탭 전용 — 깊은 바닷속 느낌의 어두운 배경.
  deepSeaGradient: ['#0B2A4A', '#04172A'] as const,
  // 로딩/로그인 화면. splashBackground는 app.json의 네이티브 스플래시 배경색과 같아야
  // 스플래시에서 로딩 화면으로 넘어갈 때 색이 튀지 않는다.
  splashBackground: '#3BACD5',
  splashGradient: ['#2E9CCB', '#1B7DB0', '#0D5F8F'] as const,
  card: '#FFFFFF',
  cardSoft: '#E2F4FA',

  primary: '#0A78A6',
  primaryPressed: '#0B2A4A',
  disabled: '#C7CCD2',
  disabledText: '#9AA1A8',

  text: '#0B2A4A',
  textMuted: '#4E6F82',
  border: '#C6E4F0',
  white: '#FFFFFF',
  shadow: '#7EC3DD',

  // 애플 건강 캘린더 참고 — 활동량(주황/붉은 계열), 수영량(파란 계열) 링.
  ringActivity: '#FF6B3D',
  ringActivityTrack: '#FFE2D4',
  ringSwim: '#2F9BFF',
  ringSwimTrack: '#D6ECFF',
};

export const moodColors: Record<string, string> = {
  great: '#8DE4EC',
  good: '#43C2D2',
  okay: '#1A8CB8',
  tired: '#0F6A9A',
  hard: '#0B2A4A',
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
