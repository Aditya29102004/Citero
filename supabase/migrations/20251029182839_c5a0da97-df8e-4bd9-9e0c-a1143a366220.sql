-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger for new user profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create brands table
create table public.brands (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  aliases text,
  website_url text,
  description text,
  date_added timestamptz default now() not null,
  created_at timestamptz default now()
);

alter table public.brands enable row level security;

create policy "Users can view their own brands"
  on public.brands for select
  using (auth.uid() = user_id);

create policy "Users can insert their own brands"
  on public.brands for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own brands"
  on public.brands for update
  using (auth.uid() = user_id);

create policy "Users can delete their own brands"
  on public.brands for delete
  using (auth.uid() = user_id);