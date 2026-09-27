import React from 'react';
import { Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, fonts, spacing } from '../theme';
import { youtubeWatchUrl } from '../services/youtube';

interface Props {
  videoId: string | null;
  onClose: () => void;
}

// 유튜브 embed URL을 WebView의 최상위 문서로 직접 열면 "오류 153"이 뜬다 —
// 유튜브가 부모 페이지 출처(origin)를 확인하는데 WebView 최상위 탐색에는 그게 없어서다.
// 그래서 iframe을 담은 아주 작은 로컬 HTML 문서를 만들어, 그 안에서 iframe으로 불러온다.
function embedHtml(videoId: string): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <style>html,body{margin:0;padding:0;background:#000;height:100%;}iframe{width:100%;height:100%;border:0;}</style>
  </head>
  <body>
    <iframe
      src="https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1"
      frameborder="0"
      allow="autoplay; encrypted-media; fullscreen"
      allowfullscreen
    ></iframe>
  </body>
</html>`;
}

// react-native-webview는 웹(Expo Web)에서는 제대로 동작하지 않아서, 그 경우엔
// 유튜브 앱/브라우저로 바로 여는 것으로 대신한다. 실제 iOS 앱에서는 인앱 재생된다.
export default function VideoPlayerModal({ videoId, onClose }: Props) {
  if (!videoId) return null;

  if (Platform.OS === 'web') {
    Linking.openURL(youtubeWatchUrl(videoId));
    onClose();
    return null;
  }

  return (
    <Modal visible={!!videoId} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>{'‹ 닫기'}</Text>
          </TouchableOpacity>
        </View>
        <WebView
          source={{ html: embedHtml(videoId) }}
          style={styles.webview}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  close: { color: colors.white, fontFamily: fonts.semibold, fontSize: 15 },
  webview: { flex: 1 },
});
