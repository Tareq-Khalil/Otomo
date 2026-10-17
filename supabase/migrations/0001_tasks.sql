-- Otomo tasks: one row per task, owned by one account, protected by Row Level Security.
create table public.tasks (
  id           uuid primary key,                                   -- generated on the device, so retries are idempotent
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  notes        text not null default '' check (char_length(notes) <= 2000),
  priority     text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  category     text check (category is null or char_length(category) <= 40),
  status       text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  completed_at timestamptz,
  due_date     date,
  due_time     time,
  start_date   date,
  start_time   time,
  est_min      integer check (est_min is null or est_min between 1 and 1440),
  version      integer not null default 1,                         -- bumped by the trigger on every update (optimistic concurrency)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,                                        -- soft delete so other devices learn about deletions
  check (due_time is null or due_date is not null),
  check (start_time is null or start_date is not null)
);
create index tasks_owner_updated_idx on public.tasks (owner_id, updated_at);

alter table public.tasks enable row level security;
create policy "tasks: read own"   on public.tasks for select using (owner_id = auth.uid());
create policy "tasks: insert own" on public.tasks for insert with check (owner_id = auth.uid());
create policy "tasks: update own" on public.tasks for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- no delete policy: clients only soft-delete

create function public.tasks_touch() returns trigger language plpgsql as $$
begin
  new.version    := old.version + 1;
  new.updated_at := now();
  new.owner_id   := old.owner_id;   -- ownership can never be changed
  new.created_at := old.created_at;
  return new;
end $$;
create trigger tasks_touch before update on public.tasks for each row execute function public.tasks_touch();
