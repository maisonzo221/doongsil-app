import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { TAB_HILL_H } from '../components/WaterTabBar';

/**
 * 하단 메뉴바의 가운데 언덕은 메뉴바 위로 튀어나와 있어서, 화면 맨 아래에 입력창이 있으면 입력창을 가린다.
 * 키보드가 내려가 있을 때만 언덕 높이만큼 입력창을 띄우는 값(marginBottom)을 돌려준다.
 * 키보드가 올라오면 메뉴바는 키보드 밑에 있으니 띄울 필요가 없다.
 */
export function useTabBarClearance(): number {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return keyboardOpen ? 0 : TAB_HILL_H;
}
