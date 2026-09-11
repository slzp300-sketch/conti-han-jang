-- 콘티 짜자 — 서버 저장소 (Supabase: Postgres + Auth + Storage)
--
-- 쓰는 법: Supabase 프로젝트를 만들고 SQL Editor 에 이 파일을 통째로 붙여넣어 Run.
-- 두 번 돌려도 안전하다.
--
-- 나누는 기준은 하나다. 콘티는 그 사람 것이고, 악보는 팀 것이다.
--   contis  — 만든 사람만 보고 고친다.
--   sheets  — 로그인한 사람은 모두 보고 올린다. 지우는 건 올린 사람만.
--
-- 콘티 행에는 그림이 없다. 악보는 전부 보관함에 있으므로 콘티는 "몇 번 악보를
-- 어디서 어디까지 잘라 얼마 크기로" 만 들고 있으면 된다. 덕분에 콘티 한 개가
-- 몇 KB다. 보관함을 거치지 않은 그림만 conti 버킷에 따로 올라간다.

-- ─────────────────────────────────────────────────────────────────────
-- 1. 사람
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id   uuid primary key references auth.users on delete cascade,
  name text not null default ''
);
alter table public.profiles enable row level security;

drop policy if exists "team reads profiles" on public.profiles;
create policy "team reads profiles" on public.profiles
  for select to authenticated using (true);

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 가입하면 이름 한 줄을 자동으로 만든다. 이름을 안 적었으면 메일 앞부분을 쓴다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────
-- 2. 악보 보관함 — 팀 전체가 같이 쓴다
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.sheets (
  id        text primary key,
  fp        text not null unique,          -- 같은 그림을 두 번 올리지 않기 위한 지문
  title     text not null default '',
  key       text not null default '',
  w         int  not null default 0,
  h         int  not null default 0,
  thumb     text not null default '',      -- 220px 미리보기(data URL, 장당 약 20KB)
  path      text not null,                 -- storage 의 sheets 버킷에 있는 원본 경로
  forms     jsonb not null default '[]'::jsonb,
  renamed   boolean not null default false,
  use_count int not null default 0,
  saved_at  timestamptz not null default now(),
  used_at   timestamptz,
  saved_by  uuid references auth.users on delete set null
);
create index if not exists sheets_title_idx on public.sheets (title);
create index if not exists sheets_saved_at_idx on public.sheets (saved_at desc);

alter table public.sheets enable row level security;

drop policy if exists "team reads sheets" on public.sheets;
create policy "team reads sheets" on public.sheets
  for select to authenticated using (true);

drop policy if exists "team adds sheets" on public.sheets;
create policy "team adds sheets" on public.sheets
  for insert to authenticated with check (saved_by = auth.uid());

-- 제목·키를 고치고 송폼을 남기는 건 누구나 할 수 있다. 같이 정리하는 보관함이다.
drop policy if exists "team edits sheets" on public.sheets;
create policy "team edits sheets" on public.sheets
  for update to authenticated using (true) with check (true);

-- 지우는 것만 올린 사람으로 막는다. 한 사람이 팀 보관함을 통째로 비우는 사고를 막는다.
drop policy if exists "uploader deletes sheets" on public.sheets;
create policy "uploader deletes sheets" on public.sheets
  for delete to authenticated using (saved_by = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- 3. 콘티 보관함 — 각자 자기 것만
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.contis (
  id         text primary key,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  title      text not null default '',
  data       jsonb not null,                -- 곡·송폼·악보 참조. 그림은 여기 없다.
  pages      int  not null default 1,
  updated_at timestamptz not null default now()
);
create index if not exists contis_user_idx on public.contis (user_id, updated_at desc);

alter table public.contis enable row level security;

drop policy if exists "own contis" on public.contis;
create policy "own contis" on public.contis
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- 4. 그림 파일
-- ─────────────────────────────────────────────────────────────────────
-- sheets — 팀 공용 원본. conti — 보관함을 거치지 않은 그림, 사람별 폴더.
insert into storage.buckets (id, name, public) values ('sheets', 'sheets', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('conti', 'conti', false)
  on conflict (id) do nothing;

drop policy if exists "team reads sheet files" on storage.objects;
create policy "team reads sheet files" on storage.objects
  for select to authenticated using (bucket_id = 'sheets');

drop policy if exists "team writes sheet files" on storage.objects;
create policy "team writes sheet files" on storage.objects
  for insert to authenticated with check (bucket_id = 'sheets');

-- 파일 지우기는 authenticated 면 되게 열어 둔다. 진짜 잠금은 sheets 표의 delete
-- 규칙이고(올린 사람만), 행이 없는 파일은 아무도 찾지 못하는 찌꺼기다.
drop policy if exists "team deletes sheet files" on storage.objects;
create policy "team deletes sheet files" on storage.objects
  for delete to authenticated using (bucket_id = 'sheets');

drop policy if exists "own conti files" on storage.objects;
create policy "own conti files" on storage.objects
  for all to authenticated
  using (bucket_id = 'conti' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'conti' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────
-- 나중에 "아무나 가입"을 "승인받은 사람만"으로 바꾸고 싶을 때
-- ─────────────────────────────────────────────────────────────────────
-- profiles 에 approved 를 두고 sheets 읽기 규칙만 바꾸면 된다. 앱은 손대지 않는다.
--
--   alter table public.profiles add column approved boolean not null default false;
--   drop policy "team reads sheets" on public.sheets;
--   create policy "team reads sheets" on public.sheets for select to authenticated
--     using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved));
