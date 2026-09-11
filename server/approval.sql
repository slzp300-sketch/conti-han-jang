-- 승인제로 바꾼다 — 가입은 누구나, 보는 건 승인받은 사람만
--
-- 쓰는 법: Supabase SQL Editor 에 붙여넣고 Run. 두 번 돌려도 안전하다.
--
-- 가입 자체는 막지 않는다. 막으면 팀원이 들어올 때마다 대시보드에서 초대를 해야 하고,
-- 그건 형제님 손이 매번 가는 일이다. 대신 가입은 두되 `approved` 가 붙기 전에는
-- 악보가 한 장도 보이지 않게 한다. 가입만 한 사람은 빈 앱을 볼 뿐이다.
--
-- 새 팀원 승인: Table Editor → profiles → 그 줄의 approved 를 true 로.
--   또는  update public.profiles set approved = true where id = '<그 사람 uuid>';

alter table public.profiles add column if not exists approved boolean not null default false;

-- 지금 이미 들어와 있는 사람은 승인된 것으로 둔다
update public.profiles set approved = true where approved = false;

-- 규칙 안에서 매번 profiles 를 뒤지지 않도록 한 군데로 모은다.
-- security definer 라 profiles 의 읽기 규칙과 얽히지 않는다.
create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved)
$$;

-- ── 악보 표 ───────────────────────────────────────────────────────────
drop policy if exists "team reads sheets" on public.sheets;
create policy "team reads sheets" on public.sheets
  for select to authenticated using (public.is_member());

drop policy if exists "team adds sheets" on public.sheets;
create policy "team adds sheets" on public.sheets
  for insert to authenticated with check (saved_by = auth.uid() and public.is_member());

drop policy if exists "team edits sheets" on public.sheets;
create policy "team edits sheets" on public.sheets
  for update to authenticated using (public.is_member()) with check (public.is_member());

-- 지우기는 그대로 올린 사람만. 승인 여부와 별개다.

-- ── 악보 그림 파일 ────────────────────────────────────────────────────
drop policy if exists "team reads sheet files" on storage.objects;
create policy "team reads sheet files" on storage.objects
  for select to authenticated using (bucket_id = 'sheets' and public.is_member());

drop policy if exists "team writes sheet files" on storage.objects;
create policy "team writes sheet files" on storage.objects
  for insert to authenticated with check (bucket_id = 'sheets' and public.is_member());

drop policy if exists "team deletes sheet files" on storage.objects;
create policy "team deletes sheet files" on storage.objects
  for delete to authenticated using (bucket_id = 'sheets' and public.is_member());

-- ── 스스로 승인하는 구멍을 막는다 ─────────────────────────────────────
-- schema.sql 의 "own profile" 규칙은 본인 줄을 고칠 수 있게 열어 둔 것이었다. 이름을
-- 고치라고 둔 것인데, approved 도 같은 줄에 있어서 가입자가 스스로를 승인할 수 있었다.
-- 앱은 프로필을 고치지 않으므로 수정 자체를 닫는다. 승인은 대시보드에서만 한다.
-- (나중에 이름 고치기를 넣는다면 컬럼 단위 권한으로 approved 만 빼면 된다:
--    revoke update on public.profiles from authenticated;
--    grant update (name) on public.profiles to authenticated; )
drop policy if exists "own profile" on public.profiles;

-- 콘티는 손대지 않는다. 원래 자기 것만 보이고, 승인 전에도 자기 콘티는 자기 것이다.
