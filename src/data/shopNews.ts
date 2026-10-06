// 실제 브랜드 신제품/소식 — 직접 조사해서 공식 보도자료·매체 기사로 확인한 내용만 담는다.
// 지어낸 제품/링크/사진은 절대 넣지 않는다. imageUrl은 각 기사의 공식 보도자료·매체에
// 실려있는 실제 사진(og:image)을 그대로 쓰고, link는 그 원문 기사로 연결한다.
//
// 수영용품 전문 매체엔 "신제품"만 모아주는 RSS가 따로 없어서(SwimSwam 등도 대회 결과·
// 선수 소식이 대부분이고 용품 소식은 간간이 섞여 나옴), 매번 자동으로 가져오지 못하고
// 사람이 주기적으로 다시 조사해서 교체해야 한다 — date는 실제 보도 시점 그대로 적어서,
// 오래된 소식이어도 숨기지 않는다.
//
// 마지막 조사: 2026-10-06.
export interface ShopNewsArticle {
  id: string;
  brand: string;
  title: string;
  summary: string;
  imageUrl: string;
  source: string;
  date: string; // YYYY-MM-DD, 실제 보도/발행일
  link: string;
}

export const SHOP_NEWS: ShopNewsArticle[] = [
  {
    id: 'tyr-katie-ledecky-collection-2026',
    brand: 'TYR',
    title: '케이티 러데키 x TYR, 시그니처 수영 컬렉션 출시',
    summary:
      '9회 올림픽 금메달리스트 케이티 러데키와 TYR이 협업한 시그니처 컬렉션. 여성·주니어 수영복, 테크 수트, 남성 자머, 고글, 수모, 백팩까지 러데키만의 컬러와 그래픽으로 구성됐어요.',
    imageUrl:
      'https://vmrw8k5h.tinifycdn.com/news/wp-content/uploads/2026/08/katie-ledecky-2026-Pan-Pacs-1642-Edit.jpg',
    source: 'Swimming World Magazine',
    date: '2026-08-20',
    link: 'https://www.swimmingworldmagazine.com/news/katie-ledecky-and-tyr-sport-launch-signature-swim-collection',
  },
  {
    id: 'arena-beachwear-ss26',
    brand: 'Arena',
    title: '아레나, SS26 비치웨어 컬렉션 공개',
    summary:
      '경기용 수영을 넘어 라이프스타일 비치웨어로 영역을 넓힌 2026 여름 컬렉션. 프리미엄 라인 "Evolution"과 톡톡 튀는 "Essential" 두 가지로 나뉘고, 샌들·타월·드라이백 등 액세서리도 함께 나왔어요.',
    imageUrl:
      'https://prowly-prod.s3.eu-west-1.amazonaws.com/uploads/landing_page/template_background/450499/effc8d9377d8446638167b60dea85f61.jpg',
    source: 'Arena 공식 보도자료',
    date: '2026-04-01',
    link: 'https://news.arenasport.com/450499-arena-presents-the-newbeachwear-ss26-collection',
  },
  {
    id: 'speedo-vanquisher-3',
    brand: 'Speedo',
    title: '스피도, 훈련·레이싱 1위 고글 "뱅퀴셔 3.0" 리뉴얼 출시',
    summary:
      '기존 대비 시야각 14% 넓어진 오큘러 360 미러 렌즈, 쿠션 핏 기술, UV 100% 차단을 적용한 리뉴얼 모델. 가격은 $25.',
    imageUrl: 'https://mmx.prnewswire.com/media/2606989/Speedo_Vanquisher_3_0_Goggle__1.jpg?p=facebook',
    source: 'PR Newswire',
    date: '2025-01-28',
    link: 'https://www.prnewswire.com/news-releases/speedo-launches-new--improved-1-training--racing-goggle-the-vanquisher-3-0--302361253.html',
  },
];
