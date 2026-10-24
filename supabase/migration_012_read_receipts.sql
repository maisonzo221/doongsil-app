-- 수톡 읽음 표시 (안 읽은 메시지 수 + 카카오톡식 "안 읽은 사람 수").
--
-- 멤버마다 "여기까지 읽었다"는 시각(last_read_at)을 저장한다.
--   · 방 목록의 안 읽은 개수  = 내가 읽은 시각 이후에, 다른 사람이 보낸 메시지 수
--   · 말풍선 옆 숫자          = 그 메시지가 올라온 뒤에 들어온 멤버 중, 읽은 시각이 메시지보다 앞선 사람 수(보낸 사람 제외)
-- 이미 있는 멤버는 지금 시각으로 시작해서(= 예전 메시지는 모두 읽은 것으로 취급) 갑자기 숫자가 쏟아지지 않는다.

alter table public.chat_group_members
  add column if not exists last_read_at timestamptz not null default now();

create index if not exists chat_messages_group_created_idx
  on public.chat_messages (group_id, created_at);

-- 내가 이 방을 읽었다고 표시한다 (되돌아가지 않게 greatest).
create or replace function public.mark_group_read(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.chat_group_members
  set last_read_at = greatest(last_read_at, now())
  where group_id = target_group_id and user_id = auth.uid();
end;
$$;

grant execute on function public.mark_group_read(uuid) to authenticated;

-- 내가 들어 있는 모든 방의 안 읽은 메시지 수.
create or replace function public.get_unread_counts()
returns table (group_id uuid, unread bigint)
language sql
security definer
stable
set search_path = public
as $$
  select m.group_id, count(msg.id) as unread
  from public.chat_group_members m
  join public.chat_messages msg
    on msg.group_id = m.group_id
   and msg.sender_id <> m.user_id
   and msg.created_at > m.last_read_at
  where m.user_id = auth.uid()
  group by m.group_id;
$$;

grant execute on function public.get_unread_counts() to authenticated;

-- 다른 사람이 읽으면 말풍선 옆 숫자가 바로 줄어들도록, 멤버 행의 변경을 실시간으로 받을 수 있게 한다.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_group_members'
     ) then
    alter publication supabase_realtime add table public.chat_group_members;
  end if;
end $$;
