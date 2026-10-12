-- Phase 6: 자유게시판 글에 사진(선택) 붙이기 + 관리자 닉네임 변경 + 시드 게시글(사진 포함).
-- migration_007/008을 이미 실행한 프로젝트의 SQL Editor에서 이어서 실행한다.
-- 관리자 계정은 이미 지정되어 있다고 가정한다(앞서 is_admin = true로 설정한 그 계정).

-- ---------- 1) image_url 컬럼 추가 ----------

alter table public.board_posts add column if not exists image_url text;

-- ---------- 2) 관리자 계정 닉네임을 "둥실 관리자"로 변경 ----------
-- (실명이 아니라 운영 계정처럼 보이게)

update public.profiles set nickname_ko = '둥실 관리자', nickname_en = 'Doongsil Admin'
where is_admin = true;

-- ---------- 3) 자유게시판 시드 게시글 (사진 3개는 Pexels 무료 라이선스 실제 사진) ----------

do $$
declare
  admin_id uuid;
begin
  select id into admin_id from public.profiles where is_admin = true limit 1;
  if admin_id is null then
    raise notice '관리자 계정이 없습니다 — 먼저 is_admin = true로 지정하세요.';
    return;
  end if;

  insert into public.board_posts (author_id, category, title, body, image_url) values
  (admin_id, '수영복', '수영장 갈 때 뭐 입고 가세요? 저만의 코디 루틴 공유해요',
   '운동복 안에 수영복 미리 입고 가는 편인데, 탈의실 줄 설 필요 없어서 편해요. 위에는 래쉬가드나 헐렁한 티 하나 걸치고, 신발은 슬립온이나 크록스처럼 빨리 벗고 신을 수 있는 걸로. 다들 어떻게 입고 가세요?',
   null),
  (admin_id, '수영 팁', '수영 루틴 추천 — 초보 탈출 6주 루틴',
   '1~2주차는 발차기+호흡에만 집중, 3~4주차부터 자유형 25m씩 끊어서 반복, 5~6주차엔 50m 이어가기. 무리하게 거리 늘리는 것보다 자세부터 잡는 게 확실히 빨라요. 다른 분들 루틴도 궁금하네요.',
   'https://images.pexels.com/photos/3672642/pexels-photo-3672642.jpeg?auto=compress&w=1260&h=750&dpr=1'),
  (admin_id, '자유', '서울 안에서 시설 좋은 수영장 추천해주세요',
   '요즘 다니는 데가 레인이 좁아서 옮길까 고민 중이에요. 샤워실 넓고 레인 여유 있는 곳 아시는 분 계신가요? 가격대는 상관없어요.',
   null),
  (admin_id, '자유', '수영장 리뷰 — 동네 구립 수영장 다녀온 후기',
   '시설은 오래됐는데 물 온도랑 관리는 진짜 좋았어요. 자유수영 시간에 사람도 적당히 적어서 레인 뺏길 걱정 없었고요. 가격도 저렴해서 만족. 구립/시립 수영장이 은근 숨은 명당 많은 것 같아요.',
   'https://images.pexels.com/photos/40068492/pexels-photo-40068492/free-photo-of-indoor-swimming-pool-with-lane-markers.jpeg?auto=compress&w=1260&h=750&dpr=1'),
  (admin_id, '수영복', '수영 장비 뭐 쓰세요? 핀/패들 추천 좀',
   '최근에 숏핀 샀는데 발차기 교정에 확실히 도움 되네요. 패들은 아직 안 써봤는데 손목에 무리 간다는 얘기도 있어서 고민 중이에요. 써보신 분들 후기 궁금해요.',
   null),
  (admin_id, '수영복', '수경 뭐 쓰세요? 김 서림 때문에 미치겠어요',
   '저렴이 수경은 20분만 지나도 뿌옇게 김이 서려서 레인 선도 안 보여요. 김서림 방지 코팅 오래가는 제품 있으면 추천해주세요. 미러 렌즈가 낫다는 얘기도 있던데 맞나요?',
   'https://images.pexels.com/photos/5915306/pexels-photo-5915306.jpeg?auto=compress&w=1260&h=750&dpr=1'),
  (admin_id, '자유', '수모 실리콘 vs 라텍스, 뭐가 더 나아요?',
   '라텍스는 머리카락 끼는 느낌이 싫어서 실리콘으로 바꿨는데 대신 좀 더 비싸더라고요. 오래 쓰시는 분들은 어떤 거 쓰시나요?',
   null),
  (admin_id, '자유', '수영장에서 모르는 사람이랑 친해질 수 있을까요 ㅋㅋ',
   '매번 같은 시간대에 가다 보니 낯익은 분들이 생기는데, 인사 트는 게 은근 어렵네요. 혹시 수영장에서 친구(또는 그 이상?) 만들어보신 분 계신가요 ㅎㅎ 썰 좀 풀어주세요',
   null)
  on conflict do nothing;
end $$;
