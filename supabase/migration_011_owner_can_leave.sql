-- 방장도 그냥 나갈 수 있게 한다.
--   · 다른 멤버가 있으면: 가장 먼저 들어온 멤버가 자동으로 방장이 된다.
--   · 혼자 남은 방장이면: 방이 사라진다(멤버/메시지/차단 목록은 cascade로 같이 삭제).
-- 방장을 직접 골라 위임하고 나가는 경우는 앱이 transfer_ownership → leave_group 순서로 부른다.
create or replace function public.leave_group(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  is_owner boolean;
  successor uuid;
begin
  select (owner_id = auth.uid()) into is_owner from public.chat_groups where id = target_group_id;

  if coalesce(is_owner, false) then
    select user_id into successor
    from public.chat_group_members
    where group_id = target_group_id and user_id <> auth.uid()
    order by joined_at asc
    limit 1;

    if successor is null then
      delete from public.chat_groups where id = target_group_id;
      return;
    end if;

    update public.chat_groups set owner_id = successor where id = target_group_id;
  end if;

  delete from public.chat_group_members where group_id = target_group_id and user_id = auth.uid();
end;
$$;

grant execute on function public.leave_group(uuid) to authenticated;
