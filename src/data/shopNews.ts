// 실제 한국에서 지금 바로 구매 가능한 수영용품 — 직접 조사해서 각 브랜드의 한국 공식
// 대리점/판매몰에서 실제 재고가 있는 상품만 담는다. link는 "구매하러 가기"를 누르면
// 그 상품 판매 페이지로 바로 연결되고, price는 그 페이지에 적힌 실제 판매가 그대로다.
// imageUrl도 그 판매 페이지에 실려있는 실제 제품 사진이다 — 보도자료나 해외 사이트가
// 아니라, 한국에서 결제까지 끝낼 수 있는 페이지 기준으로만 고른다.
//
// 재고/가격은 각 쇼핑몰 사정으로 수시로 바뀌니, 사람이 주기적으로 다시 확인해서
// 교체해야 한다. date는 마지막으로 확인한 날짜다.
//
// 마지막 조사: 2026-10-06.
export interface ShopNewsArticle {
  id: string;
  brand: string;
  title: string;
  summary: string;
  imageUrl: string;
  price: string;
  source: string;
  date: string; // YYYY-MM-DD, 마지막 확인일
  link: string;
}

export const SHOP_NEWS: ShopNewsArticle[] = [
  {
    id: 'arena-glide-training-mirror-2026',
    brand: 'Arena',
    title: '아레나 글라이드 트레이닝 미러 수경',
    summary:
      '아레나코리아 공식몰에서 바로 구매 가능한 2026년 트레이닝용 미러 수경. 블랙/화이트/옐로우/오렌지 4가지 색상.',
    imageUrl: 'https://multi-sports.co.kr/arena/arena_new/2026/A6AC1AG25BLK/A6AC1AG25BLK.webp',
    price: '49,000원',
    source: '아레나코리아 공식몰',
    date: '2026-10-06',
    link: 'https://arena.co.kr/product/detail.html?product_no=10326&cate_no=239&display_group=1',
  },
  {
    id: 'speedo-vanquisher-3-kr',
    brand: 'Speedo',
    title: '스피도 뱅퀴셔 3.0 미러수경',
    summary: '스피도코리아 공식몰에서 바로 구매 가능. 시야각을 넓힌 오큘러 360 미러 렌즈로 훈련·레이싱 양쪽에서 꾸준히 인기 있는 모델이에요.',
    imageUrl: 'https://speedo.co.kr/web/product/big/202511/a3aa09c349784f1e6eb7866a37a557a3.jpg',
    price: '45,000원',
    source: '스피도코리아 공식몰',
    date: '2026-10-06',
    link: 'https://speedo.co.kr/product/%EB%B1%85%ED%80%B4%EC%85%94-30-%EB%AF%B8%EB%9F%AC%EC%88%98%EA%B2%BD/3411/category/1/display/8/',
  },
  {
    id: 'tyr-tracer-x-elite-kr',
    brand: 'TYR',
    title: 'TYR 트레이서-X 엘리트 레이싱 고글',
    summary: 'TYR 수입 판매점 매버릭스포츠에서 바로 구매 가능한 레이싱 전용 고글. 고무 파킹이 적용돼 피팅감을 더했어요.',
    imageUrl: 'https://maverikswim.co.kr/web/product/medium/202412/b097c9bf61e1f06f269739ad449181ba.jpg',
    price: '150,000원',
    source: '매버릭스포츠',
    date: '2026-10-06',
    link: 'https://maverikswim.co.kr/product/lgtrxel/56760/category/342/display/1/',
  },
];
