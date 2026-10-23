import type { MedalId, SuitId } from '../../data/missions';

// 캐릭터 보드 그림 목록. 한 장마다 곰이 무엇을 입고 있는지 적어 둔다.
// 새 조합 보드가 오면 파일을 assets/bear에 넣고 여기에 한 줄만 추가하면 된다.
// (swim: 헤엄치는 모습 4장이 있는 보드)

export type SwimPose = 'free' | 'fly' | 'breast' | 'back';

export interface Board {
  suit: SuitId | null;
  cap: boolean;
  goggles: boolean;
  medal: MedalId | null;
  front: number;
  swim?: Record<SwimPose, number>;
}

export const BOARDS: Board[] = [
  { suit: null, cap: false, goggles: false, medal: null, front: require('../../../assets/bear/front-base.png'), swim: { free: require('../../../assets/bear/swim-base-free.png'), fly: require('../../../assets/bear/swim-base-fly.png'), breast: require('../../../assets/bear/swim-base-breast.png'), back: require('../../../assets/bear/swim-base-back.png') } },
  { suit: null, cap: true, goggles: false, medal: null, front: require('../../../assets/bear/front-cap.png'), swim: { free: require('../../../assets/bear/swim-cap-free.png'), fly: require('../../../assets/bear/swim-cap-fly.png'), breast: require('../../../assets/bear/swim-cap-breast.png'), back: require('../../../assets/bear/swim-cap-back.png') } },
  { suit: 'trunks', cap: true, goggles: true, medal: null, front: require('../../../assets/bear/front-trunks.png'), swim: { free: require('../../../assets/bear/swim-trunks-free.png'), fly: require('../../../assets/bear/swim-trunks-fly.png'), breast: require('../../../assets/bear/swim-trunks-breast.png'), back: require('../../../assets/bear/swim-trunks-back.png') } },
  { suit: 'onepiece', cap: true, goggles: true, medal: null, front: require('../../../assets/bear/front-onepiece.png'), swim: { free: require('../../../assets/bear/swim-onepiece-free.png'), fly: require('../../../assets/bear/swim-onepiece-fly.png'), breast: require('../../../assets/bear/swim-onepiece-breast.png'), back: require('../../../assets/bear/swim-onepiece-back.png') } },
  { suit: 'trunks', cap: false, goggles: false, medal: 'medal1', front: require('../../../assets/bear/front-suit-trunks-m1.png') },
  { suit: 'trunks', cap: false, goggles: false, medal: 'medal2', front: require('../../../assets/bear/front-suit-trunks-m2.png') },
  { suit: 'trunks', cap: false, goggles: false, medal: 'medal3', front: require('../../../assets/bear/front-suit-trunks-m3.png') },
  { suit: 'trunks', cap: false, goggles: false, medal: 'medal4', front: require('../../../assets/bear/front-suit-trunks-m4.png') },
  { suit: 'onepiece', cap: false, goggles: false, medal: 'medal1', front: require('../../../assets/bear/front-suit-onepiece-m1.png') },
  { suit: 'onepiece', cap: false, goggles: false, medal: 'medal2', front: require('../../../assets/bear/front-suit-onepiece-m2.png') },
  { suit: 'onepiece', cap: false, goggles: false, medal: 'medal3', front: require('../../../assets/bear/front-suit-onepiece-m3.png') },
  { suit: 'onepiece', cap: false, goggles: false, medal: 'medal4', front: require('../../../assets/bear/front-suit-onepiece-m4.png') },
  { suit: 'trunks', cap: true, goggles: true, medal: 'medal1', front: require('../../../assets/bear/front-full-trunks-m1.png') },
  { suit: 'trunks', cap: true, goggles: true, medal: 'medal2', front: require('../../../assets/bear/front-full-trunks-m2.png') },
  { suit: 'trunks', cap: true, goggles: true, medal: 'medal3', front: require('../../../assets/bear/front-full-trunks-m3.png') },
  { suit: 'trunks', cap: true, goggles: true, medal: 'medal4', front: require('../../../assets/bear/front-full-trunks-m4.png') },
  { suit: 'onepiece', cap: true, goggles: true, medal: 'medal1', front: require('../../../assets/bear/front-full-onepiece-m1.png') },
  { suit: 'onepiece', cap: true, goggles: true, medal: 'medal2', front: require('../../../assets/bear/front-full-onepiece-m2.png') },
  { suit: 'onepiece', cap: true, goggles: true, medal: 'medal3', front: require('../../../assets/bear/front-full-onepiece-m3.png') },
  { suit: 'onepiece', cap: true, goggles: true, medal: 'medal4', front: require('../../../assets/bear/front-full-onepiece-m4.png') },
];
