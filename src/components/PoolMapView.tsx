import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { colors, fonts, radius, spacing } from '../theme';
import { mapLinkFor, OfficialPool } from '../services/poolData';

interface Props {
  pools: OfficialPool[];
  /** true면 카드 안이 아니라 화면을 꽉 채우는 지도(네이버지도/헬로스윔 스타일)로 그린다. */
  fill?: boolean;
  /** 이 id의 수영장으로 지도를 이동시키고 팝업을 띄운다 (하단 카드 탭 연동용). */
  selectedId?: string | null;
  /** 같은 selectedId를 다시 탭해도(이미 선택된 1번째 카드를 또 누르는 경우 등) 지도가
   * 다시 이동하도록, 호출될 때마다 바뀌는 값을 넘긴다 — id 자체는 안 바뀌어도 이 값이
   * 바뀌면 지도가 다시 그 수영장으로 이동한다. */
  selectToken?: number;
  /** 지도 위 핀을 직접 탭했을 때 호출된다 — 하단 카드 캐러셀을 그 카드로 스크롤/선택시키는 용도. */
  onSelectPool?: (id: string) => void;
  /** GPS로 얻은 사용자 현재 위치 — 아직 선택된 수영장이 없을 때 지도 초기 중심으로 쓰고,
   * 파란 점으로 내 위치도 같이 표시한다. */
  userLocation?: { lat: number; lng: number } | null;
  /** 동네 검색 결과 위치 — 있으면 지도를 이 좌표로 열고(첫 수영장으로 튀지 않음), 카드/핀을 누를 때만 이동한다. */
  focus?: { lat: number; lng: number; zoom?: number } | null;
  /** 사용자가 지도를 끌어서 옮겼을 때 새 중심 좌표를 알려준다 ("이 지역에서 검색"용). */
  onMapMoved?: (center: { lat: number; lng: number }) => void;
}

const NAVER_CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID;
// NCP Maps 콘솔의 "Web 서비스 URL"에 등록해 둔 값과 반드시 똑같아야 한다 — 네이버
// 지도 JS SDK가 이 주소를 보고 허용된 도메인인지 검사한다(실제 존재하는 사이트일
// 필요는 없고, 등록값과 WebView의 baseUrl만 일치하면 된다).
const NAVER_BASE_URL = 'https://doongsil.app';

export const isNaverMapConfigured = !!NAVER_CLIENT_ID;

// 네이버지도 JS SDK를 WebView 안에서 그대로 불러와 쓴다 — 헬로스윔(안녕,수영)이 쓰는
// 것과 동일한 지도라, 도로/건물 스타일이 똑같이 나온다. Client ID는 NCP Maps 콘솔의
// Application 등록 후 발급받은 값.
function mapHtml(
  points: { id: string; name: string; addr: string; lat: number; lng: number }[],
  userLoc?: { lat: number; lng: number } | null,
  focus?: { lat: number; lng: number; zoom?: number } | null
): string {
  // 선택된 수영장이 아직 없으면 GPS 현재 위치를 중심으로 잡는다 — 위치 권한이 없거나
  // 아직 못 받아왔으면 기존대로 첫 번째 결과(또는 서울시청)를 기준으로 삼는다.
  const center = focus ?? userLoc ?? (points.length ? points[0] : { lat: 37.5665, lng: 126.978 });
  const zoom = focus ? focus.zoom ?? 14 : points.length > 1 ? 11 : 15;
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CLIENT_ID}"></script>
<style>
  html,body,#map{margin:0;padding:0;height:100%;background:${colors.background};}
  .pin-popup{font-family:-apple-system,sans-serif;padding:8px 10px;max-width:220px;}
  .pin-popup b{font-size:14px;color:${colors.deepSea};}
  .pin-popup .addr{font-size:12px;color:${colors.textMuted};margin-top:2px;}
  .pin-popup a{color:${colors.primary};font-weight:600;text-decoration:none;display:block;margin-top:6px;font-size:13px;}
