-- 여러 RLS 정책이 같은 컬럼 이름(group_id)을 쓰는 서브쿼리와 자기 자신을 비교하면서,
-- Postgres가 바깥쪽 행이 아니라 서브쿼리 안쪽의 group_id로 잘못 해석하는 문제가 있었다.
-- (예: chat_group_members 정책이 chat_group_members를 다시 조회하면서 group_id가 어느 쪽을
-- 가리키는지 모호해짐 — 그 결과 조회 자체가 실패해서 멤버 목록이 항상 비어 보였다.)
--
-- SECURITY DEFINER 함수로 한 번 감싸서 모호함 자체를 없앤다.

create or replace function public.is_group_member(check_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.chat_group_members
    where group_id = check_group_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;

drop policy if exists "members: can read own group's roster" on public.chat_group_members;
create policy "members: can read own group's roster"
  on public.chat_group_members for select
  using (public.is_group_member(group_id));

drop policy if exists "bans: members can read" on public.chat_group_bans;
create policy "bans: members can read"
  on public.chat_group_bans for select
  using (public.is_group_member(group_id));

drop policy if exists "messages: members can read" on public.chat_messages;
create policy "messages: members can read"
  on public.chat_messages for select
  using (public.is_group_member(group_id));

drop policy if exists "messages: members can send" on public.chat_messages;
create policy "messages: members can send"
  on public.chat_messages for insert
  with check (auth.uid() = sender_id and public.is_group_member(group_id));
