import React, { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface Props extends PropsWithChildren {
  gradient?: readonly [string, string];
  /** 안전 영역을 피할 가장자리. 위에 네이티브 헤더가 이미 있는 화면은 'top'을 빼야 위쪽이 두 번 비지 않는다. */
  edges?: readonly Edge[];
}

export default function ScreenBackground({ children, gradient, edges }: Props) {
  return (
    <LinearGradient colors={gradient ?? colors.backgroundGradient} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={edges ?? ['top', 'left', 'right']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
