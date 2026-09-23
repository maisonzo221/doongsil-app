// 메모 서식은 아주 가벼운 마크다운 스타일로 저장한다: **볼드**, 줄 앞 "• " 불릿.
// 진짜 리치 텍스트 에디터 없이도 굵게/불릿 정도는 표현할 수 있게 하는 최소 구현.

export function toggleBoldWrap(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const isBold = trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4;
  if (isBold) return trimmed.slice(2, -2);
  return `**${trimmed}**`;
}

export function toggleBulletLine(text: string): string {
  const lines = text.split('\n');
  const lastIndex = lines.length - 1;
  const last = lines[lastIndex];
  lines[lastIndex] = last.startsWith('• ') ? last.slice(2) : `• ${last}`;
  return lines.join('\n');
}

/** 미리보기용: 서식 기호를 지운 순수 텍스트. */
export function stripMemoMarkers(text: string): string {
  return text.replace(/\*\*/g, '');
}

export interface MemoSegment {
  text: string;
  bold: boolean;
}

export interface MemoLine {
  bullet: boolean;
  segments: MemoSegment[];
}

/** 상세 화면용: 줄 단위 + **볼드** 구간으로 파싱. */
export function parseMemo(text: string): MemoLine[] {
  return text.split('\n').map((line) => {
    const bullet = line.startsWith('• ');
    const content = bullet ? line.slice(2) : line;
    const parts = content.split('**');
    const segments: MemoSegment[] = parts.map((part, i) => ({
      text: part,
      bold: i % 2 === 1,
    }));
    return { bullet, segments };
  });
}
