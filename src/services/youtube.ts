// 유튜브 Data API v3 연동. EXPO_PUBLIC_YOUTUBE_API_KEY가 없으면 빈 배열을 돌려주고,
// 화면 쪽에서 그 경우를 "준비중" 상태로 보여준다.
const API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

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

/** 검색어로 영상을 찾고, 조회수 기준으로 정렬해서 돌려준다. */
export async function searchSwimVideos(query: string, maxResults = 8): Promise<YoutubeVideo[]> {
  if (!API_KEY) return [];

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}` +
        `&q=${encodeURIComponent(query)}&relevanceLanguage=ko&key=${API_KEY}`
    );
    const searchJson = await searchRes.json();
    const ids: string[] = (searchJson.items ?? [])
      .map((item: any) => item.id?.videoId)
      .filter(Boolean);
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
        thumbnailUrl:
          item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? '',
        viewCount: Number(item.statistics?.viewCount ?? 0),
        publishedAt: item.snippet?.publishedAt ?? '',
      }))
      .sort((a: YoutubeVideo, b: YoutubeVideo) => b.viewCount - a.viewCount);
  } catch {
    return [];
  }
}

export function formatViewCount(count: number): string {
  if (count >= 10000) return `조회수 ${(count / 10000).toFixed(1)}만회`;
  return `조회수 ${count}회`;
}
