create table if not exists public.board_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.board_state enable row level security;

drop policy if exists "Anyone can read board state" on public.board_state;
drop policy if exists "Anyone can create board state" on public.board_state;
drop policy if exists "Anyone can update board state" on public.board_state;

create policy "Anyone can read board state"
on public.board_state
for select
using (true);

create policy "Anyone can create board state"
on public.board_state
for insert
with check (true);

create policy "Anyone can update board state"
on public.board_state
for update
using (true)
with check (true);

create or replace function public.set_board_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_board_state_updated_at on public.board_state;

create trigger set_board_state_updated_at
before update on public.board_state
for each row
execute function public.set_board_state_updated_at();
