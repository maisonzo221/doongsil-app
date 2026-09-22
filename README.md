# 둥실 (Doongsil)

감성 수영 기록 다이어리 앱. 숫자·스탯이 아니라 "오늘 물속에서 어땠는지"를 남기는 데 집중합니다.

- **노팅**: 오늘 수영 기록 남기기 — 기분(이모지), 종목 태그, 거리/시간(선택), 한줄 메모, 몸 상태
- **캘린더**: 월별 기록을 물방울 아이콘으로 확인, 연속 기록일(스트릭), 월간 요약 문구, 누적 거리
- **다이어리**: 지금까지의 기록을 시간순으로 모아보고 수정/삭제
- **샵**: 준비 중 (향후 굿즈 판매 예정)

## 기술 스택

- React Native + Expo (TypeScript)
- React Navigation (bottom tabs + native stack)
- AsyncStorage 기반 로컬 저장 (서버 없음)
- react-native-calendars 커스텀 캘린더

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
  navigation/   탭/스택 네비게이션 구성
  screens/      노팅 / 캘린더 / 다이어리 / 샵 화면
  storage/      AsyncStorage 기반 기록·목표 저장소
  utils/        날짜, 스트릭, 월간 요약 문구 로직
  theme.ts      컬러/타이포/스페이싱 토큰
```

## 브랜드 에셋 (앱 아이콘 / 스플래시)

`assets/`의 아이콘·스플래시는 `.brand-gen/`의 스크립트로 생성했습니다. 물방울 모티프(둥실)를
민트→하늘색 그라데이션으로 표현한 로고마크이며, 색이나 구도를 바꾸고 싶으면 `brand.html`의
색상/좌표 값을 수정한 뒤 다시 생성하면 됩니다.

```bash
node .brand-gen/generate.js
```

- `icon.png` — 앱 아이콘 (1024×1024, 그라데이션 배경 + 흰 물방울)
- `android-icon-foreground/background/monochrome.png` — 안드로이드 어댑티브 아이콘 3종
- `favicon.png` — 웹 파비콘
- `splash-icon.png` — 스플래시 로고 + "둥실" 워드마크 (투명 배경, `app.json`의
  `expo-splash-screen` 플러그인이 `#EAF7F6` 배경 위에 중앙 배치)

## 의도적으로 제외한 기능 (MVP 범위 밖)

- SWOLF, 스트로크 효율 등 스포츠과학 스탯
- 소셜/공유/팔로우
- 서버 기반 로그인/동기화 (기기 내 로컬 저장만 사용)

사진 첨부, 월말 리캡, 위젯, Apple Watch 연동 등은 추후 P1 범위로 추가 예정입니다.
