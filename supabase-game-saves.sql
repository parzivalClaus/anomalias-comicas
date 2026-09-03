create table if not exists public.game_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_version integer not null default 1,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.game_saves enable row level security;

revoke all on table public.game_saves from anon, authenticated;
grant select, insert, update on table public.game_saves to authenticated;

drop policy if exists "Users can read own save" on public.game_saves;
create policy "Users can read own save"
on public.game_saves
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own save" on public.game_saves;
create policy "Users can insert own save"
on public.game_saves
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own save" on public.game_saves;
create policy "Users can update own save"
on public.game_saves
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
