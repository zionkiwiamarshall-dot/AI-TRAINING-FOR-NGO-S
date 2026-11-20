-- Update 2: individual sign-up with email and password.
-- Run once in Supabase: SQL Editor -> New query -> (dropdown set to Database) -> paste -> Run.
-- Safe to re-run.

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

select p.full_name, p.role, u.email from public.profiles p join auth.users u on u.id = p.id;
