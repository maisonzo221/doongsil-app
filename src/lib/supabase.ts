import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from 'expo-sqlite/kv-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았어요. ' +
      '.env.example을 참고해서 .env 파일을 만들어주세요. 수친/수모임 기능이 동작하지 않습니다.'
  );
}

export const isSupabaseConfigured = !!url && !!anonKey;

// createClient throws synchronously on an empty URL, so fall back to a harmless
// placeholder when unconfigured -- every caller must check isSupabaseConfigured
// first anyway, so this client is never actually used in that case.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage as any,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);
