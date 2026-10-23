import type { ItemId } from './missions';

// 아이템 아이콘: 캐릭터 보드 그림에서 아이템 부분만 오려낸 것.
export const ITEM_IMAGES: Record<ItemId, number> = {
  trunks: require('../../assets/items/trunks.png'),
  onepiece: require('../../assets/items/onepiece.png'),
  goggles: require('../../assets/items/goggles.png'),
  cap: require('../../assets/items/cap.png'),
  medal: require('../../assets/items/medal.png'),
};
