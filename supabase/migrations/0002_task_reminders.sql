-- minutes before the due/start time at which Otomo should remind the user (null = no reminder)
alter table public.tasks add column remind_min integer check (remind_min is null or remind_min between 0 and 10080);
