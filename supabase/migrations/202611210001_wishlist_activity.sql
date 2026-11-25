-- Track the most recent time a customer's wishlist changed. The table has no
-- client policies or grants; only the trigger and privileged server API use it.
create table if not exists public.wishlist_activity (
    user_id uuid primary key references auth.users(id) on delete cascade,
    last_updated timestamptz not null
);

alter table public.wishlist_activity enable row level security;
revoke all on table public.wishlist_activity from public, anon, authenticated;
-- The Edge Function reads this table using the server-only service role.
grant select on table public.wishlist_activity to service_role;
grant select on table public.wishlist_items to service_role;

-- Recover the latest known wishlist activity without changing wishlist rows.
insert into public.wishlist_activity (user_id, last_updated)
select user_id, max(created_at)
from public.wishlist_items
group by user_id
having max(created_at) is not null
on conflict (user_id) do update
set last_updated = greatest(
    public.wishlist_activity.last_updated,
    excluded.last_updated
);

create or replace function public.record_wishlist_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.wishlist_activity (user_id, last_updated)
    values (old.user_id, now())
    on conflict (user_id) do update
    set last_updated = excluded.last_updated;
    return old;
end;
$$;

create or replace function public.touch_wishlist_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.wishlist_activity (user_id, last_updated)
    values (new.user_id, now())
    on conflict (user_id) do update
    set last_updated = excluded.last_updated;
    return new;
end;
$$;

-- Dropping by name then recreating keeps this migration safe to re-run.
drop trigger if exists wishlist_activity_after_insert on public.wishlist_items;
create trigger wishlist_activity_after_insert
after insert on public.wishlist_items
for each row execute function public.touch_wishlist_activity();

drop trigger if exists wishlist_activity_after_delete on public.wishlist_items;
create trigger wishlist_activity_after_delete
after delete on public.wishlist_items
for each row execute function public.record_wishlist_activity();

revoke all on function public.record_wishlist_activity() from public, anon, authenticated;
revoke all on function public.touch_wishlist_activity() from public, anon, authenticated;
