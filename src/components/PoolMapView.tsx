import React, { useEffect, useMemo, useRef } from 'react';
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
function mapHtml(points: { id: string; name: string; addr: string; lat: number; lng: number }[]): string {
  const center = points.length ? points[0] : { lat: 37.5665, lng: 126.978 };
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_CLIENT_ID}"></script>
<style>
  html,body,#map{margin:0;padding:0;height:100%;background:${colors.background};}
  .pin-popup{font-family:-apple-system,sans-serif;padding:4px 2px;}
  .pin-popup b{font-size:14px;color:#0A3358;}
  .pin-popup .addr{font-size:12px;color:#5F7A8C;margin-top:2px;}
  .pin-popup a{color:#0EA894;font-weight:600;text-decoration:none;display:block;margin-top:6px;font-size:13px;}
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
    zoom: ${points.length > 1 ? 11 : 15}
  });

  const bounds = new naver.maps.LatLngBounds();
  points.forEach(function (p) {
    const position = new naver.maps.LatLng(p.lat, p.lng);
    // 📍 모양(물방울 핀)이랑 통일 — 지도 핀도 같은 실루엣의 SVG 핀으로 그린다.
    const pinSvg =
      '<svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M14 0C6.3 0 0 6.5 0 14.5 0 25 14 36 14 36s14-11 14-21.5C28 6.5 21.7 0 14 0z" fill="#0EA894" stroke="#ffffff" stroke-width="2"/>' +
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
      borderWidth: 0,
      backgroundColor: 'transparent'
    });
    naver.maps.Event.addListener(marker, 'click', function () {
      openPopup(p.id);
    });
    markersById[p.id] = marker;
    infoWindowsById[p.id] = infoWindow;
    bounds.extend(position);
  });
  if (points.length > 1) {
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
          window.ReactNativeWebView.postMessage(id);
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
</script>
</body>
</html>`;
}

export default function PoolMapView({ pools, fill, selectedId }: Props) {
  const webviewRef = useRef<WebView>(null);
  const points = useMemo(
    () =>
      pools
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({ id: p.id, name: p.name, addr: p.roadAddress, lat: p.lat as number, lng: p.lng as number })),
    [pools]
  );
  const html = useMemo(() => mapHtml(points), [points]);

  useEffect(() => {
    if (!selectedId) return;
    webviewRef.current?.injectJavaScript(
      `window.flyToPool && window.flyToPool(${JSON.stringify(selectedId)}); true;`
    );
  }, [selectedId]);

  function handleMessage(event: WebViewMessageEvent) {
    const pool = pools.find((p) => p.id === event.nativeEvent.data);
    const link = pool ? mapLinkFor(pool) : undefined;
    if (link) Linking.openURL(link);
  }

  if (points.length === 0 || !isNaverMapConfigured) return null;

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
