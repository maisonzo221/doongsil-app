import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NotingScreen from '../screens/NotingScreen';
import CalendarScreen from '../screens/CalendarScreen';
import DiaryScreen from '../screens/DiaryScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import ShopScreen from '../screens/ShopScreen';
import AuthScreen from '../screens/AuthScreen';
import SwimFriendsScreen from '../screens/social/SwimFriendsScreen';
import ChatRoomScreen from '../screens/social/ChatRoomScreen';
import { colors, fonts } from '../theme';
import { DiaryStackParamList, RootTabParamList } from './types';
import { SocialStackParamList } from './socialTypes';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { getCurrentUser, UserProfile } from '../storage/auth';

const Tab = createBottomTabNavigator<RootTabParamList>();
const DiaryStack = createNativeStackNavigator<DiaryStackParamList>();
const SocialStack = createNativeStackNavigator<SocialStackParamList>();

const TAB_ICON: Record<keyof RootTabParamList, string> = {
  Noting: '\u{1F4DD}',
  Calendar: '\u{1F4C5}',
  Diary: '\u{1F4D6}',
  SwimFriends: '\u{1F465}',
  Shop: '\u{1F6CD}\u{FE0F}',
};

const TAB_LABEL: Record<keyof RootTabParamList, string> = {
  Noting: '노팅',
  Calendar: '캘린더',
  Diary: '다이어리',
  SwimFriends: '수친',
  Shop: '샵',
};

function DiaryStackNavigator() {
  return (
    <DiaryStack.Navigator screenOptions={{ headerShown: false }}>
      <DiaryStack.Screen name="DiaryList" component={DiaryScreen} />
      <DiaryStack.Screen
        name="RecordDetail"
        component={RecordDetailScreen}
        options={{ headerShown: true, title: '기록 상세' }}
      />
    </DiaryStack.Navigator>
  );
}

function SocialStackNavigator() {
  return (
    <SocialStack.Navigator screenOptions={{ headerShown: false }}>
      <SocialStack.Screen name="SwimFriendsHome" component={SwimFriendsScreen} />
      <SocialStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{ headerShown: true, title: '' }}
      />
    </SocialStack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.disabledText,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarIcon: () => (
          <Text style={{ fontSize: 20 }}>
            {TAB_ICON[route.name as keyof RootTabParamList]}
          </Text>
        ),
        tabBarLabel: TAB_LABEL[route.name as keyof RootTabParamList],
      })}
    >
      <Tab.Screen name="Noting" component={NotingScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Diary" component={DiaryStackNavigator} />
      {FEATURE_FLAGS.friendsAndChat && (
        <Tab.Screen name="SwimFriends" component={SocialStackNavigator} />
      )}
      <Tab.Screen name="Shop" component={ShopScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [user, setUser] = useState<UserProfile | null | 'loading'>('loading');

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  if (user === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <NavigationContainer>
      {user ? <AppTabs /> : <AuthScreen onAuthenticated={setUser} />}
    </NavigationContainer>
  );
}
