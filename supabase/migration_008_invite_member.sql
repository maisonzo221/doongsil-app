-- Phase 5: 수톡/톡톡 방 안에서 수친을 바로 멤버로 초대하는 기능.
-- schema.sql ~ migration_007을 이미 실행한 프로젝트의 SQL Editor에서 이어서 실행한다.

-- 기존엔 "chat_group_members: members: can add self" 정책 때문에 본인만 자기 자신을
-- 멤버로 넣을 수 있었다(초대 코드 입력 시). 이제 이미 방에 있는 사람이 다른 사람을
-- 직접 멤버로 넣을 수 있게 하는 함수를 추가한다 — 강퇴로 차단된 사람은 못 넣는다.
create or replace function public.invite_member_to_group(target_group_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_member(target_group_id) then
    raise exception 'not_a_member';
  end if;

  if exists (
    select 1 from public.chat_group_bans
    where group_id = target_group_id and user_id = target_user_id
  ) then
    raise exception 'banned_from_group';
  end if;

  insert into public.chat_group_members (group_id, user_id)
  values (target_group_id, target_user_id)
  on conflict do nothing;
end;
$$;

grant execute on function public.invite_member_to_group(uuid, uuid) to authenticated;
