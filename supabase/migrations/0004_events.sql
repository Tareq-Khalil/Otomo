-- Otomo personal events: user-created calendar entries, owned by one account.
-- Mirrors the tasks table pattern: soft-delete, versioned, RLS-protected.
create table public.events (
  id          uuid        primary key,          -- generated on device; retries are idempotent
  owner_id    uuid        not null references auth.users (id) on delete cascade,
  title       text        not null check (char_length(btrim(title)) between 1 and 60),
  date        date        not null,
  start_time  time        not null,
  end_time    time        not null,
  version     integer     not null default 1,   -- bumped by trigger on every update
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,                      -- soft-delete so other devices learn about removals
  check (end_time > start_time)
);

create index events_owner_updated_idx on public.events (owner_id, updated_at);

alter table public.events enable row level security;
create policy "events: read own"   on public.events for select using (owner_id = auth.uid());
create policy "events: insert own" on public.events for insert with check (owner_id = auth.uid());
create policy "events: update own" on public.events for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- no delete policy: clients only soft-delete

create function public.events_touch() returns trigger language plpgsql as $$
begin
  new.version    := old.version + 1;
  new.updated_at := now();
  new.owner_id   := old.owner_id;   -- ownership is immutable
  new.created_at := old.created_at;
  return new;
end $$;
create trigger events_touch before update on public.events
  for each row execute function public.events_touch();

