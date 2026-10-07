-- Phase 4: 자유게시판 관리자 권한 + 수력(水歷) + 댓글 비속어 필터 + 친구 전용 수영 통계
-- schema.sql ~ migration_006을 이미 실행한 프로젝트의 SQL Editor에서 이어서 실행한다.
--
-- 이 파일은 세 부분으로 나뉜다:
--   1) 스키마 변경 — 바로 실행해도 안전함.
--   2) 본인 계정을 관리자로 지정 — "YOUR_EMAIL_HERE" 자리에 본인 애플 로그인 이메일을
--      넣고 그 줄만 실행. (이메일을 모르면 먼저
--      `select id, nickname_ko, created_at from public.profiles order by created_at;`
--      로 본인 행을 찾아서 id로 지정해도 된다.)
--   3) 자유게시판 시드 게시글 — 2번에서 지정한 관리자 계정 이름으로 올라간다. 2번을 먼저
--      실행한 뒤에 돌려야 한다.

-- ---------- 1) 스키마 변경 ----------

alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists swim_since date;

-- 다른 사람 프로필 화면에서 수력을 보여줘야 하니, 공개 뷰에도 swim_since를 추가한다.
create or replace view public.public_profiles as
  select id, nickname_ko, nickname_en, invite_code, created_at, swim_since from public.profiles;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- 게시글: 관리자는 전부 수정/삭제 가능. 일반 사용자는 본인 글만, 그리고 댓글이 하나도
-- 없을 때만 삭제 가능 (댓글 달린 글은 작성자도 못 지우고, 관리자만 지울 수 있다).
drop policy if exists "posts: author can update" on public.board_posts;
create policy "posts: author or admin can update"
  on public.board_posts for update
  using (auth.uid() = author_id or public.is_admin());

drop policy if exists "posts: author can delete" on public.board_posts;
create policy "posts: author (no comments) or admin can delete"
  on public.board_posts for delete
  using (
    public.is_admin()
    or (
      auth.uid() = author_id
      and not exists (select 1 from public.board_comments c where c.post_id = board_posts.id)
    )
  );

-- 댓글: 관리자는 아무 댓글이나 삭제 가능(모더레이션용). 일반 사용자는 본인 댓글만.
drop policy if exists "comments: author can delete" on public.board_comments;
create policy "comments: author or admin can delete"
  on public.board_comments for delete
  using (auth.uid() = author_id or public.is_admin());

-- 댓글 비속어 필터 (서버단) — 메시지(chat_messages)에 이미 있던 contains_profanity()를
-- 재사용하되, 한국어/영어/일본어 욕설을 더 폭넓게 담도록 그 함수 자체를 갱신한다.
create or replace function public.contains_profanity(input text)
returns boolean
language sql
immutable
as $$
  select input ~* (
    '(씨발|시발|씨팔|개새끼|개새|병신|지랄|좆|존나|느금마|니미|닥쳐|꺼져|죽어|염병|' ||
    'fuck|shit|bitch|asshole|bastard|cunt|dick|whore|slut|' ||
    'くそ|クソ|死ね|しね|きちがい|キチガイ|ばか|バカ|ちくしょう|馬鹿野郎)'
  );
$$;

create or replace function public.check_board_comment_profanity()
returns trigger
language plpgsql
as $$
begin
  if new.body is not null and public.contains_profanity(new.body) then
    raise exception 'profanity_blocked';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_board_comment_profanity on public.board_comments;
create trigger trg_check_board_comment_profanity
  before insert on public.board_comments
  for each row execute function public.check_board_comment_profanity();

-- 친구 전용 평균 수영 데이터 — 수영 기록 자체는 기기에만 있어서(서버에 안 올라감),
-- 각자 기기에서 계산한 "요약값"만 본인이 직접 올려두고, 수친만 조회할 수 있게 한다.
create table if not exists public.profile_stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  avg_distance_m numeric,
  avg_duration_min numeric,
  session_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profile_stats enable row level security;

drop policy if exists "profile_stats: owner or friend can read" on public.profile_stats;
create policy "profile_stats: owner or friend can read"
  on public.profile_stats for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.friendships f
      where f.user_id = auth.uid() and f.friend_id = profile_stats.user_id
    )
  );

drop policy if exists "profile_stats: owner can upsert" on public.profile_stats;
create policy "profile_stats: owner can insert"
  on public.profile_stats for insert
  with check (auth.uid() = user_id);

