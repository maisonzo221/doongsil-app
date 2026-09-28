import React from 'react';
import { Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { colors, fonts, spacing } from '../theme';
import { mapLinkFor, OfficialPool } from '../services/poolData';

interface Props {
  visible: boolean;
  pools: OfficialPool[];
  onClose: () => void;
}

// 카카오맵/구글맵은 지도를 화면에 띄우려면(embed) API 키가 필요하지만,
// OpenStreetMap + Leaflet는 키 없이 쓸 수 있어서 검색 결과 전체를 한 번에
// 핀으로 보여주는 용도로는 이걸로 충분하다. 핀 클릭 -> 카카오맵으로 길찾기는
// 기존 mapLinkFor()를 그대로 재사용한다(그쪽은 실제 길찾기라 카카오맵이 더 정확함).
function mapHtml(points: { id: string; name: string; addr: string; lat: number; lng: number }[]): string {
  const center = points.length ? [points[0].lat, points[0].lng] : [37.5665, 126.978];
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html,body,#map{margin:0;padding:0;height:100%;}
  .pin-popup{font-family:-apple-system,sans-serif;}
  .pin-popup b{font-size:14px;}
  .pin-popup .addr{font-size:12px;color:#5F7A8C;margin-top:2px;}
  .pin-popup a{color:#0EA894;font-weight:600;text-decoration:none;display:block;margin-top:6px;font-size:13px;}
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const map = L.map('map').setView([${center[0]}, ${center[1]}], ${points.length > 1 ? 12 : 15});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  const points = ${JSON.stringify(points)};
  const markers = [];
  points.forEach((p) => {
    const marker = L.marker([p.lat, p.lng]).addTo(map);
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
    map.fitBounds(group.getBounds().pad(0.2));
  }
</script>
</body>
</html>`;
}

export default function PoolMapModal({ visible, pools, onClose }: Props) {
  const points = pools
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({ id: p.id, name: p.name, addr: p.roadAddress, lat: p.lat as number, lng: p.lng as number }));

  function handleMessage(event: WebViewMessageEvent) {
    const pool = pools.find((p) => p.id === event.nativeEvent.data);
    const link = pool ? mapLinkFor(pool) : undefined;
    if (link) Linking.openURL(link);
  }

  // 웹(Expo Web)에선 react-native-webview가 제대로 안 뜬다 — 실제 iOS 앱에서만 지원.
  if (Platform.OS === 'web') return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>{'‹ 닫기'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>지도로 보기</Text>
          <View style={styles.headerSpacer} />
        </View>
        {points.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>위치 정보가 있는 검색 결과가 없어요.</Text>
          </View>
        ) : (
          <WebView
            source={{ html: mapHtml(points) }}
            style={styles.webview}
            onMessage={handleMessage}
            originWhitelist={['*']}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  close: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 15 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 16 },
  headerSpacer: { width: 44 },
  webview: { flex: 1 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
