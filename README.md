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

## 의도적으로 제외한 기능 (MVP 범위 밖)

- SWOLF, 스트로크 효율 등 스포츠과학 스탯
- 소셜/공유/팔로우
- 서버 기반 로그인/동기화 (기기 내 로컬 저장만 사용)

사진 첨부, 월말 리캡, 위젯, Apple Watch 연동 등은 추후 P1 범위로 추가 예정입니다.
