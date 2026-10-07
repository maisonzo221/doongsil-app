// 한국어/영어/일본어 비속어 목록 — 서버(contains_profanity, migration_007)와 같은
// 목록을 쓴다. 클라이언트 검사는 즉각적인 피드백용이고, 실제 차단은 서버 트리거가
// 최종적으로 담당한다(둘 중 하나만 우회해도 서버에서 막힌다).
const PROFANITY_PATTERN =
  /(씨발|시발|씨팔|개새끼|개새|병신|지랄|좆|존나|느금마|니미|닥쳐|꺼져|죽어|염병|fuck|shit|bitch|asshole|bastard|cunt|dick|whore|slut|くそ|クソ|死ね|しね|きちがい|キチガイ|ばか|バカ|ちくしょう|馬鹿野郎)/i;

export function containsProfanity(text: string): boolean {
  return PROFANITY_PATTERN.test(text);
}
