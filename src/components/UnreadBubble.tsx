import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';

/** 수톡 목록의 안 읽은 메시지 수: 하늘색 물방울 속에 숫자. 99개가 넘으면 99+로 줄인다. */
export default function UnreadBubble({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  const wide = label.length > 1;
  return (
    <View style={[styles.wrap, wide && styles.wrapWide]} accessibilityLabel={`안 읽은 메시지 ${label}개`}>
      <LinearGradient colors={['#9BE3F7', '#3FB6E3']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.shine} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: colors.shadow,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  wrapWide: { paddingHorizontal: 6 },
  // 물방울 왼쪽 위의 반사광
  shine: { position: 'absolute', top: 3, left: 5, width: 7, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.75)', transform: [{ rotate: '-20deg' }] },
  text: { fontFamily: fonts.bold, color: colors.white, fontSize: 12, textShadowColor: 'rgba(11,42,74,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
});
