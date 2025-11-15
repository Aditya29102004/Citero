-- Create mentions table
create table public.mentions (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid references public.brands(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  source text not null,
  title text not null,
  snippet text,
  date timestamptz not null,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')) not null,
  ai_summary text,
  created_at timestamptz default now()
);

alter table public.mentions enable row level security;

create policy "Users can view mentions for their brands"
  on public.mentions for select
  using (auth.uid() = user_id);

create policy "Users can insert mentions for their brands"
  on public.mentions for insert
  with check (auth.uid() = user_id);

create policy "Users can update mentions for their brands"
  on public.mentions for update
  using (auth.uid() = user_id);

create policy "Users can delete mentions for their brands"
  on public.mentions for delete
  using (auth.uid() = user_id);

-- Create index for better query performance
create index idx_mentions_brand_id on public.mentions(brand_id);
create index idx_mentions_date on public.mentions(date desc);