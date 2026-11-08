-- 신고 / 차단 (앱스토어 심사 가이드라인 1.2: 사용자가 올리는 글·채팅이 있는 앱은
-- 부적절한 콘텐츠를 신고하는 방법과 악성 사용자를 차단하는 방법이 있어야 한다).
-- 이미 migration_001~012를 실행한 프로젝트의 SQL Editor에서 이어서 실행한다.

-- ---------- 1) 신고 ----------
-- 신고 당시의 글 내용(target_text)을 같이 저장해서, 나중에 신고된 글이 지워져도 운영자가 확인할 수 있다.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('message', 'post', 'comment', 'user')),
  target_id uuid,
  target_user_id uuid references public.profiles (id) on delete set null,
  reason text not null,
  target_text text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists reports_status_created_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports: reporter can insert" on public.reports;
create policy "reports: reporter can insert"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- 신고한 사람은 자기 신고만, 관리자는 전부 볼 수 있다. (신고된 사람은 누가 신고했는지 볼 수 없다.)
drop policy if exists "reports: reporter or admin can read" on public.reports;
create policy "reports: reporter or admin can read"
  on public.reports for select
  to authenticated
  using (auth.uid() = reporter_id or public.is_admin());

drop policy if exists "reports: admin can update" on public.reports;
create policy "reports: admin can update"
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- 2) 차단 ----------
create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocked_users enable row level security;

drop policy if exists "blocked_users: read mine" on public.blocked_users;
create policy "blocked_users: read mine"
  on public.blocked_users for select
  to authenticated
  using (auth.uid() = blocker_id);

drop policy if exists "blocked_users: insert mine" on public.blocked_users;
create policy "blocked_users: insert mine"
  on public.blocked_users for insert
  to authenticated
  with check (auth.uid() = blocker_id);

drop policy if exists "blocked_users: delete mine" on public.blocked_users;
create policy "blocked_users: delete mine"
  on public.blocked_users for delete
  to authenticated
  using (auth.uid() = blocker_id);

-- ---------- 운영자가 신고를 확인하는 방법 ----------
-- Supabase 대시보드 → SQL Editor 에서:
--
--   select r.created_at, r.target_type, r.reason, r.target_text,
--          rp.nickname_ko as reporter, tp.nickname_ko as reported_user, r.id
--   from public.reports r
--   left join public.profiles rp on rp.id = r.reporter_id
--   left join public.profiles tp on tp.id = r.target_user_id
--   where r.status = 'open'
--   order by r.created_at desc;
--
-- 처리한 뒤에는  update public.reports set status = 'actioned' where id = '...';
-- 문제가 되는 글은 관리자 계정으로 앱에서 지우거나, 아래처럼 지울 수 있다.
--   delete from public.board_posts where id = '...';
--   delete from public.chat_messages where id = '...';
