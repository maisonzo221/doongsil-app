// 유튜브 Data API v3 연동. EXPO_PUBLIC_YOUTUBE_API_KEY가 없으면 빈 배열을 돌려주고,
// 화면 쪽에서 그 경우를 "준비중" 상태로 보여준다.
//
// 매번 화면을 열 때마다 똑같은 검색어로 relevance 정렬 검색을 하면, 유튜브가 돌려주는
// 상위 결과가 거의 항상 똑같아서 "고정되어 있다"고 느껴진다. 그래서 하루를 아침 6시/
// 저녁 6시 기준 두 "슬롯"으로 나누고, 슬롯이 바뀌기 전까진 캐시된 결과를 그대로 쓰다가
// 슬롯이 바뀌면(=다음 6시/18시가 지나면) 새로 검색해서 캐시를 갈아끼운다. 같은 슬롯
// 안에서는 결과가 안정적으로 유지되고, 슬롯 경계를 넘으면 실제로 다른 영상이 뜬다.
import AsyncStorage from 'expo-sqlite/kv-store';

const API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
// v2: YoutubeVideo에 thumbnailCandidates가 추가되면서 모양이 바뀌었다. 이전 버전이 저장해둔
// v1 캐시를 그대로 읽으면 thumbnailCandidates가 없는 옛날 객체가 돌아와서 화면에서 터진다 —
// 그래서 캐시 키 자체를 새 prefix로 바꿔 옛 캐시를 전부 무시하고 새로 받아오게 한다.
const CACHE_PREFIX = '@doongsil/youtube/v2/';

export interface YoutubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  /** 화질 높은 순으로, API가 실제로 존재한다고 보고한 썸네일만 담는다.
   * 화면에서 하나가 깨져서 못 불러오면 다음 후보로 넘어가고, 하나도 없으면 그 영상은 제외한다. */
  thumbnailCandidates: string[];
  thumbnailUrl: string;
  viewCount: number;
  publishedAt: string;
}

export const isYoutubeConfigured = !!API_KEY;

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** 지금이 속한 "슬롯"의 시작 시각(ISO)을 키로 돌려준다. 매일 06:00/18:00에 슬롯이 바뀐다. */
export function currentSlotId(now: Date = new Date()): string {
  const slotStart = new Date(now);
  const hour = now.getHours();
  if (hour >= 18) {
    slotStart.setHours(18, 0, 0, 0);
  } else if (hour >= 6) {
    slotStart.setHours(6, 0, 0, 0);
  } else {
    slotStart.setDate(slotStart.getDate() - 1);
    slotStart.setHours(18, 0, 0, 0);
  }
  return slotStart.toISOString();
}

/** "요즘 인기 수영 영상" 섹션 전용 — 하루를 새벽 6시/오후 3시/저녁 8시 세 구간으로
 * 나눠서, 그 세 시각마다 새로 받아온다(같은 2슬롯짜리 currentSlotId보다 더 자주 바뀜). */
export function currentTripleSlotId(now: Date = new Date()): string {
  const slotStart = new Date(now);
  const hour = now.getHours();
  if (hour >= 20) {
    slotStart.setHours(20, 0, 0, 0);
  } else if (hour >= 15) {
    slotStart.setHours(15, 0, 0, 0);
  } else if (hour >= 6) {
    slotStart.setHours(6, 0, 0, 0);
  } else {
    slotStart.setDate(slotStart.getDate() - 1);
    slotStart.setHours(20, 0, 0, 0);
  }
  return slotStart.toISOString();
}

interface CachedEntry {
  slotId: string;
  videos: YoutubeVideo[];
}

async function readCache(cacheKey: string): Promise<CachedEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEntry;
    // 모양이 안 맞는 캐시(옛 버전 등)는 쓰지 않고 그냥 새로 받아오게 한다.
    if (!Array.isArray(parsed.videos) || parsed.videos.some((v) => !Array.isArray(v.thumbnailCandidates))) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache(cacheKey: string, entry: CachedEntry): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // 캐시 저장 실패해도 화면엔 영향 없음 — 다음에 또 라이브로 받아오면 된다.
  }
}

