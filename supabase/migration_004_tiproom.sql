-- Phase 3: 팁방 — 자유게시판 + 수영장 찾기(자유수영 포함)
-- schema.sql + migration_002/003을 이미 실행한 프로젝트의 SQL Editor에서 이어서 실행한다.
--
-- 수영장 데이터는 실제 요금/시간표를 알 수 없는 상태로 지어낼 수 없어서, 빈 테이블로
-- 시작해 로그인한 사용자가 직접 입력(크라우드소싱)하는 구조로 만들었다.

-- ---------- 자유게시판 ----------

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  category text not null default '자유',
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.board_posts enable row level security;
alter table public.board_comments enable row level security;

create policy "posts: signed-in users can read"
  on public.board_posts for select
  using (auth.uid() is not null);

create policy "posts: author can insert"
  on public.board_posts for insert
  with check (auth.uid() = author_id);

create policy "posts: author can update"
  on public.board_posts for update
  using (auth.uid() = author_id);

create policy "posts: author can delete"
  on public.board_posts for delete
  using (auth.uid() = author_id);

create policy "comments: signed-in users can read"
  on public.board_comments for select
  using (auth.uid() is not null);

create policy "comments: author can insert"
  on public.board_comments for insert
  with check (auth.uid() = author_id);

create policy "comments: author can delete"
  on public.board_comments for delete
  using (auth.uid() = author_id);

-- ---------- 수영장 찾기 / 자유수영 (크라우드소싱) ----------

create table public.pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region text,
  address text,
  phone text,
  website_url text,
  free_swim_note text,
  pricing_note text,
  added_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.pools enable row level security;

create policy "pools: signed-in users can read"
  on public.pools for select
  using (auth.uid() is not null);

create policy "pools: signed-in users can add"
  on public.pools for insert
  with check (auth.uid() = added_by);

create policy "pools: adder can update"
  on public.pools for update
  using (auth.uid() = added_by);
