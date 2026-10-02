-- 수친 탭 개편: 수톡(자유 오픈채팅)과 톡톡(수영 모임 전용)을 같은 방 메커니즘으로 쓰되
-- 목록은 분리해서 보여준다. room_kind 컬럼으로 어느 쪽 방인지 구분한다.

alter table public.chat_groups
  add column room_kind text not null default 'sutok' check (room_kind in ('sutok', 'toktok'));

create or replace function public.create_group_with_creator(
  group_name text,
  member_ids uuid[],
  kind text default 'sutok'
)
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

  insert into public.chat_groups (name, invite_code, created_by, owner_id, room_kind)
  values (group_name, new_code, auth.uid(), auth.uid(), kind)
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

grant execute on function public.create_group_with_creator(text, uuid[], text) to authenticated;
