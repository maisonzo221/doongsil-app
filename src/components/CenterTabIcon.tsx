import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface Props {
  Icon: React.ComponentType<{ color: string; size?: number }>;
  /** 관심 수영장의 모집 알림 기간이면 true — 빨간색으로 천천히 깜빡인다. */
  alerting: boolean;
}

export default function CenterTabIcon({ Icon, alerting }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!alerting) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [alerting, pulse]);

  return (
    <Animated.View
      accessibilityLabel={alerting ? '관심 수영장 모집 알림' : undefined}
      style={[styles.wrap, alerting && styles.wrapAlert, alerting && { opacity: pulse }]}
    >
      <Icon color={colors.white} size={28} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: colors.primaryPressed,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  wrapAlert: {
    backgroundColor: colors.alert,
    shadowColor: colors.alert,
    shadowOpacity: 0.7,
  },
});
