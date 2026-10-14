create table if not exists public.estimates (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  saved_at timestamptz not null default now(),
  units numeric not null check (units >= 0),
  rate numeric not null check (rate >= 0),
  fixed numeric not null check (fixed >= 0),
  days integer not null check (days between 1 and 366),
  energy numeric not null check (energy >= 0),
  total numeric not null check (total >= 0),
  daily numeric not null check (daily >= 0),
  primary key (user_id, id)
);

alter table public.estimates enable row level security;

create policy "Users can manage their own estimates"
  on public.estimates
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);