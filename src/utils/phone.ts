// 아주 단순한 한국 번호 우선 E.164 정규화. 이미 +로 시작하면 그대로 둔다.
export function toE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('0')) return `+82${digits.slice(1)}`;
  if (digits.startsWith('82')) return `+${digits}`;
  return `+82${digits}`;
}
