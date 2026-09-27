// 최소한의 비속어 목록 — 서버(check_message_profanity 트리거)와 같은 목록을 쓴다.
// 클라이언트 검사는 즉각적인 피드백용이고, 실제 차단은 서버 트리거가 최종적으로 담당한다.
const PROFANITY_PATTERN = /(씨발|시발|개새끼|병신|지랄|좆|fuck|shit|bitch)/i;

export function containsProfanity(text: string): boolean {
  return PROFANITY_PATTERN.test(text);
}
