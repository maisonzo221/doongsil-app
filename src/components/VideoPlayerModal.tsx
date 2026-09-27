import React from 'react';
import { Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, fonts, spacing } from '../theme';
import { youtubeWatchUrl } from '../services/youtube';

interface Props {
  videoId: string | null;
  onClose: () => void;
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
          source={{ uri: `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1` }}
          style={styles.webview}
          allowsFullscreenVideo
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
