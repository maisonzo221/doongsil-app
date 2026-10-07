// 수력(水歷) — 수영을 시작한 날짜(swim_since)로부터 "수영을 해온 기간"을 계산한다.
// 1년이 꽉 차면 "수력 N년", 아직 1년이 안 됐으면 "수력 N개월"로 표기한다.
export function swimTenureLabel(swimSince: string | null | undefined): string {
  if (!swimSince) return '수력 미설정';
  const since = new Date(swimSince);
  if (Number.isNaN(since.getTime())) return '수력 미설정';
  const now = new Date();

  let years = now.getFullYear() - since.getFullYear();
  const beforeAnniversary =
    now.getMonth() < since.getMonth() ||
    (now.getMonth() === since.getMonth() && now.getDate() < since.getDate());
  if (beforeAnniversary) years -= 1;

  if (years >= 1) return `수력 ${years}년`;

  let months = (now.getFullYear() - since.getFullYear()) * 12 + (now.getMonth() - since.getMonth());
  if (now.getDate() < since.getDate()) months -= 1;
  return months <= 0 ? '수력 1개월 미만' : `수력 ${months}개월`;
}
