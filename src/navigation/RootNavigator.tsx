import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import AuthScreen from '../screens/AuthScreen';
import FriendsScreen from '../screens/social/FriendsScreen';
import ChatRoomScreen from '../screens/social/ChatRoomScreen';
import SettingsScreen from '../screens/social/SettingsScreen';
import { CalendarIcon, FriendsIcon, ShopIcon, TeachingIcon, TipRoomIcon } from '../components/icons/TabIcons';
import { colors } from '../theme';
import { CalendarStackParamList, RootTabParamList } from './types';
import { FriendsStackParamList } from './socialTypes';
import { TipRoomStackParamList } from './tipRoomTypes';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { getCurrentUser, onAuthChange, UserProfile } from '../storage/auth';

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

// 가운데(가이드) 탭은 아이콘만 더 크고 떠 있는 느낌으로 특별 취급한다.
const CENTER_TAB: keyof RootTabParamList = 'TipRoom';

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
    </TipRoomStack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.disabledText,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 64 },
        tabBarIcon: ({ color }) => {
          const Icon = TAB_ICON[route.name as keyof RootTabParamList];
          const isCenter = route.name === CENTER_TAB;
          if (isCenter) {
            return (
              <View style={styles.centerIconWrap}>
                <Icon color={colors.white} size={28} />
              </View>
            );
          }
          return <Icon color={color} size={28} />;
        },
      })}
    >
      {FEATURE_FLAGS.friendsAndChat && <Tab.Screen name="Friends" component={FriendsStackNavigator} />}
      <Tab.Screen name="Calendar" component={CalendarStackNavigator} />
      <Tab.Screen name="TipRoom" component={TipRoomStackNavigator} />
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

  if (user === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <NavigationContainer linking={linking}>
      {user ? <AppTabs /> : <AuthScreen onAuthenticated={setUser} />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centerIconWrap: {
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
});
