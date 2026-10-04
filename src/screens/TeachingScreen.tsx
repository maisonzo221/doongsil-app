import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import ComingSoonScreen from './ComingSoonScreen';
import VideoPlayerModal from '../components/VideoPlayerModal';
import { colors, fonts, radius, spacing } from '../theme';
import { formatViewCount, isYoutubeConfigured, searchSwimVideos, YoutubeVideo } from '../services/youtube';

const TOP_QUERY = '수영 팁 shorts';

const CATEGORIES: { title: string; query: string }[] = [
  { title: '자유형 팁', query: '자유형 영법 교정' },
  { title: '턴 & 출발', query: '수영 턴 출발 연습' },
  { title: '초보자 가이드', query: '수영 초보 배우기' },
  { title: '장비 리뷰', query: '수영 고글 수모 리뷰' },
];

function VideoThumb({
  video,
  style,
  vertical,
  onPress,
}: {
  video: YoutubeVideo;
  style?: any;
  vertical?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.thumbCard, style]} onPress={onPress}>
      <Image
        source={{ uri: video.thumbnailUrl }}
        style={[styles.thumbImage, vertical && styles.thumbImageVertical]}
      />
      <Text style={styles.thumbTitle} numberOfLines={2}>
        {video.title}
      </Text>
      <Text style={styles.thumbMeta} numberOfLines={1}>
        {video.channelTitle} · {formatViewCount(video.viewCount)}
      </Text>
    </TouchableOpacity>
  );
}

function CategoryRow({
  title,
  query,
  onSelectVideo,
}: {
  title: string;
  query: string;
  onSelectVideo: (id: string) => void;
}) {
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [loading, setLoading] = useState(true);

  // 탭에 다시 들어올 때마다 다시 확인한다 — 같은 슬롯(아침6시~저녁6시 등) 안이면
  // 캐시된 결과가 바로 돌아오고, 슬롯이 바뀌었으면 실제로 새로 검색한다.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      searchSwimVideos(query, 6).then((v) => {
        if (!cancelled) {
          setVideos(v);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [query])
  );

  if (!loading && videos.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{title}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.categoryLoading} />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(v) => v.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <VideoThumb video={item} style={styles.categoryThumb} onPress={() => onSelectVideo(item.id)} />
          )}
        />
      )}
    </View>
  );
}

export default function TeachingScreen() {
  const [topVideos, setTopVideos] = useState<YoutubeVideo[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // 최근 14일 내 업로드로 한정 — "오늘의 인기 쇼츠"가 트렌드를 반영하게 한다.
      searchSwimVideos(TOP_QUERY, 4, 14).then((v) => {
        if (!cancelled) {
          setTopVideos(v);
          setLoadingTop(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (!isYoutubeConfigured) {
    return (
      <ComingSoonScreen
        title="티칭"
        emoji="🎬"
        description={'수영 관련 인기 영상을 모아 보여드릴게요.\n조금만 기다려주세요!'}
      />
    );
  }

  return (
    <ScreenBackground gradient={colors.deepSeaGradient}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>티칭</Text>

        <Text style={styles.topTitle}>오늘의 인기 쇼츠</Text>
        {loadingTop ? (
          <ActivityIndicator color={colors.primary} style={styles.categoryLoading} />
        ) : (
          <View style={styles.topGrid}>
            {topVideos.slice(0, 4).map((v) => (
              <VideoThumb
                key={v.id}
                video={v}
                style={styles.topThumb}
                vertical
                onPress={() => setPlayingId(v.id)}
              />
            ))}
          </View>
        )}

        {CATEGORIES.map((c) => (
          <CategoryRow key={c.title} title={c.title} query={c.query} onSelectVideo={setPlayingId} />
        ))}
      </ScrollView>

      <VideoPlayerModal videoId={playingId} onClose={() => setPlayingId(null)} />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  pageTitle: { fontSize: 28, fontFamily: fonts.bold, color: colors.white, marginBottom: spacing.sm, marginLeft: spacing.hairline },
  topTitle: { fontFamily: fonts.bold, color: colors.white, fontSize: 15, marginBottom: spacing.xs, marginLeft: spacing.hairline },
  topGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.lg },
  topThumb: { width: '48.5%', marginBottom: spacing.xs },
  thumbCard: { backgroundColor: colors.card, borderRadius: radius.sm, overflow: 'hidden' },
  thumbImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.cardSoft },
  thumbImageVertical: { aspectRatio: 9 / 16 },
  thumbTitle: {
    fontFamily: fonts.semibold,
    color: colors.text,
    fontSize: 12,
    padding: spacing.hairline + 2,
    paddingBottom: 2,
  },
  thumbMeta: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    fontSize: 10,
    paddingHorizontal: spacing.hairline + 2,
    paddingBottom: spacing.hairline,
  },
  categorySection: { marginBottom: spacing.md },
  categoryTitle: { fontFamily: fonts.bold, color: colors.white, fontSize: 15, marginBottom: spacing.xs, marginLeft: spacing.hairline },
  categoryList: { gap: spacing.hairline, paddingLeft: spacing.hairline },
  categoryThumb: { width: 230 },
  categoryLoading: { marginVertical: spacing.sm },
});
