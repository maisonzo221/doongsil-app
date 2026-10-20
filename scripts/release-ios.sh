#!/bin/bash
# 맥 터미널에서 한 번에: 최신 코드 받기 → 수영장 후보 수집 → 타입 점검 → iOS 빌드 → TestFlight 제출
#
#   cd ~/doongsil-app
#   bash scripts/release-ios.sh
#
# 중간에 실패하면 어느 단계인지 알려주고 멈춘다. 같은 명령을 다시 실행하면 되고,
# 수집은 이미 받은 구역을 건너뛰고 이어서 받는다.
set -u -o pipefail
cd "$(dirname "$0")/.." || exit 1

step() { printf '\n━━ %s\n' "$1"; }
fail() { printf '\n✗ %s\n  이 화면을 캡처해서 보내주세요.\n' "$1"; exit 1; }

step "1/6 최신 코드 받기"
git pull --ff-only origin main || fail "git pull 실패"
npm install --no-audit --no-fund || fail "npm install 실패"

step "2/6 전국 수영장 후보 수집 (실패한 구역은 자동으로 최대 3번 이어받아요)"
LOG="${TMPDIR:-/tmp}/doongsil-collect.log"
for i in 1 2 3; do
  npx -y tsx scripts/collect-pools.ts 2>&1 | tee "$LOG"
  [ "${PIPESTATUS[0]}" -eq 0 ] || fail "수집 스크립트 실패"
  grep -q "받지 못한 구역" "$LOG" || break
  [ "$i" -lt 3 ] && echo "…받지 못한 구역이 있어 한 번 더 받아요 ($i/3)"
done
grep -q "받지 못한 구역" "$LOG" && echo "※ 일부 구역은 끝내 못 받았어요. 받은 데이터만으로 계속 진행해요(나중에 같은 명령을 다시 돌리면 이어서 받아요)."

step "3/6 코드 점검"
npx tsc --noEmit || fail "타입 점검 실패 — 코드에 문제가 있어요"

step "4/6 iOS 빌드 준비 (맥 키체인 버그 패치 확인)"
npx -y eas-cli --version >/dev/null 2>&1
while IFS= read -r f; do
  if grep -q "'find-identity', '-v', '-s'" "$f"; then
    sed -i '' "s/'find-identity', '-v', '-s'/'find-identity', '-s'/" "$f" && echo "패치 적용: $f"
  fi
done < <(find "$HOME/.npm/_npx" -path "*@expo/build-tools/dist/ios/credentials/keychain.js" 2>/dev/null)

step "5/6 iOS 빌드 (20~30분, 화면이 멈춘 것처럼 보여도 기다려주세요)"
MARK="${TMPDIR:-/tmp}/doongsil-build-start"
touch "$MARK"
caffeinate -d npx eas-cli build --local --profile production --platform ios || fail "빌드 실패"
IPA=$(find . -maxdepth 1 -name 'build-*.ipa' -newer "$MARK" 2>/dev/null | head -1)
[ -n "$IPA" ] || fail "방금 만든 .ipa 파일을 못 찾았어요"
IPA_PATH="$PWD/${IPA#./}"
echo "빌드 파일: $IPA_PATH"

step "6/6 TestFlight 제출"
npx eas-cli submit --platform ios --path "$IPA_PATH" || fail "제출 실패 (빌드 파일은 $IPA_PATH 에 있어요)"

printf '\n✅ 끝! 5~10분 뒤 TestFlight 앱에서 둥실을 업데이트하세요.\n'
