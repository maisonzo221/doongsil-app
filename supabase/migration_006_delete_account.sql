-- 앱스토어 심사 요건(5.1.1 v): 계정 생성을 지원하는 앱은 앱 안에서 바로 계정을 삭제할
-- 수 있어야 한다. profiles.id가 auth.users(id)를 on delete cascade로 참조하고 있고,
-- friendships/chat_group_members/chat_messages/chat_group_bans/board_posts/
-- board_comments가 전부 profiles(id)를 on delete cascade로 참조하고 있어서, auth.users
-- 행 하나만 지우면 이 사용자와 관련된 서버 쪽 데이터가 전부 같이 지워진다.
--
-- auth.users는 클라이언트(anon/authenticated 키)로 직접 DELETE할 수 없어서, security
-- definer 함수로 감싸 본인 행만 지울 수 있게 한다 — auth.uid()로 본인 확인하니 다른
-- 사람 계정을 지울 방법은 없다.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
