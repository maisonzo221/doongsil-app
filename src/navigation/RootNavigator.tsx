import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NotingScreen from '../screens/NotingScreen';
import CalendarScreen from '../screens/CalendarScreen';
import DiaryScreen from '../screens/DiaryScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import ShopScreen from '../screens/ShopScreen';
import { colors } from '../theme';
import { DiaryStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const DiaryStack = createNativeStackNavigator<DiaryStackParamList>();

const TAB_ICON: Record<keyof RootTabParamList, string> = {
  Noting: '\u{1F4DD}',
  Calendar: '\u{1F4C5}',
  Diary: '\u{1F4D6}',
  Shop: '\u{1F6CD}\u{FE0F}',
};

const TAB_LABEL: Record<keyof RootTabParamList, string> = {
  Noting: '노팅',
  Calendar: '캘린더',
  Diary: '다이어리',
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

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
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
        <Tab.Screen name="Shop" component={ShopScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
