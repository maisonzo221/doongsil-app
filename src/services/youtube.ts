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
    .map((item: any) => ({
      id: item.id,
      title: item.snippet?.title ?? '',
      channelTitle: item.snippet?.channelTitle ?? '',
      // medium(320x180)은 큰 그리드/세로 썸네일에선 흐릿하게 뜬다 — 실제로 존재하는
      // 더 고화질 썸네일부터 순서대로 시도하고, maxres/standard가 없는 영상(쇼츠 등은
      // 흔함)은 한 단계씩 내려가며 구한다.
      thumbnailUrl:
        item.snippet?.thumbnails?.maxres?.url ??
        item.snippet?.thumbnails?.standard?.url ??
        item.snippet?.thumbnails?.high?.url ??
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url ??
        '',
      viewCount: Number(item.statistics?.viewCount ?? 0),
      publishedAt: item.snippet?.publishedAt ?? '',
    }))
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

export function formatViewCount(count: number): string {
  if (count >= 10000) return `조회수 ${(count / 10000).toFixed(1)}만회`;
  return `조회수 ${count}회`;
}