// 유튜브 safeSearch=strict로 걸러지는 것과는 별개로, 제목/채널명/설명에 이런 단어가
// 있으면 한 번 더 걸러낸다 — 수영 관련 검색이라도 섞여 들어올 수 있는 음란물/성인물/
// 마약/도박 관련 영상을 이중으로 막기 위함.
const BANNED_CONTENT_PATTERN =
  /(야동|성인방송|19금|노출방송|누드|섹스|자위|음란|마약|필로폰|대마초|도박|불법토토|토토사이트|카지노|베팅사이트|porn|xxx|nsfw|onlyfans|nude|naked girl|sex tape|cocaine|marijuana|weed strain|gambling site|casino bonus)/i;

// "수영"이 소녀시대 멤버(배우/가수 최수영) 이름이기도 해서, 수영(swimming) 검색에 그 사람 영상이 섞여 들어온다.
// 이름이 확실한 표현만 걸러낸다 — "배우 수영"처럼 애매한 건 "수영 배우기"(swimming 강습) 영상을 같이 막을 수 있어 뺐다.
const NOT_SWIMMING_PERSON_PATTERN = /(소녀시대|최수영|snsd|girls['’]?\s*generation|choi\s*soo-?young|sooyoung|배우\s*수영\s*(드라마|인터뷰|화보|근황|출연|열애|결혼|예능|영화)|수영\s*(배우|가수)\s*(인터뷰|화보|근황|출연|드라마|예능|영화))/i;
const SEARCH_EXCLUDE_TERMS = ' -소녀시대 -최수영';

function isBannedContent(title: string, channelTitle: string, description: string): boolean {
  const text = `${title} ${channelTitle} ${description}`;
  return BANNED_CONTENT_PATTERN.test(text) || NOT_SWIMMING_PERSON_PATTERN.test(text);
}

const HANGUL_PATTERN = /[가-힣]/;

// 한국 영상을 우선으로(제목에 한글 포함 여부), 그 안에서는 조회수순.
function compareKoreanFirst(a: YoutubeVideo, b: YoutubeVideo): number {
  const aKo = HANGUL_PATTERN.test(a.title) ? 1 : 0;
  const bKo = HANGUL_PATTERN.test(b.title) ? 1 : 0;
  if (aKo !== bKo) return bKo - aKo;
  return b.viewCount - a.viewCount;
}

async function fetchSwimVideos(
  query: string,
  maxResults: number,
  recentDays?: number,
  videoDuration?: 'short'
): Promise<YoutubeVideo[]> {
  let url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}` +
    `&videoEmbeddable=true&safeSearch=strict&regionCode=KR` +
    `&q=${encodeURIComponent(query + SEARCH_EXCLUDE_TERMS)}&relevanceLanguage=ko&key=${API_KEY}`;
  if (recentDays) {
    const publishedAfter = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000).toISOString();
    url += `&order=date&publishedAfter=${publishedAfter}`;
  }
  // 'shorts'라는 글자가 제목/쿼리에 있는지로 판단하는 대신, 유튜브 API가 실제로 보고하는
  // 영상 길이(4분 이하)로 걸러야 진짜 쇼츠만 뜬다.
  if (videoDuration) {
    url += `&videoDuration=${videoDuration}`;
  }

  const searchRes = await fetch(url);
  const searchJson = await searchRes.json();
  const items: any[] = (searchJson.items ?? []).filter((item: any) => item.id?.videoId);
  if (items.length === 0) return [];
  // 설명은 안전 필터링에만 쓰고 YoutubeVideo엔 안 담는다 — 화면에서 안 쓰는 데이터라서.
  const descriptionById = new Map<string, string>(
    items.map((item) => [item.id.videoId, item.snippet?.description ?? ''])
  );
  const ids = items.map((item) => item.id.videoId);

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(',')}&key=${API_KEY}`
  );
  const statsJson = await statsRes.json();

  return (statsJson.items ?? [])
    .filter((item: any) =>
      !isBannedContent(item.snippet?.title ?? '', item.snippet?.channelTitle ?? '', descriptionById.get(item.id) ?? '')
    )
    .map((item: any) => {
      // medium(320x180)은 큰 그리드/세로 썸네일에선 흐릿하게 뜬다 — 실제로 존재하는
      // 더 고화질 썸네일부터 순서대로 후보에 담고, 화면에서 하나가 깨지면 다음 걸 쓴다.
      const thumbs = item.snippet?.thumbnails ?? {};
      const thumbnailCandidates: string[] = [
        thumbs.maxres?.url,
        thumbs.standard?.url,
        thumbs.high?.url,
        thumbs.medium?.url,
        thumbs.default?.url,
      ].filter((url): url is string => !!url);
      return {
        id: item.id,
        title: item.snippet?.title ?? '',
        channelTitle: item.snippet?.channelTitle ?? '',
        thumbnailCandidates,
        thumbnailUrl: thumbnailCandidates[0] ?? '',
        viewCount: Number(item.statistics?.viewCount ?? 0),
        publishedAt: item.snippet?.publishedAt ?? '',
      };
    })
    // 썸네일이 하나도 없는 영상은 목록에서 아예 뺀다.
    .filter((v: YoutubeVideo) => v.thumbnailCandidates.length > 0)
    // 한국 영상을 우선으로 — 제목에 한글이 있는 영상을 먼저, 그 안에서는 조회수순.
    .sort(compareKoreanFirst);
}

