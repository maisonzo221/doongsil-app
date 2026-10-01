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

// CARTO/Mapbox/구글맵의 깔끔한 타일은 대부분 API 키(+유료 플랜)가 필요하다 —
// 실제로 CARTO 무료 타일은 이제 키 없이는 막혀 있다(워터마크로 확인됨).
// OpenFreeMap(openfreemap.org)은 벡터 타일을 키/가입 없이 무기한 무료로 제공하는
// 서비스라, MapLibre GL로 그리면 네이버지도/T맵처럼 도로·건물이 벡터로 또렷하게
// 그려지는 지도를 만들 수 있다. 마커도 Leaflet 기본 파란 핀 대신 브랜드 색
// (emerald) 원형 점으로 그려서 앱 톤에 맞췄다.
function mapHtml(points: { id: string; name: string; addr: string; lat: number; lng: number }[]): string {
  const center = points.length ? [points[0].lng, points[0].lat] : [126.978, 37.5665];
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<style>
  html,body,#map{margin:0;padding:0;height:100%;background:${colors.background};}
  .maplibregl-ctrl-attrib{font-size:9px;}
  .pin-dot{width:18px;height:18px;border-radius:50%;background:#0EA894;border:2px solid #ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.3);}
  .pin-dot.selected{width:24px;height:24px;background:#0A3358;box-shadow:0 2px 6px rgba(0,0,0,0.4);}
  .pin-popup{font-family:-apple-system,sans-serif;}
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
  const dotsById = {};
  let selectedEl = null;

  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [${center[0]}, ${center[1]}],
    zoom: ${points.length > 1 ? 11 : 14}
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

  const bounds = new maplibregl.LngLatBounds();
  points.forEach(function (p) {
    const el = document.createElement('div');
    el.className = 'pin-dot';

    const popup = new maplibregl.Popup({ offset: 14 }).setHTML(
      '<div class="pin-popup"><b>' + p.name + '</b>' +
      '<div class="addr">' + p.addr + '</div>' +
      '<a href="#" data-id="' + p.id + '">길찾기 열기</a></div>'
    );
    popup.on('open', function () {
      document.querySelectorAll('.pin-popup a[data-id="' + p.id + '"]').forEach(function (a) {
        a.onclick = function (e) {
          e.preventDefault();
          window.ReactNativeWebView.postMessage(p.id);
        };
      });
    });

    const marker = new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
    markersById[p.id] = marker;
    dotsById[p.id] = el;
    bounds.extend([p.lng, p.lat]);
  });
  if (points.length > 1) {
    map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
  }

  // RN 쪽에서 injectJavaScript로 호출한다 (하단 카드 탭 -> 지도 이동 + 팝업).
  window.flyToPool = function (id) {
    const marker = markersById[id];
    if (!marker) return;
    if (selectedEl) selectedEl.classList.remove('selected');
    const el = dotsById[id];
    if (el) {
      el.classList.add('selected');
      selectedEl = el;
    }
    map.flyTo({ center: marker.getLngLat(), zoom: 15 });
    marker.togglePopup();
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

  if (points.length === 0) return null;

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
        source={{ html }}
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
