import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NotingScreen from '../screens/NotingScreen';
import CalendarScreen from '../screens/CalendarScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import ShopScreen from '../screens/ShopScreen';
import AuthScreen from '../screens/AuthScreen';
import FriendsScreen from '../screens/social/FriendsScreen';
import GroupsScreen from '../screens/social/GroupsScreen';
import ChatRoomScreen from '../screens/social/ChatRoomScreen';
import { colors, fonts } from '../theme';
import { CalendarStackParamList, RootTabParamList } from './types';
import { FriendsStackParamList, GroupsStackParamList } from './socialTypes';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { getCurrentUser, UserProfile } from '../storage/auth';

const Tab = createBottomTabNavigator<RootTabParamList>();
const CalendarStack = createNativeStackNavigator<CalendarStackParamList>();
const FriendsStack = createNativeStackNavigator<FriendsStackParamList>();
const GroupsStack = createNativeStackNavigator<GroupsStackParamList>();

const TAB_ICON: Record<keyof RootTabParamList, string> = {
  Noting: '\u{1F4DD}',
  Calendar: '\u{1F4C5}',
  Friends: '\u{1F465}',
  Groups: '\u{1F4AC}',
  Shop: '\u{1F6CD}\u{FE0F}',
};

const TAB_LABEL: Record<keyof RootTabParamList, string> = {
  Noting: '노팅',
  Calendar: '캘린더',
  Friends: '친구',
  Groups: '수모임',
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
        name="RecordDetail"
        component={RecordDetailScreen}
        options={{ headerShown: true, title: '기록 상세' }}
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
        tabBarIcon: () => (
          <Text style={{ fontSize: 20 }}>
            {TAB_ICON[route.name as keyof RootTabParamList]}
          </Text>
        ),
        tabBarLabel: TAB_LABEL[route.name as keyof RootTabParamList],
      })}
    >
      <Tab.Screen name="Noting" component={NotingScreen} />
      <Tab.Screen name="Calendar" component={CalendarStackNavigator} />
      {FEATURE_FLAGS.friendsAndChat && (
        <>
          <Tab.Screen name="Friends" component={FriendsStackNavigator} />
          <Tab.Screen name="Groups" component={GroupsStackNavigator} />
        </>
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
    <NavigationContainer linking={linking}>
      {user ? <AppTabs /> : <AuthScreen onAuthenticated={setUser} />}
    </NavigationContainer>
  );
}