// 문자열을 32비트 정수로 해시한다 (seededShuffle의 시드용 — 날짜/쿼리별로 매번 다르지만
// 재현 가능한 숫자가 필요해서).
function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

// seed로 결정되는, 매번 똑같이 재현되는 셔플(mulberry32 PRNG + Fisher-Yates) — 진짜
// Math.random()을 쓰면 캐시를 다시 읽을 때마다 순서가 달라져서 못 쓴다.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  const next = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 검색어로 영상을 찾고, 조회수 기준으로 정렬해서 돌려준다.
 * recentDays를 주면 최근 N일 내 업로드로 한정해서 검색한다(트렌드성 섹션용) —
 * 안 주면 평소처럼 relevance 기준 전체 기간에서 찾는다(가이드성 섹션용).
 *
 * relevance 검색은 같은 검색어면 거의 항상 똑같은 상위 결과를 돌려준다 — 그래서 캐시
 * 슬롯이 바뀌어서 다시 검색해도 "자유형 영법 교정" 같은 검색어는 매번 똑같은 영상
 * 6개만 나왔었다. 이제 relevance 검색은 실제 필요한 개수보다 훨씬 많이(최대 20개)
 * 받아와서, 그 안에서 슬롯(날짜)마다 다른 부분집합을 골라 보여준다 — 그래서 품질은
 * 유지하면서도 매일 새벽 6시/저녁 6시마다 실제로 다른 영상이 보인다.
 *
 * recentDays가 있는(최신 업로드 한정) 검색은 애초에 그 자체로 매번 달라지니 그대로 둔다.
 */
export async function searchSwimVideos(
  query: string,
  maxResults = 8,
  recentDays?: number
): Promise<YoutubeVideo[]> {
  if (!API_KEY) return [];

  const cacheKey = `${CACHE_PREFIX}${query}:${maxResults}:${recentDays ?? 'all'}`;
  const slotId = currentSlotId();
  const cached = await readCache(cacheKey);
  if (cached && cached.slotId === slotId) {
    return cached.videos;
  }

  try {
    const fetchCount = recentDays ? maxResults : Math.max(maxResults * 3, 20);
    const pool = await fetchSwimVideos(query, fetchCount, recentDays);
    const videos = recentDays
      ? pool
      : seededShuffle(pool, hashString(`${slotId}:${query}`))
          .slice(0, maxResults)
          .sort(compareKoreanFirst);
    if (videos.length > 0) {
      await writeCache(cacheKey, { slotId, videos });
      return videos;
    }
    // 빈 결과(쿼터 초과/네트워크 문제 등)면 오래된 캐시라도 있으면 그걸로 버틴다.
    return cached?.videos ?? [];
  } catch {
    return cached?.videos ?? [];
  }
}

