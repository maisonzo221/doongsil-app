import type { ItemId } from './missions';

// 아이템 아이콘: 캐릭터 보드(아이템 목록)에서 오려낸 그림.
export const ITEM_IMAGES: Record<ItemId, number> = {
  trunks: require('../../assets/items/trunks.png'),
  onepiece: require('../../assets/items/onepiece.png'),
  goggles: require('../../assets/items/goggles.png'),
  cap: require('../../assets/items/cap.png'),
  medal1: require('../../assets/items/medal1.png'),
  medal2: require('../../assets/items/medal2.png'),
  medal3: require('../../assets/items/medal3.png'),
  medal4: require('../../assets/items/medal4.png'),
};
