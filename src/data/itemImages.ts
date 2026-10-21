import type { ItemId } from './missions';

// 캐릭터 보드 그림이 있는 아이템만 곰 위에 보인다. 나머지(수영복·수경)는 보드가 오면 추가한다.
export const ITEM_IMAGES: Partial<Record<ItemId, number>> = {
  cap: require('../../assets/items/cap.png'),
  medal: require('../../assets/items/medal.png'),
};

/** 그림이 아직 없는 아이템의 임시 아이콘. */
export const ITEM_EMOJI: Record<ItemId, string> = {
  trunks: '🩳',
  onepiece: '👙',
  goggles: '🥽',
  cap: '🧢',
  medal: '🏅',
};

/** 곰에게 입혀서 보이는 그림이 있는지. */
export function hasItemArt(id: ItemId): boolean {
  return ITEM_IMAGES[id] != null;
}