</style>
</head>
<body>
<div id="map"></div>
<script>
  const points = ${JSON.stringify(points)};
  const markersById = {};
  const infoWindowsById = {};
  let openInfoWindow = null;

  const map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(${center.lat}, ${center.lng}),
    zoom: ${zoom}
  });

  ${
    userLoc
      ? `new naver.maps.Marker({
    position: new naver.maps.LatLng(${userLoc.lat}, ${userLoc.lng}),
    map: map,
    icon: {
      content: '<div style="width:16px;height:16px;border-radius:8px;background:#2F7BF5;border:3px solid #ffffff;box-shadow:0 0 4px rgba(0,0,0,0.3);"></div>',
      size: new naver.maps.Size(16, 16),
      anchor: new naver.maps.Point(8, 8)
    },
    zIndex: 0
  });`
      : ''
  }

  const bounds = new naver.maps.LatLngBounds();
  points.forEach(function (p) {
    const position = new naver.maps.LatLng(p.lat, p.lng);
    // 📍 모양(물방울 핀)이랑 통일 — 지도 핀도 같은 실루엣의 SVG 핀으로 그린다.
    const pinSvg =
      '<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M14 0C6.3 0 0 6.5 0 14.5 0 25 14 36 14 36s14-11 14-21.5C28 6.5 21.7 0 14 0z" fill="${colors.coral}" stroke="#ffffff" stroke-width="2"/>' +
      '<circle cx="14" cy="14.5" r="5" fill="#ffffff"/>' +
      '</svg>';
    const marker = new naver.maps.Marker({
      position: position,
      map: map,
      icon: {
        content: pinSvg,
        size: new naver.maps.Size(28, 36),
        anchor: new naver.maps.Point(14, 36)
      }
    });
    const infoWindow = new naver.maps.InfoWindow({
      content:
        '<div class="pin-popup"><b>' + p.name + '</b>' +
        '<div class="addr">' + p.addr + '</div>' +
        '<a href="#" data-id="' + p.id + '">길찾기 열기</a></div>',
      borderWidth: 1,
      borderColor: '${colors.border}',
      backgroundColor: '#FFFFFF',
      anchorSize: new naver.maps.Size(12, 10),
      pixelOffset: new naver.maps.Point(0, -4)
    });
    naver.maps.Event.addListener(marker, 'click', function () {
      openPopup(p.id);
      // InfoWindow 위치가 잘못 그려지는 경우가 있어서, 핀을 누르면 하단 카드 캐러셀도
      // 같이 선택되게 알려준다 — 거기선 항상 정확하게 전체 정보가 뜬다.
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerTap', id: p.id }));
    });
    markersById[p.id] = marker;
    infoWindowsById[p.id] = infoWindow;
    bounds.extend(position);
  });
  if (!${focus ? 'true' : 'false'} && points.length > 1) {
    map.fitBounds(bounds, { top: 80, right: 40, bottom: 160, left: 40 });
  }

  function openPopup(id) {
    const marker = markersById[id];
    const infoWindow = infoWindowsById[id];
    if (!marker || !infoWindow) return;
    if (openInfoWindow) openInfoWindow.close();
    infoWindow.open(map, marker);
    openInfoWindow = infoWindow;
    naver.maps.Event.addListener(infoWindow, 'domready', function () {
      const links = document.querySelectorAll('.pin-popup a[data-id="' + id + '"]');
      links.forEach(function (a) {
        a.onclick = function (e) {
          e.preventDefault();
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'openMap', id: id }));
        };
      });
    });
  }

  // RN 쪽에서 injectJavaScript로 호출한다 (하단 카드 탭 -> 지도 이동 + 팝업).
  window.flyToPool = function (id) {
    const marker = markersById[id];
    if (!marker) return;
    map.panTo(marker.getPosition());
    map.setZoom(15);
    openPopup(id);
  };

  // 사용자가 지도를 끌어서 옮기면 새 중심을 알려준다 — "이 지역에서 검색" 버튼용.
  naver.maps.Event.addListener(map, 'dragend', function () {
    const c = map.getCenter();
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapMoved', lat: c.lat(), lng: c.lng() }));
  });

  // 지도/핀이 다 준비된 뒤에 RN에 알려준다 — 그 전에 flyToPool을 호출하면 아무 일도
  // 안 일어나는데(함수는 있어도 마커가 아직 안 올라와 있을 수 있음), RN 쪽에서 이 신호를
  // 받을 때까지 기다렸다가 선택 이동을 보내게 하기 위함.
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
</script>
</body>
</html>`;
}

export default function PoolMapView({
  pools,
  fill,
  selectedId,
  selectToken,
  onSelectPool,
  userLocation,
  focus,
  onMapMoved,
}: Props) {
  const webviewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const points = useMemo(
    () =>
      pools
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({ id: p.id, name: p.name, addr: p.roadAddress, lat: p.lat as number, lng: p.lng as number })),
    [pools]
  );
  const html = useMemo(() => mapHtml(points, userLocation, focus), [points, userLocation, focus]);
  // 지도가 새로 로드될 때의 selectToken. 이 값에서 안 바뀌었으면 사용자가 아직 카드/핀을 안 눌렀다는 뜻이다.
  const tokenAtLoad = useRef(selectToken);

  // html이 바뀌면(검색 결과가 바뀌어 지도가 통째로 다시 로드되면) WebView 안의 지도도
  // 처음부터 다시 만들어지므로, 새로 "mapReady" 신호가 올 때까지 다시 기다려야 한다.
  useEffect(() => {
    setMapReady(false);
    tokenAtLoad.current = selectToken;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  useEffect(() => {
    // 지도/마커가 아직 준비되기 전에 flyToPool을 호출하면 조용히 아무 일도 안 일어난다
    // (특히 처음 지도가 뜰 때 바로 카드를 누르는 경우) — mapReady가 될 때까지 기다렸다가
    // 보낸다. mapReady가 그 사이에 true로 바뀌면 이 effect가 다시 돌면서 바로 전송된다.
    if (!selectedId || !mapReady) return;
    // 동네를 검색한 직후엔 입력한 동네 위치를 그대로 보여주고, 카드나 핀을 눌렀을 때만 이동한다.
    if (focus && selectToken === tokenAtLoad.current) return;
    webviewRef.current?.injectJavaScript(
      `window.flyToPool && window.flyToPool(${JSON.stringify(selectedId)}); true;`
    );
    // selectToken은 일부러 의존성에 넣는다 — 이미 선택돼 있던 카드를 다시 눌러서
    // selectedId 값 자체는 안 바뀌어도, 지도가 다시 그쪽으로 이동해야 하기 때문.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectToken, mapReady]);

  function handleMessage(event: WebViewMessageEvent) {
    let msg: { type: string; id?: string; lat?: number; lng?: number };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'mapReady') {
      setMapReady(true);
      return;
    }
    if (msg.type === 'mapMoved' && msg.lat != null && msg.lng != null) {
      onMapMoved?.({ lat: msg.lat, lng: msg.lng });
      return;
    }
    const pool = pools.find((p) => p.id === msg.id);
    if (!pool) return;
    if (msg.type === 'markerTap') {
      onSelectPool?.(pool.id);
    } else if (msg.type === 'openMap') {
      const link = mapLinkFor(pool);
      if (link) Linking.openURL(link);
    }
  }

  if ((points.length === 0 && !focus) || !isNaverMapConfigured) return null;

  // 웹(Expo Web)에선 react-native-webview가 제대로 안 뜬다 — 실제 iOS 앱에서만 지원.
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, fill ? styles.fill : styles.card, styles.webFallback]}>
        <Text style={styles.webFallbackText}>지도는 iOS 앱에서 볼 수 있어요.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, fill ? styles.fill : styles.card]}>
      <WebView
        ref={webviewRef}
        source={{ html, baseUrl: NAVER_BASE_URL }}
        style={styles.webview}
        onMessage={handleMessage}
        originWhitelist={['*']}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: colors.card },
  fill: { flex: 1 },
  card: { height: 220, borderRadius: radius.md, marginBottom: spacing.xs },
  webview: { flex: 1 },
  webFallback: { alignItems: 'center', justifyContent: 'center' },
  webFallbackText: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12 },
});
