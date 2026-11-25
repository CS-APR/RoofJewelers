-- Run in the Supabase SQL Editor for the wishlist_items table.
-- The browser app uses the authenticated role and scopes every row by user_id.

alter table public.wishlist_items enable row level security;

revoke all on table public.wishlist_items from public, anon, authenticated;
grant select, insert, update, delete on table public.wishlist_items to authenticated;

drop policy if exists "Users can read their own wishlist items"
    on public.wishlist_items;
create policy "Users can read their own wishlist items"
    on public.wishlist_items
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Enforce wishlist read ownership"
    on public.wishlist_items;
create policy "Enforce wishlist read ownership"
    on public.wishlist_items
    as restrictive
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own wishlist items"
    on public.wishlist_items;
create policy "Users can add their own wishlist items"
    on public.wishlist_items
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Enforce wishlist insert ownership"
    on public.wishlist_items;
create policy "Enforce wishlist insert ownership"
    on public.wishlist_items
    as restrictive
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own wishlist items"
    on public.wishlist_items;
create policy "Users can delete their own wishlist items"
    on public.wishlist_items
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Enforce wishlist delete ownership"
    on public.wishlist_items;
create policy "Enforce wishlist delete ownership"
    on public.wishlist_items
    as restrictive
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own wishlist items"
    on public.wishlist_items;
create policy "Users can update their own wishlist items"
    on public.wishlist_items
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Enforce wishlist update ownership"
    on public.wishlist_items;
create policy "Enforce wishlist update ownership"
    on public.wishlist_items
    as restrictive
    for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
