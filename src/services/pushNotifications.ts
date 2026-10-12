// 수톡/톡톡 메시지 푸시 알림 (카카오톡처럼 앱이 꺼져있어도 알림 오게 하는 기능).
// 실제 발송은 서버(Postgres 트리거, migration_010 참고)에서 Expo 푸시 서버로 보내고,
// 여기서는 1) 이 기기의 푸시 토큰을 받아서 서버에 등록하고, 2) 알림을 탭했을 때
// 어떻게 반응할지(포그라운드 표시 방식)만 설정한다.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** 알림 권한을 요청하고 이 기기의 Expo 푸시 토큰을 받아온다.
 * 시뮬레이터에선 푸시 토큰 자체가 발급되지 않아서 null을 돌려준다. */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    return null;
  }
}
