-- Phase 7: 수톡/톡톡 메시지 푸시 알림 (카카오톡처럼 앱이 꺼져있어도 알림이 오게).
-- migration_009까지 이미 실행한 프로젝트의 SQL Editor에서 이어서 실행한다.
--
-- 별도 서버(Edge Function) 없이, Postgres 안에서 pg_net 확장으로 Expo 푸시 서버
-- (https://exp.host)에 직접 HTTP 요청을 보내는 방식이다 — 새 메시지가 insert될 때마다
-- 트리거가 그 방의 다른 멤버들(보낸 사람 제외) 중 푸시 토큰이 등록된 사람에게 보낸다.

create extension if not exists pg_net;

alter table public.profiles add column if not exists expo_push_token text;

create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient record;
  group_row record;
  sender_name text;
  body_preview text;
begin
  select name, room_kind into group_row from public.chat_groups where id = new.group_id;
  select coalesce(nickname_ko, nickname_en, '누군가') into sender_name
  from public.profiles where id = new.sender_id;

  body_preview := case
    when new.type = 'text' then coalesce(new.text, '')
    when new.type = 'record_share' then '🏊 수영 기록을 공유했어요'
    else '새 메시지가 도착했어요'
  end;

  for recipient in
    select p.expo_push_token
    from public.chat_group_members m
    join public.profiles p on p.id = m.user_id
    where m.group_id = new.group_id
      and m.user_id != new.sender_id
      and p.expo_push_token is not null
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'to', recipient.expo_push_token,
        'title', coalesce(group_row.name, case when group_row.room_kind = 'toktok' then '톡톡' else '수톡' end),
        'body', sender_name || ': ' || left(body_preview, 80),
        'sound', 'default',
        'data', jsonb_build_object('groupId', new.group_id)
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_notify_chat_message on public.chat_messages;
create trigger trg_notify_chat_message
  after insert on public.chat_messages
  for each row execute function public.notify_chat_message();
