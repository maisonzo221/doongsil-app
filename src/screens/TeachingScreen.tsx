import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenBackground from '../components/ScreenBackground';
import ComingSoonScreen from './ComingSoonScreen';
import { colors, fonts, radius, spacing } from '../theme';
import {
  formatViewCount,
  isYoutubeConfigured,
  searchSwimVideos,
  searchTrendingShorts,
  youtubeWatchUrl,
  YoutubeVideo,
} from '../services/youtube';

function openInYoutube(id: string) {
  Alert.alert('유튜브로 이동', '영상을 보려면 유튜브 앱(또는 웹)으로 이동해요.', [
    { text: '취소', style: 'cancel' },
    { text: '이동', onPress: () => Linking.openURL(youtubeWatchUrl(id)) },
  ]);
}

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
  onBroken,
}: {
  video: YoutubeVideo;
  style?: any;
  vertical?: boolean;
  onPress: () => void;
  onBroken: (id: string) => void;
}) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  // 캐시에 남아있던 옛 버전 데이터 등으로 후보 목록이 비어있을 수도 있으니 방어적으로 처리.
  const candidates = video.thumbnailCandidates ?? [];

  useEffect(() => {
    if (candidates.length === 0) onBroken(video.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (candidates.length === 0) return null;
  const uri = candidates[candidateIndex];

  return (
    <TouchableOpacity style={[styles.thumbCard, style]} onPress={onPress}>
      <Image
        source={{ uri }}
        style={[styles.thumbImage, vertical && styles.thumbImageVertical]}
        onError={() => {
          // 이 화질 썸네일이 깨져 있으면 한 단계 낮은 후보로 넘어가고, 다 깨졌으면
          // 목록에서 이 영상을 숨긴다 — 깨진 이미지 칸이 그대로 보이지 않게.
          if (candidateIndex < candidates.length - 1) {
            setCandidateIndex((i) => i + 1);
          } else {
            onBroken(video.id);
          }
        }}
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

function CategoryRow({ title, query }: { title: string; query: string }) {
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  // 탭에 다시 들어올 때마다 다시 확인한다 — 같은 슬롯(아침6시~저녁6시 등) 안이면
  // 캐시된 결과가 바로 돌아오고, 슬롯이 바뀌었으면 실제로 새로 검색한다.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      searchSwimVideos(query, 6).then((v) => {
        if (!cancelled) {
          setVideos(v);
          setBrokenIds(new Set());
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [query])
  );

  const visibleVideos = videos.filter((v) => !brokenIds.has(v.id));
  if (!loading && visibleVideos.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{title}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.categoryLoading} />
      ) : (
        <FlatList
          data={visibleVideos}
          keyExtractor={(v) => v.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <VideoThumb
              video={item}
              style={styles.categoryThumb}
              onPress={() => openInYoutube(item.id)}
              onBroken={(id) => setBrokenIds((prev) => new Set(prev).add(id))}
            />
          )}
        />
      )}
    </View>
  );
}

export default function TeachingScreen() {
  const [topVideos, setTopVideos] = useState<YoutubeVideo[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const [topBrokenIds, setTopBrokenIds] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // 최근 14일 업로드로 먼저 채우고, 모자라면 다른 수영 주제로 자동 보충한다
      // (매일 새벽 6시/저녁 6시에 슬롯이 바뀌면서 새로 받아온다).
      searchTrendingShorts(4).then((v) => {
        if (!cancelled) {
          setTopVideos(v);
          setTopBrokenIds(new Set());
          setLoadingTop(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const visibleTopVideos = topVideos.filter((v) => !topBrokenIds.has(v.id));

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
            {visibleTopVideos.slice(0, 4).map((v) => (
              <VideoThumb
                key={v.id}
                video={v}
                style={styles.topThumb}
                vertical
                onPress={() => openInYoutube(v.id)}
                onBroken={(id) => setTopBrokenIds((prev) => new Set(prev).add(id))}
              />
            ))}
          </View>
        )}

        {CATEGORIES.map((c) => (
          <CategoryRow key={c.title} title={c.title} query={c.query} />
        ))}
      </ScrollView>
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