create policy "profile_stats: owner can update"
  on public.profile_stats for update
  using (auth.uid() = user_id);

-- ---------- 2) 본인 계정을 관리자로 지정 ----------
-- 아래 한 줄만 본인 정보로 바꿔서 실행하세요. (이메일을 모르면 위 주석의 select문으로
-- 먼저 본인 id/닉네임을 확인하고 id 기준으로 바꿔서 실행해도 됩니다.)

-- update public.profiles set is_admin = true where id = (
--   select p.id from public.profiles p
--   join auth.users u on u.id = p.id
--   where u.email = 'YOUR_EMAIL_HERE'
-- );

-- ---------- 3) 자유게시판 시드 게시글 ----------
-- 2번을 먼저 실행해서 관리자 계정이 지정된 뒤에 이 블록을 실행하세요. 관리자로 지정된
-- 계정 이름으로 게시글이 올라갑니다 (나중에 관리자 계정으로 자유롭게 수정/삭제 가능).
--
-- do $$
-- declare
--   admin_id uuid;
-- begin
--   select id into admin_id from public.profiles where is_admin = true limit 1;
--   if admin_id is null then
--     raise notice '관리자 계정이 아직 없습니다 — 2번 블록을 먼저 실행하세요.';
--     return;
--   end if;
--
--   insert into public.board_posts (author_id, category, title, body) values
--   (admin_id, '수영복', '수영장 갈 때 뭐 입고 가세요? 저만의 코디 루틴 공유해요',
--    '운동복 안에 수영복 미리 입고 가는 편인데, 탈의실 줄 설 필요 없어서 편해요. 위에는 래쉬가드나 헐렁한 티 하나 걸치고, 신발은 슬립온이나 크록스처럼 빨리 벗고 신을 수 있는 걸로. 다들 어떻게 입고 가세요?'),
--   (admin_id, '수영 팁', '수영 루틴 추천 — 초보 탈출 6주 루틴', '1~2주차는 발차기+호흡에만 집중, 3~4주차부터 자유형 25m씩 끊어서 반복, 5~6주차엔 50m 이어가기. 무리하게 거리 늘리는 것보다 자세부터 잡는 게 확실히 빨라요. 다른 분들 루틴도 궁금하네요.'),
--   (admin_id, '자유', '서울 안에서 시설 좋은 수영장 추천해주세요', '요즘 다니는 데가 레인이 좁아서 옮길까 고민 중이에요. 샤워실 넓고 레인 여유 있는 곳 아시는 분 계신가요? 가격대는 상관없어요.'),
--   (admin_id, '자유', '수영장 리뷰 — 동네 구립 수영장 다녀온 후기', '시설은 오래됐는데 물 온도랑 관리는 진짜 좋았어요. 자유수영 시간에 사람도 적당히 적어서 레인 뺏길 걱정 없었고요. 가격도 저렴해서 만족. 구립/시립 수영장이 은근 숨은 명당 많은 것 같아요.'),
--   (admin_id, '수영복', '수영 장비 뭐 쓰세요? 핀/패들 추천 좀', '최근에 숏핀 샀는데 발차기 교정에 확실히 도움 되네요. 패들은 아직 안 써봤는데 손목에 무리 간다는 얘기도 있어서 고민 중이에요. 써보신 분들 후기 궁금해요.'),
--   (admin_id, '수영복', '수경 뭐 쓰세요? 김 서림 때문에 미치겠어요', '저렴이 수경은 20분만 지나도 뿌옇게 김이 서려서 레인 선도 안 보여요. 김서림 방지 코팅 오래가는 제품 있으면 추천해주세요. 미러 렌즈가 낫다는 얘기도 있던데 맞나요?'),
--   (admin_id, '자유', '수모 실리콘 vs 라텍스, 뭐가 더 나아요?', '라텍스는 머리카락 끼는 느낌이 싫어서 실리콘으로 바꿨는데 대신 좀 더 비싸더라고요. 오래 쓰시는 분들은 어떤 거 쓰시나요?'),
--   (admin_id, '자유', '수영장에서 모르는 사람이랑 친해질 수 있을까요 ㅋㅋ', '매번 같은 시간대에 가다 보니 낯익은 분들이 생기는데, 인사 트는 게 은근 어렵네요. 혹시 수영장에서 친구(또는 그 이상?) 만들어보신 분 계신가요 ㅎㅎ 썰 좀 풀어주세요')
--   on conflict do nothing;
-- end $$;
