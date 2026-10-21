import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CalendarScreen from '../screens/CalendarScreen';
import RecordFormScreen from '../screens/RecordFormScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import StatDetailScreen from '../screens/StatDetailScreen';
import ShopScreen from '../screens/ShopScreen';
import TeachingScreen from '../screens/TeachingScreen';
import TipRoomHomeScreen from '../screens/tiproom/TipRoomHomeScreen';
import PostDetailScreen from '../screens/tiproom/PostDetailScreen';
import UserProfileScreen from '../screens/tiproom/UserProfileScreen';
import AuthScreen from '../screens/AuthScreen';
import FriendsScreen from '../screens/social/FriendsScreen';
import ChatRoomScreen from '../screens/social/ChatRoomScreen';
import SettingsScreen from '../screens/social/SettingsScreen';
import BearCustomizeScreen from '../screens/BearCustomizeScreen';
import { CalendarIcon, FriendsIcon, ShopIcon, TeachingIcon, TipRoomIcon } from '../components/icons/TabIcons';
import WaterTabBar from '../components/WaterTabBar';
import { colors } from '../theme';
import { CalendarStackParamList, RootTabParamList } from './types';
import { FriendsStackParamList } from './socialTypes';
import { TipRoomStackParamList } from './tipRoomTypes';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { getCurrentUser, onAuthChange, updatePushToken, UserProfile } from '../storage/auth';
import { registerForPushNotificationsAsync } from '../services/pushNotifications';
import { useEnrollmentAlerts, useEnrollmentNotificationSync } from '../services/enrollmentAlerts';
import { getGroupById } from '../storage/social';
import { navigateToChatRoom, navigationRef } from './navigationRef';

const Tab = createBottomTabNavigator<RootTabParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
const FriendsStack = createNativeStackNavigator<FriendsStackParamList>();
const TipRoomStack = createNativeStackNavigator<TipRoomStackParamList>();

const TAB_ICON: Record<keyof RootTabParamList, React.ComponentType<{ color: string; size?: number }>> = {
  Friends: FriendsIcon,
  Calendar: CalendarIcon,
  TipRoom: TipRoomIcon,
  Teaching: TeachingIcon,
  Shop: ShopIcon,
};

const linking: LinkingOptions<any> = {
  prefixes: ['doongsil://'],
  config: {
    screens: {
      Friends: {
        screens: {
          FriendsHome: 'invite/:code',
        },
      },
    },
  },
};

function CalendarStackNavigator() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="CalendarHome" component={CalendarScreen} />
      <CalendarStack.Screen
        name="RecordForm"
        component={RecordFormScreen}
        options={{ headerShown: true, title: '오늘 수영 기록', headerBackButtonDisplayMode: 'minimal' }}
      />
      <CalendarStack.Screen
        name="RecordDetail"
        component={RecordDetailScreen}
        options={{ headerShown: true, title: '기록 상세', headerBackButtonDisplayMode: 'minimal' }}
      />
      <CalendarStack.Screen
        name="BearCustomize"
        component={BearCustomizeScreen}
        options={{ headerShown: true, title: '내 둥실곰 꾸미기', headerBackButtonDisplayMode: 'minimal' }}
      />
      <CalendarStack.Screen
        name="StatDetail"
        component={StatDetailScreen}
        options={{ headerShown: false }}
      />
    </CalendarStack.Navigator>
  );
}

function FriendsStackNavigator() {
  return (
    <FriendsStack.Navigator screenOptions={{ headerShown: false }}>
      <FriendsStack.Screen name="FriendsHome" component={FriendsScreen} />
      <FriendsStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{ headerShown: true, title: '', headerBackButtonDisplayMode: 'minimal' }}
      />
      <FriendsStack.Screen
        name="BearCustomize"
        component={BearCustomizeScreen}
        options={{ headerShown: true, title: '내 둥실곰 꾸미기', headerBackButtonDisplayMode: 'minimal' }}
      />
      <FriendsStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: '', headerBackButtonDisplayMode: 'minimal' }}
      />
    </FriendsStack.Navigator>
  );
}

function TipRoomStackNavigator() {
  return (
    <TipRoomStack.Navigator screenOptions={{ headerShown: false }}>
      <TipRoomStack.Screen name="TipRoomHome" component={TipRoomHomeScreen} />
      <TipRoomStack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ headerShown: true, title: '', headerBackButtonDisplayMode: 'minimal' }}
      />
      <TipRoomStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ headerShown: true, title: '프로필', headerBackButtonDisplayMode: 'minimal' }}
      />
    </TipRoomStack.Navigator>
  );
}

function AppTabs() {
  const enrollmentAlerts = useEnrollmentAlerts();
  const hasEnrollmentAlert = enrollmentAlerts.length > 0;
  useEnrollmentNotificationSync();
  // 순서: 수친 · 가이드(지도) · 캘린더(가운데, 앱을 켜면 처음 보이는 화면) · 티칭 · 샵
  return (
    <Tab.Navigator
      initialRouteName="Calendar"
      tabBar={(props) => <WaterTabBar {...props} icons={TAB_ICON} alertRoute="TipRoom" alerting={hasEnrollmentAlert} />}
      screenOptions={{ headerShown: false }}
    >
      {FEATURE_FLAGS.friendsAndChat && <Tab.Screen name="Friends" component={FriendsStackNavigator} />}
      <Tab.Screen name="TipRoom" component={TipRoomStackNavigator} />
      <Tab.Screen name="Calendar" component={CalendarStackNavigator} />
      <Tab.Screen name="Teaching" component={TeachingScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [user, setUser] = useState<UserProfile | null | 'loading'>('loading');

  useEffect(() => {
    getCurrentUser().then(setUser);
    // 설정 화면의 로그아웃/계정 삭제가 여기까지 직접 닿지 않으니, 상태가 바뀌었다는
    // 알림을 받으면 로그인 여부를 다시 확인해서 AuthScreen으로 돌아가게 한다.
    return onAuthChange(() => {
      getCurrentUser().then(setUser);
    });
  }, []);

  // 로그인된 사용자의 푸시 토큰을 등록하고(수톡/톡톡 메시지 오면 카카오톡처럼 알림
  // 뜨게), 알림을 탭했을 때 해당 수톡방으로 바로 이동시킨다.
  useEffect(() => {
    if (!user || user === 'loading' || user.provider !== 'apple') return;
    registerForPushNotificationsAsync().then((token) => {
      if (token) updatePushToken(token);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data as { groupId?: string } | undefined;
      if (!data?.groupId) return;
      const group = await getGroupById(data.groupId);
      if (!group) return;
      navigateToChatRoom({
        groupId: group.id,
        groupName: group.name,
        ownerId: group.ownerId,
        roomKind: group.roomKind,
      });
    });
    return () => subscription.remove();
  }, [user]);

  if (user === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      {user ? <AppTabs /> : <AuthScreen onAuthenticated={setUser} />}
    </NavigationContainer>
  );
}

