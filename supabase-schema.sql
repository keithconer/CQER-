-- ============================================
-- CQER Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  first_name text,
  last_name text,
  user_type text check (user_type in ('college_coordinator', 'unit_coordinator')) not null,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- RLS Policies
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create profile on sign-up trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Only create profile if user_type is provided (manual registration)
  -- For OAuth, we'll handle profile creation in the registration flow (Step 2)
  if new.raw_user_meta_data->>'user_type' is not null then
    insert into public.profiles (id, email, first_name, last_name, user_type, avatar_url)
    values (
      new.id,
      new.email,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'user_type',
      new.raw_user_meta_data->>'avatar_url'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create projects table
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  classification jsonb not null default '[]',
  sdg_goals jsonb not null default '[]',
  academic_program text not null,
  major text,
  proponents jsonb not null default '[]',
  college text not null default 'CEIT',
  collaborating_agencies text,
  target_beneficiaries jsonb not null default '[]',
  community_location text,
  start_date date,
  end_date date,
  budget_requirements jsonb not null default '[]',
  gad_score decimal(5,2),
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.projects enable row level security;

-- RLS Policies
drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects" on public.projects
  for select using (auth.uid() = created_by);

drop policy if exists "Users can create own projects" on public.projects;
create policy "Users can create own projects" on public.projects
  for insert with check (auth.uid() = created_by);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = created_by);
drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects" on public.projects
  for delete using (auth.uid() = created_by);

-- ============================================
-- PDF Upload Enhancement
-- Run this in Supabase SQL Editor
-- ============================================

-- Add PDF columns to projects table
alter table public.projects 
add column if not exists pdf_url text,
add column if not exists pdf_name text;

-- Storage Setup (Manual step in Supabase Dashboard):
-- 1. Create bucket: cqer-projects_pdfs
-- 2. Public: OFF
-- 3. Allowed MIME types: application/pdf
-- 4. Max file size: 5242880 (5MB)

-- Storage RLS Policies (Run after creating the bucket)
-- Allow users to upload their own files
create policy "Allow authenticated uploads"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'cqer-projects_pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files
create policy "Allow individual read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'cqer-projects_pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
create policy "Allow individual delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'cqer-projects_pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own files
create policy "Allow individual update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'cqer-projects_pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