const POPULAR_QUERY = '수영';

/** "요즘 인기 수영 영상" 섹션(2열 5줄, 10개)용. "수영"으로 넓게 검색해서 후보 자체가
 * 많기 때문에, 자유형/턴 같은 좁은 카테고리와 달리 매번 진짜 다르게 보인다 — 새벽6시/
 * 오후3시/저녁8시 세 번만 새로 받아오고, 그 안에서는 조회수 높은 순(한국 영상 우선)
 * 으로 고정해서 보여준다. */
export async function searchPopularSwimVideos(maxResults = 10): Promise<YoutubeVideo[]> {
  if (!API_KEY) return [];

  const cacheKey = `${CACHE_PREFIX}popular:${maxResults}`;
  const slotId = currentTripleSlotId();
  const cached = await readCache(cacheKey);
  if (cached && cached.slotId === slotId) {
    return cached.videos;
  }

  try {
    const videos = await fetchSwimVideos(POPULAR_QUERY, maxResults, undefined);
    if (videos.length > 0) {
      await writeCache(cacheKey, { slotId, videos });
      return videos;
    }
    return cached?.videos ?? [];
  } catch {
    return cached?.videos ?? [];
  }
}

/** "오늘의 인기 쇼츠"용. "수영 팁 shorts"처럼 좁은 검색어 대신 "요즘 인기 수영 영상"과
 * 똑같이 넓은 "수영"으로 검색해서 후보 풀 자체를 키운다 — 좁은 검색어는 최근 14일
 * 업로드가 며칠째 그대로라 매번 똑같은 영상만 떴었다. "shorts"라는 글자로 판단하는 대신
 * videoDuration=short(4분 이하) API 필터로 걸러서 진짜 쇼츠만 모은다. 풀을 넉넉히
 * 받아와서 슬롯(날짜)마다 그 안에서 다른 부분집합을 보여준다. */
export async function searchTrendingShorts(maxResults = 4): Promise<YoutubeVideo[]> {
  if (!API_KEY) return [];

  const cacheKey = `${CACHE_PREFIX}trending:${maxResults}`;
  const slotId = currentSlotId();
  const cached = await readCache(cacheKey);
  if (cached && cached.slotId === slotId) {
    return cached.videos;
  }

  try {
    const recent = await fetchSwimVideos(POPULAR_QUERY, Math.max(maxResults * 4, 20), 14, 'short');
    let pool = recent;

    if (pool.length < maxResults) {
      // 최근 14일 쇼츠만으로 모자라면 기간 제한 없이 같은 쿼리로 보충한다.
      const fallback = await fetchSwimVideos(POPULAR_QUERY, Math.max(maxResults * 4, 20), undefined, 'short');
      const seenIds = new Set(pool.map((v) => v.id));
      pool = [...pool, ...fallback.filter((v) => !seenIds.has(v.id))];
    }

    const final = seededShuffle(pool, hashString(`${slotId}:trending`))
      .slice(0, maxResults)
      .sort(compareKoreanFirst);
    if (final.length > 0) {
      await writeCache(cacheKey, { slotId, videos: final });
      return final;
    }
    return cached?.videos ?? [];
  } catch {
    return cached?.videos ?? [];
  }
}

export function formatViewCount(count: number): string {
  if (count >= 10000) return `조회수 ${(count / 10000).toFixed(1)}만회`;
  return `조회수 ${count}회`;
}
