# 둥실 (Doongsil)

감성 수영 기록 다이어리 앱. 숫자·스탯이 아니라 "오늘 물속에서 어땠는지"를 남기는 데 집중합니다.

- **노팅**: 오늘 수영 기록 남기기 — 기분(이모지), 종목 태그, 거리/시간/칼로리/평균심박수(애플
  피트니스 자동 불러오기, mock), 한줄 메모(볼드·불릿), 몸 상태. 오늘 남긴 기록은 카드로 쌓이고
  수정/삭제 가능 (하루 최대 3개)
- **캘린더**: 닌텐도 투데이 스타일 헤더, 날짜별 최대 3개 점 표시, 스트릭, 월간 요약 문구, 누적
  거리, 최근 기록(읽기 전용). 날짜를 탭하면 그날 기록을 눌러서 수정/삭제 가능
- **수친**: 친구 목록, 수모임(채팅방), 노팅 기록 공유. 로그인/연락처 접근은 mock
- **샵**: 준비 중 (향후 굿즈 판매 예정)

## 기술 스택

- React Native + Expo (TypeScript)
- React Navigation (bottom tabs + native stack)
- expo-sqlite/kv-store 기반 로컬 저장 (서버 없음)
- react-native-calendars 커스텀 캘린더
- Spoqa Han Sans Neo(한글) + Montserrat(영문, Gotham 대체 — 라이선스 문제로 무료 폰트 사용 중)

## Expo Go 제약 — mock 처리한 기능

Apple 로그인, 연락처 접근, 애플 피트니스 연동은 진짜 네이티브 모듈이 필요해서 Expo Go에서 돌릴 수
없습니다. `src/storage/auth.ts`와 `src/services/appleHealthMock.ts`에 실제 연동과 동일한 형태로
가짜 데이터를 채워뒀고, 나중에 EAS 개발 빌드로 전환할 때 해당 함수 내부만 실제 네이티브 호출로
바꾸면 됩니다.

## 실행 방법

```bash
npm install
npx expo start
```

- `i` — iOS 시뮬레이터
- `a` — Android 에뮬레이터
- `w` — 웹 브라우저 (빠른 확인용)

## 프로젝트 구조

```
src/
  components/   재사용 UI 컴포넌트 (MoodPicker, StrokePicker, RecordCard, WaterDrop ...)
  config/       기능 플래그 (featureFlags.ts)
  navigation/   탭/스택 네비게이션 구성
  screens/      노팅 / 캘린더 / 수친(social/) / 샵 / 랜딩 / 로그인 화면
  services/     애플 피트니스 mock
  storage/      로컬 저장소 (기록·목표·로그인·수친/수모임)
  utils/        날짜, 스트릭, 월간 요약 문구, 메모 서식 로직
  theme.ts      컬러/타이포/스페이싱 디자인 시스템
```

## 브랜드 에셋 (앱 아이콘 / 스플래시)

`assets/`의 아이콘·스플래시는 `.brand-gen/`의 스크립트로 생성했습니다. 물방울 모티프(둥실)를
그라데이션으로 표현한 로고마크이며, 색이나 구도를 바꾸고 싶으면 `brand.html`의 색상/좌표 값을
수정한 뒤 다시 생성하면 됩니다.

```bash
node .brand-gen/generate.js
```

- `icon.png` — 앱 아이콘 (1024×1024, 그라데이션 배경 + 흰 물방울)
- `android-icon-foreground/background/monochrome.png` — 안드로이드 어댑티브 아이콘 3종
- `favicon.png` — 웹 파비콘
- `splash-icon.png` — 스플래시 로고 + "둥실" 워드마크 (투명 배경, `app.json`의
  `expo-splash-screen` 플러그인이 배경 위에 중앙 배치)

## 의도적으로 제외한 기능

- SWOLF, 스트로크 효율 등 스포츠과학 스탯
- 서버 기반 로그인/동기화 (기기 내 로컬 저장만 사용 — 수친/수모임 데이터도 로컬 전용)

사진 첨부, 월말 리캡, 잠금화면 위젯 등은 추후 범위로 남아있습니다.
