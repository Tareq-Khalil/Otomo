create or replace function public.ensure_profile(u auth.users) returns void
language plpgsql security definer set search_path = public as $$
declare
  meta  jsonb := coalesce(u.raw_user_meta_data, '{}'::jsonb);
  base  text;  uname text;  n int := 0;  nm text;  cd text;
begin
  base := regexp_replace(lower(coalesce(nullif(meta->>'username',''),
            split_part(coalesce(u.email,''), '@', 1))), '[^a-z0-9_]', '', 'g');
  if length(base) < 3 then base := 'user_' || substr(replace(u.id::text,'-',''), 1, 6); end if;
  base := left(base, 24);  uname := base;
  while exists (select 1 from public.profiles where username = uname) loop
    n := n + 1;  uname := base || '_' || n;
  end loop;
  nm := left(coalesce(nullif(btrim(meta->>'name'),''),
            nullif(split_part(coalesce(u.email,''), '@', 1),''), 'Student'), 60);
  cd := left(regexp_replace(coalesce(meta->>'code',''), '\s', '', 'g'), 15);
  if length(cd) < 6 then cd := '120260000'; end if;

  insert into public.profiles (id, name, username, faculty, level, group_no, section_no, code)
  values (u.id, nm, uname,
    coalesce(nullif(meta->>'faculty',''), 'foe'),
    case when meta->>'level'      ~ '^\d{1,2}$' then (meta->>'level')::int      else 1 end,
    case when meta->>'group_no'   ~ '^\d{1,2}$' then (meta->>'group_no')::int   else 1 end,
    case when meta->>'section_no' ~ '^\d{1,3}$' then (meta->>'section_no')::int else 1 end,
    cd)
  on conflict (id) do nothing;
end $$;
revoke all on function public.ensure_profile(auth.users) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin perform public.ensure_profile(new);
  exception when others then raise warning 'ensure_profile failed for %: %', new.id, sqlerrm; end;
  return new;   -- signup must never fail because of the profile
end $$;

-- backfill every old account; a bad row only skips itself
do $$
declare u auth.users;
begin
  for u in select a.* from auth.users a
           where not exists (select 1 from public.profiles p where p.id = a.id)
  loop
    begin perform public.ensure_profile(u);
    exception when others then raise warning 'skip %: %', u.id, sqlerrm; end;
  end loop;
end $$;