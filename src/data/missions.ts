// 미션 / 승급 / 아이템 정의.
// 지금은 초급(첫 5개 미션)만 열려 있고, 중급 이상은 이 배열에 티어를 추가하면 화면이 알아서 이어 붙는다.

export type SuitId = 'trunks' | 'onepiece';
export type ItemId = SuitId | 'goggles' | 'cap' | 'medal';

export interface ItemDef {
  id: ItemId;
  name: string;
  slot: 'suit' | 'goggles' | 'cap' | 'medal';
  desc: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  trunks: { id: 'trunks', name: '검정 숏 사각 팬티', slot: 'suit', desc: '기본 수영복' },
  onepiece: { id: 'onepiece', name: '검정 원피스 수영복', slot: 'suit', desc: '기본 수영복 (미드컷)' },
  goggles: { id: 'goggles', name: '파랑 수경', slot: 'goggles', desc: '푸른 렌즈 수경' },
  cap: { id: 'cap', name: '흰 수모', slot: 'cap', desc: '하얀 실리콘 수모' },
  medal: { id: 'medal', name: '초급 메달', slot: 'medal', desc: '초급 승급 기념 동메달' },
};

export type MissionKind =
  /** 직접 눌러서 "했어요" 하는 미션 */
  | 'confirm'
  /** 앱 기록으로 자동 확인되는 미션 */
  | 'auto-first-swim';

export interface MissionDef {
  id: string;
  /** 미션 이름 */
  title: string;
  /** 도장 칸 위에 두 줄로 보이는 이름 */
  label: string;
  kind: MissionKind;
  /** 완료하면 받는 아이템 */
  reward: ItemId[];
  /** 완료 버튼 글씨 */
  doneLabel: string;
  /** 완료한 뒤 보여줄 문구 */
  doneMessage: string;
}

export interface TierDef {
  id: string;
  name: string;
  missions: MissionDef[];
  /** 모든 미션을 마치면 받는 승급 보상 */
  reward: ItemId[];
}

export const TIERS: TierDef[] = [
  {
    id: 'beginner',
    name: '초급',
    reward: ['medal'],
    missions: [
      { id: 'buy-gear', title: '수영 준비물 사기', label: '수영 준비물\n사기', kind: 'confirm', reward: ['trunks', 'onepiece'], doneLabel: '준비물을 샀어요', doneMessage: '준비물 완료!' },
      { id: 'etiquette', title: '수영예절 읽기', label: '수영예절\n읽기', kind: 'confirm', reward: ['cap'], doneLabel: '다 읽었어요', doneMessage: '예절 완료!' },
      { id: 'register-pool', title: '수영장 등록', label: '수영장\n등록', kind: 'confirm', reward: ['goggles'], doneLabel: '수영장에 등록했어요', doneMessage: '등록 완료!' },
      { id: 'first-swim', title: '첫 수영하기', label: '첫 수영\n하기', kind: 'auto-first-swim', reward: [], doneLabel: '첫 수영을 했어요', doneMessage: '첫 수영 완료!' },
      { id: 'kickboard', title: '킥판 잡기', label: '킥판\n잡기', kind: 'confirm', reward: [], doneLabel: '킥판을 잡았어요', doneMessage: '킥판 완료!' },
    ],
  },
];

export const BUY_GEAR_LIST = ['수영복', '수모 (수영모)', '수경'];

export const ETIQUETTE_LIST = [
  '이 닦고 샤워하고 들어가기',
  '수영복은 샤워 후 수영장 입장 전에 입기 (집에서 입고 오면 안돼!)',
  '빨래를 하면 안돼요!',
  '소변보면 안돼요!',
  '씻고 집에 가요~',
  '너무 참견하면 안돼요!',
  '레인에서는 오른쪽으로 붙어서 돌아요',
  '벽에서 쉴 때는 뒤에 오는 사람에게 길을 비켜줘요',
  '물 밖에서는 뛰지 않고 천천히 걸어요',
];

/** 승급(레벨) 이름. 초급을 마치면 Lv.2 중급 도전. */
export const LEVEL_NAMES = ['초보 둥실곰', '중급 둥실곰', '상급 둥실곰', '마스터즈 둥실곰'];
