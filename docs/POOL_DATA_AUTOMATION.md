# 수영장 데이터 월간 자동 갱신

신규 개업·폐업한 수영장을 **앱 업데이트(심사) 없이** 매달 앱에 반영한다.

## 흐름
1. 매월 2일 새벽 3시 17분(KST)에 GitHub Action(`.github/workflows/update-pools.yml`)이 돈다.
2. 행정안전부 인허가 수영장 API(data.go.kr 15155038)를 전부 받아 `docs/data/pools.json`(+ 작은 `pools-meta.json`)을 만든다.
   - 직전보다 20% 넘게 줄면 API가 일부만 준 것으로 보고 저장하지 않는다(Action이 실패로 표시됨).
   - 수영장 목록이 지난달과 같으면 커밋하지 않는다.
3. 파일은 GitHub Pages로 공개된다: `https://maisonzo221.github.io/doongsil-app/data/pools.json`
4. 앱은 실행 3초 뒤(하루 1번까지) `pools-meta.json`의 날짜를 보고, 새 버전일 때만 `pools.json`을 받아 기기에 저장한다(`src/services/remotePools.ts`).
   - 받은 파일을 검사해서(행 형식, 좌표 범위, 최소 300곳, 직전보다 절반 넘게 줄면 거부) 이상하면 버린다.
   - 인터넷이 안 되거나 파일이 이상하면 앱에 내장된 목록(`src/data/licensedPoolFacilities.ts`)을 그대로 쓴다.
   - 새 목록은 받은 뒤 다음 검색부터(앱을 다시 켜면 확실히) 적용된다.

## 처음 한 번만
1. GitHub 저장소 Settings → Secrets and variables → Actions → **New repository secret**
   - 이름 `POOL_DATA_API_KEY`, 값은 앱에서 쓰는 `EXPO_PUBLIC_POOL_DATA_API_KEY`와 같은 data.go.kr 인증키.
2. Actions 탭 → "수영장 데이터 월간 갱신" → **Run workflow** 로 한 번 돌려서 `docs/data/pools.json`을 만든다.
3. 브라우저에서 위 URL이 열리는지 확인한다.

## 알아둘 점
- 이 갱신은 **이 기능이 들어 있는 앱 버전부터** 동작한다. 그 전에 배포된 빌드는 내장 목록만 쓴다.
- 이 방식은 **정부 인허가 목록**(이름·주소·전화·좌표)을 갱신한다. 운영시간·이용료 같은 상세 정보(공공시설개방정보, 서울 열린데이터)와 전화로 확인한 모집 일정(`poolEnrollment.ts`)은 지금처럼 빌드에 들어간다.
- 수동 실행: `node scripts/fetch-pool-data.mjs --json docs/data/pools.json` (인증키는 `.env` 또는 환경변수).
