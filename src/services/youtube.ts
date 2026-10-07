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
const CACHE_PREFIX = '@doongsil/youtube/';

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

interface CachedEntry {
  slotId: string;
  videos: YoutubeVideo[];
}

async function readCache(cacheKey: string): Promise<CachedEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    return raw ? (JSON.parse(raw) as CachedEntry) : null;
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

async function fetchSwimVideos(
  query: string,
  maxResults: number,
  recentDays?: number
): Promise<YoutubeVideo[]> {
  let url =
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}` +
    `&videoEmbeddable=true&q=${encodeURIComponent(query)}&relevanceLanguage=ko&key=${API_KEY}`;
  if (recentDays) {
    const publishedAfter = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000).toISOString();
    url += `&order=date&publishedAfter=${publishedAfter}`;
  }

  const searchRes = await fetch(url);
  const searchJson = await searchRes.json();
  const ids: string[] = (searchJson.items ?? []).map((item: any) => item.id?.videoId).filter(Boolean);
  if (ids.length === 0) return [];

  const statsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${ids.join(',')}&key=${API_KEY}`
  );
  const statsJson = await statsRes.json();

  return (statsJson.items ?? [])
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
    .sort((a: YoutubeVideo, b: YoutubeVideo) => b.viewCount - a.viewCount);
}

/** 검색어로 영상을 찾고, 조회수 기준으로 정렬해서 돌려준다.
 * recentDays를 주면 최근 N일 내 업로드로 한정해서 검색한다(트렌드성 섹션용) —
 * 안 주면 평소처럼 relevance 기준 전체 기간에서 찾는다(가이드성 섹션용).
 * 같은 "슬롯"(아침6시~저녁6시, 저녁6시~다음날아침6시) 안에서는 캐시된 결과를 재사용하고,
 * 슬롯이 바뀌면 실제로 새로 검색한다. */
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
    const videos = await fetchSwimVideos(query, maxResults, recentDays);
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

const TRENDING_QUERY = '수영 팁 shorts';
// 최근 업로드만으로는 개수가 모자랄 때 채워 넣을 다른 수영 주제들 — 매번 그 중 하나를
// 무작위로 골라서, 모자란 칸을 "오늘은 자유형, 내일은 배영" 식으로 다르게 채운다.
const TRENDING_FALLBACK_TOPICS = [
  '수영 자유형 꿀팁',
  '수영 배영 연습',
  '수영 평영 기초',
  '수영 접영 연습',
  '수영 호흡법',
  '수영 다이어트',
];

/** "오늘의 인기 쇼츠"용. 최근 14일 업로드로 먼저 채우고, 그걸로 개수가 모자라면
 * 수영 주제 중 하나를 무작위로 골라 전체 기간에서 보충한다 — 그래서 최근 쇼츠가
 * 적은 날에도 칸이 비지 않고, 항상 실제 수영 영상으로만 채워진다. */
export async function searchTrendingShorts(maxResults = 4): Promise<YoutubeVideo[]> {
  if (!API_KEY) return [];

  const cacheKey = `${CACHE_PREFIX}trending:${maxResults}`;
  const slotId = currentSlotId();
  const cached = await readCache(cacheKey);
  if (cached && cached.slotId === slotId) {
    return cached.videos;
  }

  try {
    const recent = await fetchSwimVideos(TRENDING_QUERY, maxResults * 2, 14);
    const videos = [...recent];
    const seenIds = new Set(videos.map((v) => v.id));

    if (videos.length < maxResults) {
      const fallbackQuery =
        TRENDING_FALLBACK_TOPICS[Math.floor(Math.random() * TRENDING_FALLBACK_TOPICS.length)];
      const fallback = await fetchSwimVideos(fallbackQuery, maxResults * 2);
      for (const v of fallback) {
        if (videos.length >= maxResults) break;
        if (!seenIds.has(v.id)) {
          videos.push(v);
          seenIds.add(v.id);
        }
      }
    }

    const final = videos.slice(0, maxResults);
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
