import React, { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface Props extends PropsWithChildren {
  gradient?: readonly [string, string];
}

export default function ScreenBackground({ children, gradient }: Props) {
  return (
    <LinearGradient colors={gradient ?? colors.backgroundGradient} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
