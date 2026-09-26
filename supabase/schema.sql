-- 둥실 수친/수모임 백엔드 스키마.
-- Supabase 대시보드의 SQL Editor에서 이 파일 전체를 한 번 실행하면 된다.
-- 인증은 Supabase Auth의 "Sign in with Apple" (native ID token) 방식을 쓴다.

-- ---------- profiles (계정) ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname_ko text,
  nickname_en text,
  phone_e164 text unique,
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 누구나(로그인한 사용자라면) 다른 사람의 표시용 정보는 볼 수 있다 (전화번호는 제외).
create view public.public_profiles as
  select id, nickname_ko, nickname_en, invite_code, created_at from public.profiles;

create policy "profiles: read own row fully"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own row"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: insert own row"
  on public.profiles for insert
  with check (auth.uid() = id);

grant select on public.public_profiles to authenticated;

-- 6자리 영숫자 초대 코드를 생성한다. 충돌하면 재시도.
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 헷갈리는 O/0, I/1 제외
  result text;
  i int;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where invite_code = result);
  end loop;
  return result;
end;
$$;

-- 전화번호 목록으로 이미 가입한 유저를 찾는다 (연락처 동기화용).
-- 클라이언트가 이미 자기 연락처 목록을 갖고 있으므로, 그 목록에 대해서만
-- 매칭 결과(닉네임/id)를 알려준다 — 임의 번호 검색은 불가능하게 SECURITY DEFINER로 제한.
create or replace function public.find_registered_contacts(phones text[])
returns table (id uuid, nickname_ko text, nickname_en text, phone_e164 text)
language sql
security definer
set search_path = public
as $$
  select id, nickname_ko, nickname_en, phone_e164
  from public.profiles
  where phone_e164 = any(phones) and id != auth.uid();
$$;

grant execute on function public.find_registered_contacts(text[]) to authenticated;

-- 초대 코드로 유저를 찾는다.
create or replace function public.find_profile_by_invite_code(code text)
returns table (id uuid, nickname_ko text, nickname_en text)
language sql
security definer
set search_path = public
as $$
  select id, nickname_ko, nickname_en
  from public.profiles
  where invite_code = upper(code) and id != auth.uid();
$$;

grant execute on function public.find_profile_by_invite_code(text) to authenticated;

-- ---------- friendships (수친) ----------

create table public.friendships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id != friend_id)
);

alter table public.friendships enable row level security;

create policy "friendships: read mine"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships: insert mine"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "friendships: delete mine"
  on public.friendships for delete
  using (auth.uid() = user_id);

-- 친구 추가는 즉시 상호 관계로 만든다 (수락/거절 절차 없음, v1은 단순하게).
create or replace function public.add_mutual_friend(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.friendships (user_id, friend_id)
  values (auth.uid(), target_id)
  on conflict do nothing;

  insert into public.friendships (user_id, friend_id)
  values (target_id, auth.uid())
  on conflict do nothing;
end;
$$;

grant execute on function public.add_mutual_friend(uuid) to authenticated;

-- ---------- chat_groups / members / messages (수모임) ----------

create table public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.chat_group_members (
  group_id uuid not null references public.chat_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('text', 'photo', 'record_share')),
  text text,
  photo_url text,
  shared_summary text,
  created_at timestamptz not null default now()
);

alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.chat_messages enable row level security;

create policy "groups: members can read"
  on public.chat_groups for select
  using (exists (
    select 1 from public.chat_group_members m
    where m.group_id = id and m.user_id = auth.uid()
  ));

create policy "groups: creator can insert"
  on public.chat_groups for insert
  with check (auth.uid() = created_by);

create policy "members: can read own group's roster"
  on public.chat_group_members for select
  using (exists (
    select 1 from public.chat_group_members m2
    where m2.group_id = group_id and m2.user_id = auth.uid()
  ));

create policy "members: can add self"
  on public.chat_group_members for insert
  with check (auth.uid() = user_id);

create policy "messages: members can read"
  on public.chat_messages for select
  using (exists (
    select 1 from public.chat_group_members m
    where m.group_id = group_id and m.user_id = auth.uid()
  ));

create policy "messages: members can send"
  on public.chat_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.chat_group_members m
      where m.group_id = group_id and m.user_id = auth.uid()
    )
  );

-- 그룹을 만들면서 만든 사람을 바로 첫 멤버로 넣어준다 + 초대 코드 발급.
create or replace function public.create_group_with_creator(group_name text, member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
  new_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
  member uuid;
begin
  loop
    new_code := '';
    for i in 1..8 loop
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.chat_groups where invite_code = new_code);
  end loop;

  insert into public.chat_groups (name, invite_code, created_by)
  values (group_name, new_code, auth.uid())
  returning id into new_group_id;

  insert into public.chat_group_members (group_id, user_id) values (new_group_id, auth.uid());

  foreach member in array member_ids loop
    if member != auth.uid() then
      insert into public.chat_group_members (group_id, user_id)
      values (new_group_id, member)
      on conflict do nothing;
    end if;
  end loop;

  return new_group_id;
end;
$$;

grant execute on function public.create_group_with_creator(text, uuid[]) to authenticated;

-- 초대 코드/링크로 수모임 참여.
create or replace function public.join_group_by_invite_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
begin
  select id into target_group_id from public.chat_groups where invite_code = upper(code);
  if target_group_id is null then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.chat_group_members (group_id, user_id)
  values (target_group_id, auth.uid())
  on conflict do nothing;

  return target_group_id;
end;
$$;

grant execute on function public.join_group_by_invite_code(text) to authenticated;

-- 실시간 채팅용: chat_messages 테이블을 Realtime publication에 추가.
alter publication supabase_realtime add table public.chat_messages;
