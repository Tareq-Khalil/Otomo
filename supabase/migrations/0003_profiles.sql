-- Otomo profiles: one row per registered user, linked 1:1 with auth.users.
-- Stores all academic and personal information for the account.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text        not null check (char_length(btrim(name)) between 1 and 60),
  username    text        not null unique
                          check (char_length(username) between 3 and 30
                            and username ~ '^[a-zA-Z0-9_]+$'),
  faculty     text        not null default 'foe',
  level       integer     not null default 1,
  group_no    integer     not null default 1,
  section_no  integer     not null default 1,
  code        text        not null default '120260000'
                          check (char_length(btrim(code)) between 6 and 15),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Drop existing policies if they already exist to allow clean re-runs
drop policy if exists "profiles: read own" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

create policy "profiles: read own"   on public.profiles for select using (id = auth.uid());
create policy "profiles: insert own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles: update own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Keep updated_at current; never allow changing id.
create or replace function public.profiles_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.id         := old.id;      -- ownership is immutable
  new.created_at := old.created_at;
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.profiles_touch();

-- Automatic trigger: whenever a user is created in auth.users, create their profile row automatically
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  raw_user text;
  clean_user text;
begin
  raw_user := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'user');
  clean_user := regexp_replace(lower(raw_user), '[^a-z0-9_]', '', 'g');
  if length(clean_user) < 3 then
    clean_user := clean_user || '_' || substring(new.id::text from 1 for 4);
  end if;
  clean_user := substring(clean_user from 1 for 30);

  insert into public.profiles (id, name, username, faculty, level, group_no, section_no, code)
  values (
    new.id,
    substring(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Student') from 1 for 60),
    clean_user,
    coalesce(new.raw_user_meta_data->>'faculty', 'foe'),
    coalesce((new.raw_user_meta_data->>'level')::integer, 1),
    coalesce((new.raw_user_meta_data->>'group_no')::integer, 1),
    coalesce((new.raw_user_meta_data->>'section_no')::integer, 1),
    substring(coalesce(new.raw_user_meta_data->>'code', '120260000') from 1 for 15)
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any existing accounts already in auth.users that don't have a profile yet
insert into public.profiles (id, name, username, faculty, level, group_no, section_no, code)
select
  u.id,
  substring(coalesce(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Student') from 1 for 60),
  substring(regexp_replace(lower(coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), 'user')), '[^a-z0-9_]', '', 'g') || '_' || substring(u.id::text from 1 for 4) from 1 for 30),
  coalesce(u.raw_user_meta_data->>'faculty', 'foe'),
  coalesce((u.raw_user_meta_data->>'level')::integer, 1),
  coalesce((u.raw_user_meta_data->>'group_no')::integer, 1),
  coalesce((u.raw_user_meta_data->>'section_no')::integer, 1),
  substring(coalesce(u.raw_user_meta_data->>'code', '120260000') from 1 for 15)
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
