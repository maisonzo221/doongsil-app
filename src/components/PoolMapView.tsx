import React, { useMemo } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { colors, fonts, radius, spacing } from '../theme';
import { mapLinkFor, OfficialPool } from '../services/poolData';

interface Props {
  pools: OfficialPool[];
}

// 카카오맵/구글맵을 화면에 embed하려면 API 키가 필요하지만, CARTO의 Positron
// 타일(OpenStreetMap 데이터 기반)은 키 없이 쓸 수 있고 기본 OSM 타일보다
// 훨씬 깔끔한 미니멀 스타일이라 앱 톤과도 잘 맞는다. 마커도 Leaflet 기본
// 파란 핀 아이콘 대신, 브랜드 색(emerald) 원형 점으로 그려서 더 모던하게 보이게 했다.
function mapHtml(points: { id: string; name: string; addr: string; lat: number; lng: number }[]): string {
  const center = points.length ? [points[0].lat, points[0].lng] : [37.5665, 126.978];
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html,body,#map{margin:0;padding:0;height:100%;background:${colors.background};}
  .leaflet-control-attribution{font-size:9px;}
  .pin-popup{font-family:-apple-system,sans-serif;}
  .pin-popup b{font-size:14px;color:#0A3358;}
  .pin-popup .addr{font-size:12px;color:#5F7A8C;margin-top:2px;}
  .pin-popup a{color:#0EA894;font-weight:600;text-decoration:none;display:block;margin-top:6px;font-size:13px;}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const map = L.map('map', { zoomControl: true, attributionControl: true })
    .setView([${center[0]}, ${center[1]}], ${points.length > 1 ? 12 : 15});
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);

  const points = ${JSON.stringify(points)};
  const markers = [];
  points.forEach((p) => {
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 9,
      fillColor: '#0EA894',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    }).addTo(map);
    marker.bindPopup(
      '<div class="pin-popup"><b>' + p.name + '</b>' +
      '<div class="addr">' + p.addr + '</div>' +
      '<a href="#" data-id="' + p.id + '">길찾기 열기</a></div>'
    );
    marker.on('popupopen', function () {
      const links = document.querySelectorAll('.pin-popup a[data-id="' + p.id + '"]');
      links.forEach(function (a) {
        a.onclick = function (e) {
          e.preventDefault();
          window.ReactNativeWebView.postMessage(p.id);
        };
      });
    });
    markers.push(marker);
  });
  if (markers.length > 1) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.25));
  }
</script>
</body>
</html>`;
}

export default function PoolMapView({ pools }: Props) {
  const points = useMemo(
    () =>
      pools
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({ id: p.id, name: p.name, addr: p.roadAddress, lat: p.lat as number, lng: p.lng as number })),
    [pools]
  );
  const html = useMemo(() => mapHtml(points), [points]);

  function handleMessage(event: WebViewMessageEvent) {
    const pool = pools.find((p) => p.id === event.nativeEvent.data);
    const link = pool ? mapLinkFor(pool) : undefined;
    if (link) Linking.openURL(link);
  }

  if (points.length === 0) return null;

  // 웹(Expo Web)에선 react-native-webview가 제대로 안 뜬다 — 실제 iOS 앱에서만 지원.
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, styles.webFallback]}>
        <Text style={styles.webFallbackText}>지도는 iOS 앱에서 볼 수 있어요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
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
  container: {
    height: 220,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
    backgroundColor: colors.card,
  },
  webview: { flex: 1 },
  webFallback: { alignItems: 'center', justifyContent: 'center' },
  webFallbackText: { fontFamily: fonts.regular, color: colors.textMuted, fontSize: 12 },
});
