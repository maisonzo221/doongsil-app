import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ScreenBackground from '../../components/ScreenBackground';
import PoolMapView, { isNaverMapConfigured } from '../../components/PoolMapView';
import { colors, fonts, radius, spacing } from '../../theme';
import { TipRoomStackParamList } from '../../navigation/tipRoomTypes';
import {
  BOARD_CATEGORIES,
  BoardPost,
  createBoardPost,
  getBoardPosts,
} from '../../storage/tipRoom';
import {
  findPoolsNear,
  getDefaultOfficialPools,
  getFreeSwimPools,
  isPoolDataConfigured,
  mapLinkFor,
  OfficialPool,
  registrationSearchLinkFor,
  searchOfficialPools,
} from '../../services/poolData';
import { getCurrentUser, UserProfile } from '../../storage/auth';
import { looksLikeAdminPlace, PlaceInfo } from '../../services/geo';
import { geocodePlace, reversePlace } from '../../services/placeSearch';

type Props = NativeStackScreenProps<TipRoomStackParamList, 'TipRoomHome'>;

type Tab = 'board' | 'pools' | 'freeSwim';

// 세 메뉴가 서로 다른 챕터처럼 느껴지게, 탭마다 고유 색/아이콘/한줄 설명을 둔다.
const TAB_META: Record<Tab, { label: string; emoji: string; desc: string; accent: string }> = {
  board: { label: '자유게시판', emoji: '💬', desc: '수영 이야기를 자유롭게 나눠요', accent: colors.primary },
  pools: { label: '수영장 찾기', emoji: '📍', desc: '전국 수영장을 지도에서 찾아요', accent: colors.blueSea },
  freeSwim: { label: '자유수영', emoji: '🕒', desc: '자유수영 시간표와 요금을 공유해요', accent: colors.ringActivity },
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return '방금 전';
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function TipRoomHomeScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('board');
  const [me, setMe] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [poolSearch, setPoolSearch] = useState('');

  const [postModal, setPostModal] = useState(false);
  const [postCategory, setPostCategory] = useState(BOARD_CATEGORIES[0]);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');

  const [officialPools, setOfficialPools] = useState<OfficialPool[]>([]);
  const [loadingOfficial, setLoadingOfficial] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  // 동네를 검색해서 찾은 위치. 있으면 지도가 그 위치로 열리고 목록은 그 주변 수영장(거리순)이다.
  const [place, setPlace] = useState<PlaceInfo | null>(null);
  const [searchNote, setSearchNote] = useState<string | null>(null);
  // 사용자가 지도를 끌어서 옮긴 새 중심 — 있으면 "이 지역에서 검색" 버튼을 보여준다.
  const [movedCenter, setMovedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [areaSearching, setAreaSearching] = useState(false);
  // PoolMapView의 지도 HTML이 focus 값에 의존하므로, 매 렌더마다 새 객체를 만들면 지도가 계속 다시 로드된다.
  const mapFocus = useMemo(() => (place ? { lat: place.lat, lng: place.lng, zoom: 14 } : null), [place]);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  // 이미 선택된 카드를 또 눌러도(특히 첫 번째 카드는 처음부터 선택돼 있어서 id가 안 바뀜)
  // 지도가 다시 그쪽으로 이동하도록, 탭할 때마다 값을 바꿔서 PoolMapView에 넘긴다.
  const [poolSelectToken, setPoolSelectToken] = useState(0);
  const poolCarouselRef = useRef<FlatList<OfficialPool>>(null);

  const [freeSwimSearch, setFreeSwimSearch] = useState('');
  const [freeSwimSelectedId, setFreeSwimSelectedId] = useState<string | null>(null);
  const [freeSwimSelectToken, setFreeSwimSelectToken] = useState(0);
  const freeSwimCarouselRef = useRef<FlatList<OfficialPool>>(null);
  const freeSwimPools = useMemo(() => getFreeSwimPools(freeSwimSearch), [freeSwimSearch]);

  // 수영장 찾기 탭에 처음 들어왔을 때 지도 중심을 내 현재 위치로 잡기 위해 GPS를 한 번 받아온다.
  // 권한을 거부했거나 위치를 못 가져와도 기존 기본 목록으로 조용히 대체된다.
  useEffect(() => {
    if (tab !== 'pools' || userLocation) return;
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        // 위치를 못 가져와도 기본 목록으로 계속 진행한다.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, userLocation]);

  useEffect(() => {
    if (tab !== 'pools') return;
    if (!poolSearch.trim()) {
      // 검색 전에도 지도가 켜져있어야 하므로, 기본 수영장 목록으로 미리 채워둔다.
      // GPS 위치를 받아오면(비동기) 거리순으로 다시 정렬돼서 자동으로 업데이트된다.
      setPlace(null);
      setSearchNote(null);
      setMovedCenter(null);
      setLoadingOfficial(false);
      setOfficialPools(getDefaultOfficialPools(30, userLocation ?? undefined));
      return;
    }
    let cancelled = false;
    setLoadingOfficial(true);
    const timer = setTimeout(async () => {
      const q = poolSearch.trim();
      const showPlace = async (found: PlaceInfo) => {
        const near = await findPoolsNear(found);
        if (cancelled) return;
        setPlace(found);
        setMovedCenter(null);
        setSearchNote(
          near.length > 0
            ? `${found.label} 근처 · 수영장 ${near.length}곳`
            : `${found.label} 근처에서 수영장을 찾지 못했어요`
        );
        setOfficialPools(near);
      };
      const showByName = (results: OfficialPool[], note: string | null) => {
        if (cancelled) return;
        setPlace(null);
        setMovedCenter(null);
        setSearchNote(note);
        setOfficialPools(results);
      };

      try {
        // "정발산동", "고양시 일산동구"처럼 지역 이름이면 지도에서 그 동네를 먼저 찾는다.
        if (looksLikeAdminPlace(q)) {
          const found = await geocodePlace(q, userLocation);
          if (cancelled) return;
          if (found) {
            await showPlace(found);
            return;
          }
        }
        // 수영장 이름/주소로 직접 찾아본다 (예: "회현체육관").
        const byName = await searchOfficialPools(q);
        if (cancelled) return;
        // 주소에만 글자가 겹친 건(예: "고양"이 고양시 수영장 전부의 주소에 있음) 이름 검색으로 안 친다.
        const words = q.split(/\s+/);
        if (byName.some((p) => !p.nearbyMatch && words.every((w) => p.name.includes(w)))) {
          showByName(byName, null);
          return;
        }
        // 이름으로는 없으면 "일산"처럼 지역 이름일 수 있으니 동네로 한 번 더 찾아본다.
        if (!looksLikeAdminPlace(q)) {
          const found = await geocodePlace(q, userLocation);
          if (cancelled) return;
          if (found) {
            await showPlace(found);
            return;
          }
        }
        showByName(byName, byName.length === 0 ? `"${q}" 위치나 수영장을 찾지 못했어요. 지역 이름을 확인해주세요.` : null);
      } finally {
        if (!cancelled) setLoadingOfficial(false);
      }
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tab, poolSearch, userLocation]);

  // 지도를 끌어서 옮긴 뒤 "이 지역에서 검색"을 누르면, 지도 중심 주변 수영장을 찾는다.
  async function searchHere() {
    if (!movedCenter || areaSearching) return;
    setAreaSearching(true);
    try {
      const found = (await reversePlace(movedCenter.lat, movedCenter.lng)) ?? {
        lat: movedCenter.lat,
        lng: movedCenter.lng,
        label: '지도 중심',
        radiusKm: 4,
        regionTerms: [],
      };
      const near = await findPoolsNear(found);
      setPlace(found);
      setMovedCenter(null);
      setSearchNote(
        near.length > 0 ? `${found.label} 근처 · 수영장 ${near.length}곳` : `${found.label} 근처에서 수영장을 찾지 못했어요`
      );
      setOfficialPools(near);
    } finally {
      setAreaSearching(false);
    }
  }

  useEffect(() => {
    setSelectedPoolId(officialPools.length > 0 ? officialPools[0].id : null);
  }, [officialPools]);

  useEffect(() => {
    setFreeSwimSelectedId(freeSwimPools.length > 0 ? freeSwimPools[0].id : null);
  }, [freeSwimPools]);

  // 지도 핀을 탭했을 때(onSelectPool) 하단 카드 캐러셀에서도 그 카드가 보이게 스크롤한다.
  // InfoWindow 위치가 어긋나도, 여기 카드는 항상 정확한 전체 정보를 보여준다.
  function selectPool(id: string) {
    setSelectedPoolId(id);
    setPoolSelectToken((t) => t + 1);
    const index = officialPools.findIndex((p) => p.id === id);
    if (index >= 0) {
      poolCarouselRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  }

  function selectFreeSwimPool(id: string) {
    setFreeSwimSelectedId(id);
    setFreeSwimSelectToken((t) => t + 1);
    const index = freeSwimPools.findIndex((p) => p.id === id);
    if (index >= 0) {
      freeSwimCarouselRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  }

  const reload = useCallback(async () => {
    const [user, postList] = await Promise.all([getCurrentUser(), getBoardPosts()]);
    setMe(user);
    setPosts(postList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  async function handleSubmitPost() {
    if (!postTitle.trim() || !postBody.trim()) return;
    await createBoardPost(postCategory, postTitle.trim(), postBody.trim());
    setPostModal(false);
    setPostTitle('');
    setPostBody('');
    await reload();
  }

  const disabled = !me || me.provider !== 'apple';

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>가이드</Text>

          <View style={styles.tabRow}>
            {(Object.keys(TAB_META) as Tab[]).map((t) => {
              const meta = TAB_META[t];
              const active = tab === t;
              return (
                <TouchableOpacity key={t} style={styles.tabBtn} onPress={() => setTab(t)}>
                  <Text style={[styles.tabEmoji, !active && styles.tabEmojiInactive]}>{meta.emoji}</Text>
                  <Text style={[styles.tabText, active && { color: meta.accent, fontFamily: fonts.bold }]}>
                    {meta.label}
                  </Text>
                  <View style={[styles.tabUnderline, active && { backgroundColor: meta.accent }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.chapterBanner, { backgroundColor: `${TAB_META[tab].accent}1F` }]}>
          <Text style={styles.chapterEmoji}>{TAB_META[tab].emoji}</Text>
          <Text style={[styles.chapterDesc, { color: TAB_META[tab].accent }]}>{TAB_META[tab].desc}</Text>
        </View>

        {disabled ? (
          <View style={styles.disabledNotice}>
            <Text style={styles.disabledText}>가이드 기능은 Apple 로그인 계정에서만 사용할 수 있어요.</Text>
          </View>
        ) : tab === 'board' ? (
          <ScrollView contentContainerStyle={styles.list}>
            <TouchableOpacity style={styles.addRow} onPress={() => setPostModal(true)}>
              <Text style={styles.addRowText}>+ 글쓰기</Text>
            </TouchableOpacity>
            {posts.length === 0 && <Text style={styles.empty}>아직 글이 없어요. 첫 글을 남겨보세요.</Text>}
            {posts.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.postCard}
                onPress={() => navigation.navigate('PostDetail', { postId: p.id })}
              >
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{p.category}</Text>
                </View>
                {p.imageUrl && <Image source={{ uri: p.imageUrl }} style={styles.postImage} />}
                <Text style={styles.postTitle}>{p.title}</Text>
                <Text style={styles.postMeta}>
                  {p.authorNickname} · {timeAgo(p.createdAt)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : tab === 'pools' ? (
          <View style={styles.mapScreen}>
            {isPoolDataConfigured && isNaverMapConfigured && (officialPools.length > 0 || mapFocus) ? (
              <PoolMapView
                pools={officialPools}
                fill
                selectedId={selectedPoolId}
                selectToken={poolSelectToken}
                onSelectPool={selectPool}
                userLocation={userLocation}
                focus={mapFocus}
                onMapMoved={setMovedCenter}
              />
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.empty}>
                  {!isPoolDataConfigured || !isNaverMapConfigured
                    ? '수영장 검색 기능을 준비하고 있어요. 조금만 기다려주세요!'
                    : loadingOfficial
                    ? ''
                    : poolSearch.trim()
                    ? '검색 결과가 없어요.'
                    : '수영장 이름이나 지역을 검색해보세요. 행정안전부 공식 데이터예요.'}
                </Text>
              </View>
            )}

            <View style={styles.floatingSearchWrap}>
              <View style={styles.floatingSearchBar}>
                <TextInput
                  style={styles.floatingSearchInput}
                  value={poolSearch}
                  onChangeText={setPoolSearch}
                  placeholder="수영장 이름이나 동네(예: 정발산동, 고양시)로 검색"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="search"
                />
                {(loadingOfficial || areaSearching) && <ActivityIndicator color={colors.primary} size="small" />}
              </View>
            </View>

            {(!!searchNote || !!movedCenter) && (
              <View style={styles.floatingNoteWrap} pointerEvents="box-none">
                {!!searchNote && (
                  <View style={styles.noteChip}>
                    <Text style={styles.noteText} numberOfLines={1}>
                      {searchNote}
                    </Text>
                  </View>
                )}
                {!!movedCenter && (
                  <TouchableOpacity style={styles.hereButton} onPress={searchHere} disabled={areaSearching}>
                    <Text style={styles.hereButtonText}>이 지역에서 검색</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {officialPools.length > 0 && (
              <FlatList
                ref={poolCarouselRef}
                horizontal
                data={officialPools}
                keyExtractor={(p) => p.id}
                showsHorizontalScrollIndicator={false}
                style={styles.bottomCarouselWrap}
                contentContainerStyle={styles.bottomCarousel}
                getItemLayout={(_, index) => ({ length: 298, offset: 298 * index, index })}
                onScrollToIndexFailed={() => {}}
                renderItem={({ item }) => {
                  const mapLink = mapLinkFor(item);
                  const selected = item.id === selectedPoolId;
                  const operHours = [item.operWeekday && `평일 ${item.operWeekday}`, item.operWeekend && `주말 ${item.operWeekend}`]
                    .filter(Boolean)
                    .join(' · ');
                  const lines = selected ? 3 : 1;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.poolCardFloating,
                        selected && styles.poolCardFloatingSelected,
                        selected && styles.poolCardFloatingEnlarged,
                      ]}
                      onPress={() => selectPool(item.id)}
                    >
                      <View style={styles.poolHeaderRow}>
                        <View style={styles.poolNameRow}>
                          {item.nearbyMatch && (
                            <View style={styles.nearbyBadge}>
                              <Text style={styles.nearbyBadgeText}>근처</Text>
                            </View>
                          )}
                          {item.distanceKm != null && (
                            <View style={styles.nearbyBadge}>
                              <Text style={styles.nearbyBadgeText}>{item.distanceKm}km</Text>
                            </View>
                          )}
                          <Text style={[styles.poolName, selected && styles.poolNameEnlarged]} numberOfLines={selected ? 2 : 1}>
                            {item.name}
                          </Text>
                        </View>
                        <Text style={styles.poolStatus}>{item.statusName}</Text>
                      </View>
                      <Text style={[styles.poolMeta, selected && styles.poolMetaEnlarged]} numberOfLines={selected ? 2 : 1}>
                        {item.roadAddress}
                      </Text>

                      {!!operHours && (
                        <View style={styles.poolDetailRow}>
                          <Text style={[styles.poolDetailLabel, selected && styles.poolDetailLabelEnlarged]}>운영시간</Text>
                          <Text style={[styles.poolDetailValue, selected && styles.poolDetailValueEnlarged]} numberOfLines={lines}>{operHours}</Text>
                        </View>
                      )}
                      {!!item.sizeText && (
                        <View style={styles.poolDetailRow}>
                          <Text style={[styles.poolDetailLabel, selected && styles.poolDetailLabelEnlarged]}>규모</Text>
                          <Text style={[styles.poolDetailValue, selected && styles.poolDetailValueEnlarged]} numberOfLines={lines}>{item.sizeText}</Text>
                        </View>
                      )}
                      {!!item.freeSwimInfo && (
                        <View style={styles.poolDetailRow}>
                          <Text style={[styles.poolDetailLabel, selected && styles.poolDetailLabelEnlarged]}>자유수영</Text>
                          <Text style={[styles.poolDetailValue, selected && styles.poolDetailValueEnlarged]} numberOfLines={lines}>{item.freeSwimInfo}</Text>
                        </View>
                      )}
                      {!!item.feeText && (
                        <View style={styles.poolDetailRow}>
                          <Text style={[styles.poolDetailLabel, selected && styles.poolDetailLabelEnlarged]}>이용료</Text>
                          <Text style={[styles.poolDetailValue, selected && styles.poolDetailValueEnlarged]} numberOfLines={lines}>{item.feeText}</Text>
                        </View>
                      )}
                      {!!item.capacity && (
                        <View style={styles.poolDetailRow}>
                          <Text style={[styles.poolDetailLabel, selected && styles.poolDetailLabelEnlarged]}>수용인원</Text>
                          <Text style={[styles.poolDetailValue, selected && styles.poolDetailValueEnlarged]} numberOfLines={lines}>{item.capacity}명</Text>
                        </View>
                      )}
                      {!!item.amenities && (
                        <View style={styles.poolDetailRow}>
                          <Text style={[styles.poolDetailLabel, selected && styles.poolDetailLabelEnlarged]}>부대시설</Text>
                          <Text style={[styles.poolDetailValue, selected && styles.poolDetailValueEnlarged]} numberOfLines={lines}>{item.amenities}</Text>
                        </View>
                      )}
                      {!!item.closedDay && (
                        <View style={styles.poolDetailRow}>
                          <Text style={[styles.poolDetailLabel, selected && styles.poolDetailLabelEnlarged]}>휴관일</Text>
                          <Text style={[styles.poolDetailValue, selected && styles.poolDetailValueEnlarged]} numberOfLines={lines}>{item.closedDay}</Text>
                        </View>
                      )}
                      {!!item.notes && (
                        <View style={styles.poolDetailRow}>
                          <Text style={[styles.poolDetailLabel, selected && styles.poolDetailLabelEnlarged]}>비고</Text>
                          <Text style={[styles.poolDetailValue, selected && styles.poolDetailValueEnlarged]} numberOfLines={lines}>{item.notes}</Text>
                        </View>
                      )}

                      <View style={styles.poolActionsRow}>
                        {item.phone && (
                          <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                            <Text style={styles.poolAction}>전화하기</Text>
                          </TouchableOpacity>
                        )}
                        {mapLink && (
                          <TouchableOpacity onPress={() => Linking.openURL(mapLink)}>
                            <Text style={styles.poolAction}>길찾기</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => Linking.openURL(registrationSearchLinkFor(item))}>
                          <Text style={styles.poolAction}>수강신청</Text>
                        </TouchableOpacity>
                        {item.homepageUrl && (
                          <TouchableOpacity
                            onPress={() =>
                              Linking.openURL(
                                item.homepageUrl!.startsWith('http') ? item.homepageUrl! : `https://${item.homepageUrl}`
                              )
                            }
                          >
                            <Text style={styles.poolAction}>홈페이지</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        ) : (
          <View style={styles.mapScreen}>
            {isNaverMapConfigured && freeSwimPools.length > 0 ? (
              <PoolMapView
                pools={freeSwimPools}
                fill
                selectedId={freeSwimSelectedId}
                selectToken={freeSwimSelectToken}
                onSelectPool={selectFreeSwimPool}
              />
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.empty}>
                  {!isNaverMapConfigured
                    ? '자유수영 정보를 준비하고 있어요. 조금만 기다려주세요!'
                    : freeSwimSearch.trim()
                    ? '검색 결과가 없어요.'
                    : '자유수영 시간 정보가 있는 수영장이 아직 서울 지역 위주예요.'}
                </Text>
              </View>
            )}

            <View style={styles.floatingSearchWrap}>
              <View style={styles.floatingSearchBar}>
                <TextInput
                  style={styles.floatingSearchInput}
                  value={freeSwimSearch}
                  onChangeText={setFreeSwimSearch}
                  placeholder="수영장 이름이나 지역(예: 강남구)으로 검색"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {freeSwimPools.length > 0 && (
              <FlatList
                ref={freeSwimCarouselRef}
                horizontal
                data={freeSwimPools}
                keyExtractor={(p) => p.id}
                showsHorizontalScrollIndicator={false}
                style={styles.bottomCarouselWrap}
                contentContainerStyle={styles.bottomCarousel}
                getItemLayout={(_, index) => ({ length: 298, offset: 298 * index, index })}
                onScrollToIndexFailed={() => {}}
                renderItem={({ item }) => {
                  const mapLink = mapLinkFor(item);
                  const selected = item.id === freeSwimSelectedId;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.poolCardFloating,
                        selected && styles.poolCardFloatingSelected,
                        selected && styles.poolCardFloatingEnlarged,
                      ]}
                      onPress={() => selectFreeSwimPool(item.id)}
                    >
                      <Text style={[styles.poolName, selected && styles.poolNameEnlarged]} numberOfLines={selected ? 2 : 1}>
                        {item.name}
                      </Text>
                      <Text
                        style={[styles.poolMeta, selected && styles.poolMetaEnlarged]}
                        numberOfLines={selected ? 2 : 1}
                      >
                        {item.roadAddress}
                      </Text>

                      <View style={styles.poolDetailRow}>
                        <Text style={[styles.poolDetailLabel, selected && styles.poolDetailLabelEnlarged]}>
                          자유수영
                        </Text>
                        <Text
                          style={[styles.poolDetailValue, selected && styles.poolDetailValueEnlarged]}
                          numberOfLines={selected ? 3 : 1}
                        >
                          {item.freeSwimInfo}
                        </Text>
                      </View>
                      {!!item.feeText && (
                        <View style={styles.poolDetailRow}>
                          <Text style={[styles.poolDetailLabel, selected && styles.poolDetailLabelEnlarged]}>
                            이용료
                          </Text>
                          <Text
                            style={[styles.poolDetailValue, selected && styles.poolDetailValueEnlarged]}
                            numberOfLines={selected ? 3 : 1}
                          >
                            {item.feeText}
                          </Text>
                        </View>
                      )}

                      <View style={styles.poolActionsRow}>
                        {item.phone && (
                          <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phone}`)}>
                            <Text style={styles.poolAction}>전화하기</Text>
                          </TouchableOpacity>
                        )}
                        {mapLink && (
                          <TouchableOpacity onPress={() => Linking.openURL(mapLink)}>
                            <Text style={styles.poolAction}>길찾기</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        )}
      </View>

      {/* 글쓰기 모달 */}
      <Modal visible={postModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.modalCardTall]}>
            <ScrollView>
              <Text style={styles.modalTitle}>글쓰기</Text>
              <View style={styles.categoryPickRow}>
                {BOARD_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.categoryChip, postCategory === c && styles.categoryChipActive]}
                    onPress={() => setPostCategory(c)}
                  >
                    <Text
                      style={[styles.categoryChipText, postCategory === c && styles.categoryChipTextActive]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                value={postTitle}
                onChangeText={setPostTitle}
                placeholder="제목"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, styles.textarea]}
                value={postBody}
                onChangeText={setPostBody}
                placeholder="내용을 적어주세요"
                placeholderTextColor={colors.textMuted}
                multiline
              />
              <View style={styles.modalRow}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setPostModal(false)}>
                  <Text style={styles.modalCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={handleSubmitPost}>
                  <Text style={styles.modalConfirmText}>올리기</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text, marginBottom: spacing.sm },
  tabRow: { flexDirection: 'row' },
  tabBtn: { flex: 1, alignItems: 'center', paddingBottom: spacing.xs },
  tabEmoji: { fontSize: 18, marginBottom: 2 },
  tabEmojiInactive: { opacity: 0.4 },
  tabText: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 12 },
  tabUnderline: { height: 3, borderRadius: 2, alignSelf: 'stretch', marginTop: spacing.hairline, backgroundColor: 'transparent' },
  chapterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  chapterEmoji: { fontSize: 16 },
  chapterDesc: { fontFamily: fonts.semibold, fontSize: 12 },
  disabledNotice: { padding: spacing.lg, alignItems: 'center' },
  disabledText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  // 수영장 찾기 탭: 헬로스윔/네이버지도처럼 지도가 화면을 꽉 채우고, 검색창은 지도 위에
  // 떠 있는 카드로, 결과는 하단에 가로로 넘기는 카드로 보여준다.
  mapScreen: { flex: 1 },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  floatingSearchWrap: { position: 'absolute', top: spacing.xs, left: spacing.sm, right: spacing.sm },
  floatingSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  floatingSearchInput: { flex: 1, fontFamily: fonts.regular, color: colors.text, fontSize: 14 },
  floatingNoteWrap: { position: 'absolute', top: 64, left: spacing.sm, right: spacing.sm, alignItems: 'center', gap: spacing.hairline + 2 },
  noteChip: {
    backgroundColor: 'rgba(11,42,74,0.86)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 2,
    maxWidth: '100%',
  },
  noteText: { fontFamily: fonts.semibold, color: colors.white, fontSize: 12 },
  hereButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  hereButtonText: { fontFamily: fonts.bold, color: colors.white, fontSize: 13 },
  bottomCarouselWrap: { position: 'absolute', left: 0, right: 0, bottom: spacing.sm },
  bottomCarousel: { paddingHorizontal: spacing.sm, gap: spacing.xs },
  poolCardFloating: {
    width: 290,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  poolCardFloatingSelected: { borderWidth: 2, borderColor: colors.primary },
  // 핀이나 카드를 탭해서 선택되면, 카드가 살짝 커지고 글씨도 커져서 정보가 잘 보이게 한다.
  poolCardFloatingEnlarged: { width: 320, padding: spacing.sm + 4 },
  poolNameEnlarged: { fontSize: 18 },
  poolMetaEnlarged: { fontSize: 13 },
  poolDetailLabelEnlarged: { fontSize: 13, width: 66 },
  poolDetailValueEnlarged: { fontSize: 13, lineHeight: 18 },
  poolHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.hairline },
  poolNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 },
  nearbyBadge: { backgroundColor: colors.cardSoft, borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 1 },
  nearbyBadgeText: { fontFamily: fonts.bold, color: colors.blueSea, fontSize: 9 },
  poolDetailRow: { flexDirection: 'row', marginTop: spacing.hairline, gap: spacing.hairline },
  poolDetailLabel: { fontFamily: fonts.semibold, color: colors.textMuted, fontSize: 11, width: 56 },
  poolDetailValue: { fontFamily: fonts.regular, color: colors.text, fontSize: 11, flex: 1 },
  addRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xs,
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addRowText: { fontFamily: fonts.semibold, color: colors.primary },
  empty: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, lineHeight: 20 },
  postCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.hairline + 4 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: colors.cardSoft, borderRadius: radius.pill, paddingHorizontal: spacing.hairline + 2, paddingVertical: 2, marginBottom: 4 },
  categoryBadgeText: { fontFamily: fonts.bold, color: colors.blueSea, fontSize: 10 },
  postImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.cardSoft,
  },
  postTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 15 },
  postMeta: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 4,
    marginBottom: spacing.xs,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  loading: { marginTop: spacing.lg },
  poolCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.hairline + 4 },
  poolName: { fontFamily: fonts.bold, color: colors.text, fontSize: 15, flex: 1 },
  poolMeta: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12, marginTop: 2 },
  poolStatus: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 11, marginTop: 2, flexShrink: 0 },
  poolFreeSwim: { fontFamily: fonts.semibold, color: colors.blueSea, fontSize: 12, marginTop: 4 },
  poolActionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  poolAction: { fontFamily: fonts.semibold, color: colors.primary, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(11,42,74,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: { width: '100%', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg },
  modalCardTall: { maxHeight: '85%' },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
  categoryPickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.hairline, marginBottom: spacing.xs },
  categoryChip: { backgroundColor: colors.cardSoft, borderRadius: radius.pill, paddingHorizontal: spacing.xs, paddingVertical: spacing.hairline },
  categoryChipActive: { backgroundColor: colors.primary },
  categoryChipText: { fontFamily: fonts.semibold, color: colors.text, fontSize: 12 },
  categoryChipTextActive: { color: colors.white },
  input: {
    backgroundColor: colors.cardSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.hairline + 4,
    marginBottom: spacing.hairline + 4,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  modalRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  modalCancel: { flex: 1, alignItems: 'center', paddingVertical: spacing.hairline + 4 },
  modalCancelText: { fontFamily: fonts.semibold, color: colors.textMuted },
  modalConfirm: { flex: 1, alignItems: 'center', paddingVertical: spacing.hairline + 4, backgroundColor: colors.primary, borderRadius: radius.pill },
  modalConfirmText: { fontFamily: fonts.semibold, color: colors.white },
});
