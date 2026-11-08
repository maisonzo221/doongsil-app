// 사용 통계 · 오류 수집 (PostHog). 무엇이 많이 쓰이고 어디서 앱이 멈추는지 알아서 고치기 위한 것이다.
//
// 원칙: 이름·전화번호·메시지·글 내용·위치·건강 데이터는 절대 보내지 않는다. 계정과도 연결하지 않고(익명),
// 기기마다 무작위로 만든 번호로만 센다. IP로 지역을 추정하는 것도 끈다. 설정에서 이용자가 끌 수 있다.
// EXPO_PUBLIC_POSTHOG_API_KEY가 없으면 아무 일도 하지 않는다(다른 서비스 연동과 같은 방식).
import PostHog from 'posthog-react-native';
import AsyncStorage from 'expo-sqlite/kv-store';

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
const OPT_OUT_KEY = '@doongsil/analytics/optOut';

export const isAnalyticsConfigured = !!API_KEY;

/** 보내는 이벤트 이름은 여기에 정해 둔 것만 쓴다(오타로 같은 이벤트가 둘로 갈라지는 것을 막는다). */
export type AnalyticsEvent =
  | 'sign_in'
  | 'guest_start'
  | 'record_added'
  | 'mission_completed'
  | 'post_created'
  | 'comment_added'
  | 'message_sent'
  | 'friend_added'
  | 'report_submitted'
  | 'user_blocked'
  | 'teaching_video_opened';

export type AnalyticsProps = Record<string, string | number | boolean | null>;

let client: PostHog | null = null;

export function initAnalytics(): void {
  if (client || !API_KEY) return;
  try {
    client = new PostHog(API_KEY, {
      host: HOST,
      customStorage: AsyncStorage as any,
      disableGeoip: true,
      preloadFeatureFlags: false,
      captureAppLifecycleEvents: true,
      enableSessionReplay: false,
      errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true } },
    });
    Promise.resolve(AsyncStorage.getItem(OPT_OUT_KEY))
      .then((v) => {
        if (v === '1') client?.optOut();
      })
      .catch(() => {});
  } catch {
    client = null;
  }
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  try {
    client?.capture(event, props);
  } catch {
    // 통계가 앱을 멈추게 하면 안 된다.
  }
}

export function trackScreen(name: string): void {
  try {
    client?.screen(name);
  } catch {
    // 위와 같다.
  }
}

export async function isAnalyticsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(OPT_OUT_KEY)) !== '1';
  } catch {
    return true;
  }
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(OPT_OUT_KEY, enabled ? '0' : '1');
    if (enabled) client?.optIn();
    else client?.optOut();
  } catch {
    // 저장에 실패해도 앱은 계속 쓸 수 있다.
  }
}
