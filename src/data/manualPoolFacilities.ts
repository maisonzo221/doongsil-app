// 손으로 추가한 수영장 — 인허가/공공시설 데이터셋 어디에도 안 잡히는 공공 수영장을 제보받는 대로 넣는다.
// 운영시간·요금처럼 확인 못 한 값은 지어내지 않고 null로 둔다(화면에서 항목이 숨겨진다).
// 좌표는 OpenStreetMap 기준이라 수십 m 어긋날 수 있다.
import type { PublicPoolFacility } from './publicPoolFacilities';

export const MANUAL_POOL_FACILITIES: PublicPoolFacility[] = [
  {
    id: 'manual-goyang-eoullimnuri',
    name: '고양어울림누리 수영장',
    roadAddress: '경기도 고양시 덕양구 화중로 130',
    lotAddress: '경기도 고양시 덕양구 화중로 130',
    phone: null,
    statusName: '공공시설',
    lat: 37.6474589,
    lng: 126.8344952,
    operWeekday: null,
    operWeekend: null,
    closedDay: null,
    feeText: null,
    capacity: null,
    amenities: null,
    applyMethod: null,
    homepageUrl: null,
    photoUrl: null,
    institution: null,
  },
];
