// 한국어 검색어 매칭 — "내수"를 쳤을 때 "ㅇㅇ실내수영장"의 "실내수영장" 가운데 글자가 걸리지 않게 한다.
//
// 네이버·구글 같은 검색엔진은 글자 조각이 아니라 "단어(형태소)" 단위로 찾는다. 문서를 색인할 때 "실내수영장"을
// "실내" + "수영장"으로 쪼개서 저장하기 때문에, "내수"는 그 안에 들어 있지 않아서 걸리지 않는다
// (Elasticsearch의 한국어 분석기 Nori 같은 형태소 분석기가 하는 일). 반대로 "내수읍", "내수국민체육센터"는
// "내수"로 시작하는 단어라서 걸린다. 지도 앱의 지역 검색도 비슷하게, 지역 이름은 주소의 행정구역 단어와 맞춰본다.
//
// 앱 안에서는 형태소 분석기를 쓸 수 없으니 같은 효과를 가볍게 낸다:
//   · 검색어는 "단어의 시작" 또는 "수영장 이름에 흔히 쓰는 말(실내·수영장·국민·체육·센터…)의 시작"에서만 맞춘다.
//   · 그래서 "실내수영장"에서는 "실내"와 "수영장"은 찾아지지만, 가운데에서 시작하는 "내수"는 찾아지지 않는다.
//   · 세 글자 이상은 우연히 겹칠 일이 드물고 "어울림누리"처럼 이름 가운데 단어를 치는 경우가 많아서 이름 어디서든 찾는다.
//     (우연히 겹치는 건 "내수"처럼 두 글자 이하 지역·짧은 말일 때가 대부분이다.)

// 시설 이름을 이루는 흔한 말. 긴 말이 먼저 오게 두지 않아도 되도록, 각 위치에서 이 중 하나로 시작하는지만 본다.
// 지역 이름(내수·가경 등)이나 한 글자 말은 넣지 않는다 — 넣으면 이름 가운데가 단어 시작으로 잘못 잡힌다.
const NAME_WORDS = [
  '실내', '야외', '수영장', '수영', '스위밍', '아쿠아', '워터', '체육센터', '체육관', '체육', '센터', '스포츠', '레포츠',
  '레저', '문화', '시립', '구립', '군립', '도립', '시민', '구민', '군민', '국민', '종합', '생활', '어린이', '청소년',
  '학생', '대학교', '대학', '학교', '복지관', '복지', '수련관', '공원', '클럽', '피트니스', '휘트니스', '헬스', '웰니스',
  '힐링', '리조트', '호텔', '다목적', '운동장', '경기장', '회관', '도서관', '공단', '시설', '관리', '공사', '재단',
  '파크', '풀장', '스파', '자유', '강습', '유아', '키즈',
];

/** 한글 덩어리 안에서 "단어가 시작되는 자리"(처음, 그리고 시설 이름 말이 시작되는 곳)의 번호들. */
function boundaryIndexes(run: string): Set<number> {
  const out = new Set<number>([0]);
  for (let i = 1; i < run.length; i++) {
    if (NAME_WORDS.some((w) => run.startsWith(w, i))) out.add(i);
  }
  return out;
}

const HANGUL_RUN = /[가-힣]+/g;

/** haystack 안에서 token이 "단어(또는 시설 이름 말)의 시작"에 붙어 있는 곳이 있는지. */
export function hasWordStart(haystack: string, token: string): boolean {
  if (!token) return true;
  const text = haystack.toLowerCase();
  const t = token.toLowerCase();
  if (t.length >= 3) return text.includes(t);
  // 한글 덩어리별로 시작 자리를 계산해 둔다.
  const starts = new Set<number>();
  for (const m of text.matchAll(HANGUL_RUN)) {
    const base = m.index ?? 0;
    for (const i of boundaryIndexes(m[0])) starts.add(base + i);
  }
  let from = 0;
  for (;;) {
    const at = text.indexOf(t, from);
    if (at < 0) return false;
    const prev = at === 0 ? '' : text[at - 1];
    // 한글이 아닌 글자(공백·괄호·숫자·영문 등) 바로 뒤이거나, 위에서 계산한 단어 시작 자리면 통과.
    const prevIsHangul = /[가-힣]/.test(prev);
    if (!prevIsHangul || starts.has(at)) return true;
    from = at + 1;
  }
}

/** 모든 검색어가 haystack에 단어 단위로 들어 있는지. */
export function matchesAllWords(haystack: string, tokens: string[]): boolean {
  return tokens.every((t) => hasWordStart(haystack, t));
}
