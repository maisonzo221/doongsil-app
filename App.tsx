import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Jua_400Regular } from '@expo-google-fonts/jua';
import {
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import * as SplashScreen from 'expo-splash-screen';
import { View } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import LandingScreen from './src/screens/LandingScreen';
import { colors } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded] = useFonts({
    Jua_400Regular,
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    'SpoqaHanSansNeo-Light': require('./assets/fonts/SpoqaHanSansNeo-Light.ttf'),
    'SpoqaHanSansNeo-Regular': require('./assets/fonts/SpoqaHanSansNeo-Regular.ttf'),
    'SpoqaHanSansNeo-Medium': require('./assets/fonts/SpoqaHanSansNeo-Medium.ttf'),
    'SpoqaHanSansNeo-Bold': require('./assets/fonts/SpoqaHanSansNeo-Bold.ttf'),
  });

  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

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
