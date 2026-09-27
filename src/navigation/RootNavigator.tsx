import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CalendarScreen from '../screens/CalendarScreen';
import RecordFormScreen from '../screens/RecordFormScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import StatDetailScreen from '../screens/StatDetailScreen';
import ShopScreen from '../screens/ShopScreen';
import TeachingScreen from '../screens/TeachingScreen';
import TipRoomScreen from '../screens/TipRoomScreen';
import AuthScreen from '../screens/AuthScreen';
import FriendsScreen from '../screens/social/FriendsScreen';
import GroupsScreen from '../screens/social/GroupsScreen';
import ChatRoomScreen from '../screens/social/ChatRoomScreen';
import {
  CalendarIcon,
  FriendsIcon,
  GroupsIcon,
  ShopIcon,
  TeachingIcon,
  TipRoomIcon,
} from '../components/icons/TabIcons';
import { colors, fonts } from '../theme';
import { CalendarStackParamList, RootTabParamList } from './types';
import { FriendsStackParamList, GroupsStackParamList } from './socialTypes';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { getCurrentUser, UserProfile } from '../storage/auth';

const Tab = createBottomTabNavigator<RootTabParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
const FriendsStack = createNativeStackNavigator<FriendsStackParamList>();
const GroupsStack = createNativeStackNavigator<GroupsStackParamList>();

const TAB_ICON: Record<keyof RootTabParamList, React.ComponentType<{ color: string; size?: number }>> = {
  Calendar: CalendarIcon,
  Friends: FriendsIcon,
  Groups: GroupsIcon,
  Teaching: TeachingIcon,
  TipRoom: TipRoomIcon,
  Shop: ShopIcon,
};

const TAB_LABEL: Record<keyof RootTabParamList, string> = {
  Calendar: '캘린더',
  Friends: '수친',
  Groups: '수톡',
  Teaching: '티칭',
  TipRoom: '팁방',
  Shop: '샵',
};

const linking: LinkingOptions<any> = {
  prefixes: ['doongsil://'],
  config: {
    screens: {
      Groups: {
        screens: {
          GroupsHome: 'invite/:code',
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
        options={{ headerShown: true, title: '오늘 수영 기록' }}
      />
      <CalendarStack.Screen
        name="RecordDetail"
        component={RecordDetailScreen}
        options={{ headerShown: true, title: '기록 상세' }}
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
    </FriendsStack.Navigator>
  );
}

function GroupsStackNavigator() {
  return (
    <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupsStack.Screen name="GroupsHome" component={GroupsScreen} />
      <GroupsStack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{ headerShown: true, title: '' }}
      />
    </GroupsStack.Navigator>
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
        tabBarIcon: ({ color }) => {
          const Icon = TAB_ICON[route.name as keyof RootTabParamList];
          return <Icon color={color} size={22} />;
        },
        tabBarLabel: TAB_LABEL[route.name as keyof RootTabParamList],
      })}
    >
      <Tab.Screen name="Calendar" component={CalendarStackNavigator} />
      {FEATURE_FLAGS.friendsAndChat && (
        <>
          <Tab.Screen name="Friends" component={FriendsStackNavigator} />
          <Tab.Screen name="Groups" component={GroupsStackNavigator} />
        </>
      )}
      <Tab.Screen name="Teaching" component={TeachingScreen} />
      <Tab.Screen name="TipRoom" component={TipRoomScreen} />
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
    <NavigationContainer linking={linking}>
      {user ? <AppTabs /> : <AuthScreen onAuthenticated={setUser} />}
    </NavigationContainer>
  );
}
