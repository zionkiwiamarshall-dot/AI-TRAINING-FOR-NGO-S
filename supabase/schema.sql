-- AI at Work for NGO Teams: database schema for Supabase
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: it uses "if not exists" and "create or replace" where it can.

-- 1. Organizations taking part in a pilot. Each one gets a secret pilot code you give to its staff.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pilot_code text not null unique,
  created_at timestamptz not null default now()
);

-- 2. One profile per learner, linked to their sign-in account.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  organization_id uuid references public.organizations(id) on delete set null,
  role text not null default 'learner' check (role in ('learner','admin')),
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 3. Course progress: the same object the site keeps in localStorage (quiz answers, games, notes, checklists).
create table if not exists public.progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 4. Pilot surveys: one at the start (baseline) and one at the end (final) per learner.
create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  kind text not null check (kind in ('baseline','final')),
  confidence int not null check (confidence between 1 and 5),
  task_name text,
  task_minutes int check (task_minutes is null or task_minutes between 0 and 10000),
  ai_errors_caught int check (ai_errors_caught is null or ai_errors_caught between 0 and 1000),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (user_id, kind)
);

-- Helper: is the signed-in user an admin (you, the trainer)?
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Learners join with a pilot code. This runs with elevated rights so pilot codes never have to be readable.
create or replace function public.join_pilot(p_code text, p_full_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into v_org from public.organizations where upper(pilot_code) = upper(trim(p_code));
  if v_org is null then raise exception 'That pilot code was not recognized'; end if;
  insert into public.profiles (id, full_name, organization_id, consent_at)
  values (auth.uid(), left(trim(p_full_name), 120), v_org, now())
  on conflict (id) do update set full_name = excluded.full_name, organization_id = excluded.organization_id;
  return v_org;
end; $$;

-- Stop learners from making themselves admin.
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null when you run SQL yourself in the Supabase SQL Editor, so the owner can still promote an admin there.
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then new.role := old.role; end if;
  return new;
end; $$;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- Surveys always carry the learner's own organization, whatever the browser sends.
create or replace function public.survey_set_org() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.organization_id := (select organization_id from public.profiles where id = new.user_id);
  return new;
end; $$;
drop trigger if exists surveys_set_org on public.surveys;
create trigger surveys_set_org before insert or update on public.surveys
  for each row execute function public.survey_set_org();

-- Row level security: each learner sees only their own rows; the admin sees everything.
alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.progress      enable row level security;
alter table public.surveys       enable row level security;

drop policy if exists org_admin_all on public.organizations;
create policy org_admin_all on public.organizations for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists progress_self on public.progress;
create policy progress_self on public.progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists progress_admin_read on public.progress;
create policy progress_admin_read on public.progress for select using (public.is_admin());

drop policy if exists surveys_self on public.surveys;
create policy surveys_self on public.surveys for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists surveys_admin_read on public.surveys;
create policy surveys_admin_read on public.surveys for select using (public.is_admin());

-- Learners can't read the organizations table (that keeps pilot codes secret); this gives them their own organization's name.
create or replace function public.my_org_name() returns text
language sql stable security definer set search_path = public as $$
  select o.name from public.organizations o join public.profiles p on p.organization_id = o.id where p.id = auth.uid();
$$;

grant execute on function public.join_pilot(text, text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_org_name() to authenticated;
