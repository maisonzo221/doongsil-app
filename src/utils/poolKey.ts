// 수영장 하나를 데이터가 새로 만들어져도 바뀌지 않게 가리키는 키.
// 관심 수영장, 모집일 정보, "없는 곳" 목록이 전부 이 키로 수영장을 가리킨다.
// 관리번호(id)는 데이터를 다시 받을 때마다 달라질 수 있어서 쓰지 않고, 이름+주소를 쓴다.

export interface PoolKeyInput {
  name: string;
  roadAddress?: string;
  lotAddress?: string;
}

function squash(text: string): string {
  return text
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^0-9a-z가-힣]/g, '');
}

export function poolKey(pool: PoolKeyInput): string {
  const address = pool.roadAddress || pool.lotAddress || '';
  return `${squash(pool.name)}|${squash(address)}`;
}
