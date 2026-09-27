// 실제 브랜드 신제품 소식 — 직접 조사해서 확인한 내용만 담는다.
// 지어낸 제품/링크는 절대 넣지 않는다. 공식 브랜드 사이트로 연결한다.
// 다음 업데이트 때 최신 소식으로 다시 조사해서 교체하면 된다.
export interface ShopNewsArticle {
  id: string;
  brand: string;
  emoji: string;
  title: string;
  summary: string;
  source: string;
  link: string;
}

export const SHOP_NEWS: ShopNewsArticle[] = [
  {
    id: 'arena-2026-collection',
    brand: 'Arena',
    emoji: '\u{1F30A}',
    title: '아레나, 2026 신규 컬렉션 출시',
    summary:
      '레이싱 고글 AIR SONIC, 경기용 수영복 POWERSKIN VELOCE, 훈련용 라인 HYPERFLOW로 구성된 새 컬렉션을 공개했어요.',
    source: 'SwimSwam',
    link: 'https://arena.co.kr/',
  },
  {
    id: 'speedo-vanquisher-3',
    brand: 'Speedo',
    emoji: '\u{1F453}',
    title: '스피도 뱅퀴셔 3.0 미러, 오큘러 360 렌즈 탑재',
    summary: '시야각을 넓힌 오큘러 360 렌즈로 훈련·레이싱용 고글 중 꾸준히 인기를 얻고 있는 모델이에요.',
    source: 'SwimOutlet 2026 가이드',
    link: 'https://speedo.co.kr/',
  },
  {
    id: 'arena-cobra-ultra-swipe',
    brand: 'Arena',
    emoji: '\u{1F3CA}',
    title: '아레나 코브라 울트라 스와이프, 2026 인기 레이싱 고글',
    summary: '스와이프 렌즈 코팅으로 김서림을 줄인 레이싱 고글로, 2026년 랭킹 가이드에서 상위권에 올랐어요.',
    source: 'SwimOutlet 2026 가이드',
    link: 'https://swimlove.co.kr/',
  },
];
