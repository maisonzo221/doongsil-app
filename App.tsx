import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Jua_400Regular } from '@expo-google-fonts/jua';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import LandingScreen from './src/screens/LandingScreen';
import { colors } from './src/theme';
import { initAnalytics } from './src/services/analytics';
import { refreshRemotePools } from './src/services/remotePools';

SplashScreen.preventAutoHideAsync().catch(() => {});
initAnalytics();

export default function App() {
  const [fontsLoaded] = useFonts({
    Jua_400Regular,
    'Pretendard-Light': require('./assets/fonts/Pretendard-Light.otf'),
    'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.otf'),
  });

  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // 매달 자동 갱신되는 수영장 목록이 새로 올라왔는지 확인한다(하루 1번, 실패해도 앱에는 영향 없음).
  useEffect(() => {
    const t = setTimeout(() => {
      refreshRemotePools().catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {showLanding ? (
        <LandingScreen onFinish={() => setShowLanding(false)} />
      ) : (
        <RootNavigator />
      )}
      <StatusBar style={showLanding ? 'light' : 'dark'} />
    </GestureHandlerRootView>
  );
}
