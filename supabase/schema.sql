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

-- Individual sign-up (also in 2-individual-signup.sql for existing projects)
-- Every new account gets a profile automatically, using the name typed on the sign-up form.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, consent_at)
  values (new.id,
          left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)), 120),
          now())
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Give a profile to any account created before this update.
insert into public.profiles (id, full_name, consent_at)
select u.id,
       left(coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)), 120),
       now()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Backup for the website: creates the signed-in user's profile if it's somehow missing.
create or replace function public.ensure_profile(p_full_name text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.profiles (id, full_name, consent_at)
  values (auth.uid(), left(coalesce(nullif(trim(p_full_name), ''), 'Learner'), 120), now())
  on conflict (id) do nothing;
end; $$;
grant execute on function public.ensure_profile(text) to authenticated;

-- Pilot codes are now optional: joining keeps your existing name.
create or replace function public.join_pilot(p_code text, p_full_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select id into v_org from public.organizations where upper(pilot_code) = upper(trim(p_code));
  if v_org is null then raise exception 'That pilot code was not recognized'; end if;
  insert into public.profiles (id, full_name, organization_id, consent_at)
  values (auth.uid(), left(coalesce(nullif(trim(p_full_name), ''), 'Learner'), 120), v_org, now())
  on conflict (id) do update set organization_id = excluded.organization_id;
  return v_org;
end; $$;


-- Password recovery without email (also in 3-recovery-codes.sql for existing projects)
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.recovery (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code_hash text not null,
  attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.recovery enable row level security; -- no policies: only the functions below can touch it

-- Save (or replace) the signed-in learner's recovery code. Only a scrambled hash is stored.
create or replace function public.set_recovery_code(p_code text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if char_length(p_code) < 12 then raise exception 'Recovery code too short'; end if;
  insert into public.recovery (user_id, code_hash, attempts, locked_until, updated_at)
  values (auth.uid(), extensions.crypt(upper(p_code), extensions.gen_salt('bf')), 0, null, now())
  on conflict (user_id) do update set code_hash = excluded.code_hash, attempts = 0, locked_until = null, updated_at = now();
end; $$;

create or replace function public.has_recovery_code() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.recovery where user_id = auth.uid());
$$;

-- Forgot password: email + recovery code + new password. 5 wrong tries locks it for 15 minutes.
-- The code works once; the website then shows the learner a fresh one.
create or replace function public.reset_password_with_code(p_email text, p_code text, p_new_password text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_user uuid; r public.recovery%rowtype;
begin
  if char_length(coalesce(p_new_password, '')) < 8 then return 'short'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email));
  if v_user is null then return 'wrong'; end if;
  select * into r from public.recovery where user_id = v_user;
  if not found then return 'wrong'; end if;
  if r.locked_until is not null and r.locked_until > now() then return 'locked'; end if;
  if extensions.crypt(upper(regexp_replace(p_code, '\s', '', 'g')), r.code_hash) <> r.code_hash then
    update public.recovery set attempts = attempts + 1,
      locked_until = case when attempts + 1 >= 5 then now() + interval '15 minutes' else null end
    where user_id = v_user;
    return 'wrong';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
  where id = v_user;
  delete from public.recovery where user_id = v_user;
  return 'ok';
end; $$;

-- Trainer only: set a temporary password for a learner who lost both password and code.
create or replace function public.admin_set_password(p_user uuid, p_new_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then raise exception 'Only the trainer can do this'; end if;
  if char_length(coalesce(p_new_password, '')) < 8 then raise exception 'Password too short'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
  where id = p_user;
end; $$;

-- Trainer only: learners' emails, so the dashboard can show who is who.
create or replace function public.admin_user_emails() returns table (id uuid, email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only the trainer can do this'; end if;
  return query select u.id, u.email::text from auth.users u;
end; $$;

revoke all on function public.reset_password_with_code(text, text, text) from public;
grant execute on function public.reset_password_with_code(text, text, text) to anon, authenticated;
grant execute on function public.set_recovery_code(text) to authenticated;
grant execute on function public.has_recovery_code() to authenticated;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
grant execute on function public.admin_user_emails() to authenticated;
