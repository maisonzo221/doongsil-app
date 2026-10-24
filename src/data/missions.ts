// 미션 / 승급 / 아이템 정의.
// 지금은 초급(첫 5개 미션)만 열려 있고, 중급 이상은 이 배열에 티어를 추가하면 화면이 알아서 이어 붙는다.

export type SuitId = 'trunks' | 'onepiece';
export type MedalId = 'medal1' | 'medal2' | 'medal3' | 'medal4';
export type ItemId = SuitId | 'goggles' | 'cap' | MedalId;

export interface ItemDef {
  id: ItemId;
  name: string;
  slot: 'suit' | 'goggles' | 'cap' | 'medal';
  desc: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  trunks: { id: 'trunks', name: '남자 숏사각 수영복', slot: 'suit', desc: '기본 수영복' },
  onepiece: { id: 'onepiece', name: '여자 원피스 수영복', slot: 'suit', desc: '기본 수영복 (미드컷)' },
  goggles: { id: 'goggles', name: '파랑 수경', slot: 'goggles', desc: '푸른 렌즈 수경' },
  cap: { id: 'cap', name: '파랑 곰 수모', slot: 'cap', desc: '둥실곰 로고가 붙은 파란 수모' },
  medal1: { id: 'medal1', name: '초급 메달', slot: 'medal', desc: '초급 승급 기념 메달 (초록 리본)' },
  medal2: { id: 'medal2', name: '중급 메달', slot: 'medal', desc: '중급 승급 기념 은메달 (파랑 리본)' },
  medal3: { id: 'medal3', name: '상급 메달', slot: 'medal', desc: '상급 승급 기념 동메달 (빨강 리본)' },
  medal4: { id: 'medal4', name: '마스터즈 메달', slot: 'medal', desc: '마스터즈 승급 기념 금메달 (노랑 리본)' },
};

export type MissionKind =
  /** 직접 눌러서 "했어요" 하는 미션 */
  | 'confirm'
  /** 앱 기록으로 자동 확인되는 미션: 첫 수영 */
  | 'auto-first-swim'
  /** 앱 기록(횟수·거리·영법)이 목표에 닿으면 자동으로 완료되는 미션 */
  | 'auto-stats';

