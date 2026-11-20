-- Update 3: password recovery without email.
-- Learners get a recovery code at sign-up. With it they can set a new password themselves.
-- The trainer (admin) can also reset any learner's password from the Trainer dashboard.
-- Run once in Supabase: SQL Editor -> (dropdown set to Database) -> paste -> Run. Safe to re-run.

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
