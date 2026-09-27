-- Phase 2: 수친 카테고리 정리 + 수톡 오픈채팅 구조 (방장/강퇴/위임/비속어 필터)
-- schema.sql을 이미 실행한 프로젝트의 SQL Editor에서 이 파일을 이어서 실행한다.

-- ---------- 수친: 카테고리 ----------

alter table public.friendships add column if not exists category text;

create policy "friendships: update own category"
  on public.friendships for update
  using (auth.uid() = user_id);

-- ---------- 수톡: 방장 ----------

alter table public.chat_groups add column if not exists owner_id uuid references public.profiles(id) on delete set null;
update public.chat_groups set owner_id = created_by where owner_id is null;
alter table public.chat_groups alter column owner_id set not null;

-- create_group_with_creator 재정의: 새로 생긴 owner_id 컬럼도 같이 채워야 한다.
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

  insert into public.chat_groups (name, invite_code, created_by, owner_id)
  values (group_name, new_code, auth.uid(), auth.uid())
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

-- ---------- 수톡: 강퇴/차단 ----------

create table public.chat_group_bans (
  group_id uuid not null references public.chat_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  banned_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.chat_group_bans enable row level security;

create policy "bans: members can read"
  on public.chat_group_bans for select
  using (exists (
    select 1 from public.chat_group_members m
    where m.group_id = group_id and m.user_id = auth.uid()
  ));

-- 강퇴: 방장만 가능, 자기 자신은 강퇴 불가. 강퇴된 사람은 같은 초대 코드로 재입장 불가.
create or replace function public.kick_member(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
begin
  select (owner_id = auth.uid()) into is_owner from public.chat_groups where id = target_group_id;
  if not coalesce(is_owner, false) then
    raise exception 'not_owner';
  end if;
  if target_user_id = auth.uid() then
    raise exception 'cannot_kick_self';
  end if;

  delete from public.chat_group_members where group_id = target_group_id and user_id = target_user_id;
  insert into public.chat_group_bans (group_id, user_id)
  values (target_group_id, target_user_id)
  on conflict do nothing;
end;
$$;

grant execute on function public.kick_member(uuid, uuid) to authenticated;

-- 방장 위임: 현재 방장만 가능, 대상은 반드시 현재 멤버여야 한다.
create or replace function public.transfer_ownership(target_group_id uuid, new_owner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
  is_member boolean;
begin
  select (owner_id = auth.uid()) into is_owner from public.chat_groups where id = target_group_id;
  if not coalesce(is_owner, false) then
    raise exception 'not_owner';
  end if;

  select exists(
    select 1 from public.chat_group_members where group_id = target_group_id and user_id = new_owner_id
  ) into is_member;
  if not is_member then
    raise exception 'target_not_member';
  end if;

  update public.chat_groups set owner_id = new_owner_id where id = target_group_id;
end;
$$;

grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;

-- 나가기: 방장은 위임 전엔 나갈 수 없다 (방이 주인 없는 상태가 되는 것 방지).
create or replace function public.leave_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
begin
  select (owner_id = auth.uid()) into is_owner from public.chat_groups where id = target_group_id;
  if coalesce(is_owner, false) then
    raise exception 'owner_must_transfer_first';
  end if;
  delete from public.chat_group_members where group_id = target_group_id and user_id = auth.uid();
end;
$$;

grant execute on function public.leave_group(uuid) to authenticated;

-- join_group_by_invite_code 재정의: 차단된 사람은 같은 코드로 재입장 불가.
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

  if exists (
    select 1 from public.chat_group_bans
    where group_id = target_group_id and user_id = auth.uid()
  ) then
    raise exception 'banned_from_group';
  end if;

  insert into public.chat_group_members (group_id, user_id)
  values (target_group_id, auth.uid())
  on conflict do nothing;

  return target_group_id;
end;
$$;

-- ---------- 수톡: 비속어 필터 (서버단) ----------
-- 클라이언트에서도 같은 목록으로 1차 검사하지만, 우회를 막기 위해 서버에서도 최종 검사한다.
-- 목록은 최소한으로 시작 — 필요하면 이 정규식만 계속 넓혀가면 된다.

create or replace function public.contains_profanity(input text)
returns boolean
language sql
immutable
as $$
  select input ~* '(씨발|시발|개새끼|병신|지랄|좆|fuck|shit|bitch)';
$$;

create or replace function public.check_message_profanity()
returns trigger
language plpgsql
as $$
begin
  if new.text is not null and public.contains_profanity(new.text) then
    raise exception 'profanity_blocked';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_message_profanity on public.chat_messages;
create trigger trg_check_message_profanity
  before insert on public.chat_messages
  for each row execute function public.check_message_profanity();