/** 자동 미션이 보는 기록 값. count=기록 횟수, totalMeters=누적 거리, maxMeters=한 번에 가장 멀리, strokes=기록한 영법 종류 수 */
export type AutoMetric = 'count' | 'totalMeters' | 'maxMeters' | 'strokes';
export interface AutoRule {
  metric: AutoMetric;
  target: number;
  /** 진행 상황 글씨에 붙는 단위 (예: 회, m, 가지) */
  unit: string;
}

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
  /** 미션 설명 창에 보여줄 안내 (준비물·예절 같은 특별한 화면이 없는 미션용) */
  desc?: string;
  /** kind가 auto-stats일 때 달성 조건 */
  auto?: AutoRule;
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
    reward: ['medal1'],
    missions: [
      { id: 'buy-gear', title: '수영 준비물 사기', label: '수영 준비물\n사기', kind: 'confirm', reward: ['trunks', 'onepiece'], doneLabel: '준비물을 샀어요', doneMessage: '준비물 완료!' },
      { id: 'etiquette', title: '수영예절 읽기', label: '수영예절\n읽기', kind: 'confirm', reward: ['cap'], doneLabel: '다 읽었어요', doneMessage: '예절 완료!' },
      { id: 'register-pool', title: '수영장 등록', label: '수영장\n등록', kind: 'confirm', reward: ['goggles'], doneLabel: '수영장에 등록했어요', doneMessage: '등록 완료!' },
      { id: 'first-swim', title: '첫 수영하기', label: '첫 수영\n하기', kind: 'auto-first-swim', reward: [], doneLabel: '첫 수영을 했어요', doneMessage: '첫 수영 완료!' },
      { id: 'kickboard', title: '킥판 잡기', label: '킥판\n잡기', kind: 'confirm', reward: [], doneLabel: '킥판을 잡았어요', doneMessage: '킥판 완료!' },
    ],
  },
  {
    id: 'intermediate',
    name: '중급',
    reward: ['medal2'],
    missions: [
      { id: 'mid-count', title: '수영 10번 기록하기', label: '수영 10회\n기록', kind: 'auto-stats', auto: { metric: 'count', target: 10, unit: '회' }, reward: [], doneLabel: '', doneMessage: '10회 달성!', desc: '수영 기록을 10번 남기면 자동으로 완료돼요.' },
      { id: 'mid-1km', title: '누적 1km 수영하기', label: '누적\n1km', kind: 'auto-stats', auto: { metric: 'totalMeters', target: 1000, unit: 'm' }, reward: [], doneLabel: '', doneMessage: '1km 달성!', desc: '기록한 거리를 모두 합쳐 1,000m가 되면 자동으로 완료돼요.' },
      { id: 'mid-strokes', title: '영법 2가지 기록하기', label: '영법\n2가지', kind: 'auto-stats', auto: { metric: 'strokes', target: 2, unit: '가지' }, reward: [], doneLabel: '', doneMessage: '영법 2가지 달성!', desc: '자유형·배영·평영·접영 중 서로 다른 영법 2가지를 기록하면 자동으로 완료돼요.' },
      { id: 'mid-no-kickboard', title: '킥판 없이 25m 가기', label: '킥판 없이\n25m', kind: 'confirm', reward: [], doneLabel: '킥판 없이 25m 갔어요', doneMessage: '25m 완영!', desc: '킥판 없이 한 번에 25m를 끝까지 가보았다면 눌러주세요.' },
      { id: 'mid-friend', title: '수친과 함께 수영하기', label: '친구와\n함께', kind: 'confirm', reward: [], doneLabel: '함께 수영했어요', doneMessage: '함께 수영 완료!', desc: '수친이나 친구와 같이 수영장에 다녀왔다면 눌러주세요.' },
    ],
  },
  {
    id: 'advanced',
    name: '상급',
    reward: ['medal3'],
    missions: [
      { id: 'adv-count', title: '수영 30번 기록하기', label: '수영 30회\n기록', kind: 'auto-stats', auto: { metric: 'count', target: 30, unit: '회' }, reward: [], doneLabel: '', doneMessage: '30회 달성!', desc: '수영 기록을 30번 남기면 자동으로 완료돼요.' },
      { id: 'adv-10km', title: '누적 10km 수영하기', label: '누적\n10km', kind: 'auto-stats', auto: { metric: 'totalMeters', target: 10000, unit: 'm' }, reward: [], doneLabel: '', doneMessage: '10km 달성!', desc: '기록한 거리를 모두 합쳐 10,000m가 되면 자동으로 완료돼요.' },
      { id: 'adv-strokes', title: '영법 4가지 모두 기록하기', label: '영법\n4가지', kind: 'auto-stats', auto: { metric: 'strokes', target: 4, unit: '가지' }, reward: [], doneLabel: '', doneMessage: '4가지 영법 달성!', desc: '자유형·배영·평영·접영을 모두 한 번씩 기록하면 자동으로 완료돼요.' },
      { id: 'adv-100m', title: '쉬지 않고 100m 가기', label: '쉬지 않고\n100m', kind: 'confirm', reward: [], doneLabel: '100m 갔어요', doneMessage: '100m 완영!', desc: '벽을 잡고 쉬지 않고 한 번에 100m를 가보았다면 눌러주세요.' },
      { id: 'adv-month', title: '한 달 꾸준히 다니기', label: '한 달\n꾸준히', kind: 'confirm', reward: [], doneLabel: '한 달 채웠어요', doneMessage: '꾸준함 달성!', desc: '한 달 동안 빠지지 않고 꾸준히 수영장에 다녔다면 눌러주세요.' },
    ],
  },
  {
    id: 'masters',
    name: '마스터즈',
    reward: ['medal4'],
    missions: [
      { id: 'mas-count', title: '수영 100번 기록하기', label: '수영 100회\n기록', kind: 'auto-stats', auto: { metric: 'count', target: 100, unit: '회' }, reward: [], doneLabel: '', doneMessage: '100회 달성!', desc: '수영 기록을 100번 남기면 자동으로 완료돼요.' },
      { id: 'mas-50km', title: '누적 50km 수영하기', label: '누적\n50km', kind: 'auto-stats', auto: { metric: 'totalMeters', target: 50000, unit: 'm' }, reward: [], doneLabel: '', doneMessage: '50km 달성!', desc: '기록한 거리를 모두 합쳐 50,000m가 되면 자동으로 완료돼요.' },
      { id: 'mas-1000m', title: '한 번에 1,000m 수영하기', label: '한 번에\n1,000m', kind: 'auto-stats', auto: { metric: 'maxMeters', target: 1000, unit: 'm' }, reward: [], doneLabel: '', doneMessage: '1,000m 달성!', desc: '하루 기록 하나에서 1,000m 이상을 수영하면 자동으로 완료돼요.' },
      { id: 'mas-meet', title: '마스터즈 대회·기록회 참가하기', label: '대회·기록회\n참가', kind: 'confirm', reward: [], doneLabel: '참가했어요', doneMessage: '대회 참가 완료!', desc: '마스터즈 수영 대회나 기록회에 참가했다면 눌러주세요.' },
      { id: 'mas-teach', title: '초보 수친에게 수영 알려주기', label: '후배에게\n알려주기', kind: 'confirm', reward: [], doneLabel: '알려줬어요', doneMessage: '멋진 선배!', desc: '수영을 막 시작한 수친에게 팁을 알려주었다면 눌러주세요.' },
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
