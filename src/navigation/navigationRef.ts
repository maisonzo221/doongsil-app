// 알림을 탭했을 때 네비게이션 컴포넌트 트리 바깥(알림 리스너)에서 특정 화면으로
// 이동시켜야 해서, NavigationContainer에 연결해두는 전역 ref.
import { createNavigationContainerRef } from '@react-navigation/native';
import { RoomKind } from './socialTypes';

export const navigationRef = createNavigationContainerRef<any>();

export function navigateToChatRoom(params: {
  groupId: string;
  groupName: string;
  ownerId: string;
  roomKind: RoomKind;
}) {
  if (!navigationRef.isReady()) return;
  // 중첩된 탭 > 스택 네비게이션으로 ref를 통해 이동할 땐 타입이 너무 엄격해서
  // (never로 좁혀짐) 실질적으로 표현이 불가능하다 — 여기서만 any로 우회한다.
  (navigationRef as any).navigate('Friends', { screen: 'ChatRoom', params });
}
