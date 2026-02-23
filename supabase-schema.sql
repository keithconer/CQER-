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
  user_type text check (user_type in ('super_admin', 'college_coordinator', 'unit_coordinator')) not null,
  department text,
  unit text,
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
    insert into public.profiles (id, email, first_name, last_name, user_type, department, unit, avatar_url)
    values (
      new.id,
      new.email,
      new.raw_user_meta_data->>'first_name',
      new.raw_user_meta_data->>'last_name',
      new.raw_user_meta_data->>'user_type',
      new.raw_user_meta_data->>'department',
      new.raw_user_meta_data->>'unit',
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

-- ============================================================
-- START COPY: Unit Coordinator Shared Visibility + Realtime
-- ============================================================
-- Unit coordinators can also view projects created by fellow coordinators in the same department+unit
drop policy if exists "Unit coordinators can view projects in same unit" on public.projects;
create policy "Unit coordinators can view projects in same unit" on public.projects
  for select using (
    exists (
      select 1
      from public.profiles viewer
      join public.profiles creator on creator.id = projects.created_by
      where viewer.id = auth.uid()
        and viewer.user_type = 'unit_coordinator'
        and creator.user_type = 'unit_coordinator'
        and viewer.department = creator.department
        and viewer.unit = creator.unit
    )
  );

drop policy if exists "Users can create own projects" on public.projects;
create policy "Users can create own projects" on public.projects
  for insert with check (auth.uid() = created_by);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects" on public.projects
  for update using (auth.uid() = created_by);
drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects" on public.projects
  for delete using (auth.uid() = created_by);

-- Helpful indexes for scalable unit-based lookups
create index if not exists idx_profiles_department_unit_type on public.profiles (department, unit, user_type);
create index if not exists idx_projects_created_by on public.projects (created_by);

-- Realtime support for unit project visibility (safe to run multiple times)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'projects'
  ) then
    alter publication supabase_realtime add table public.projects;
  end if;
end
$$;
-- ============================================================
-- END COPY: Unit Coordinator Shared Visibility + Realtime
-- ============================================================

-- ============================================================
-- START COPY: Dashboard Table Column Support (Category/Funding/Budget Total)
-- ============================================================
-- Add new project fields used by Unit Coordinator and Super Admin dashboard tables.
alter table public.projects
add column if not exists category text,
add column if not exists funding_source text,
add column if not exists budget_total numeric(14,2),
add column if not exists co_project_leaders jsonb not null default '[]';

-- Enforce allowed dropdown values.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_category_check'
  ) then
    alter table public.projects
      add constraint projects_category_check
      check (category in ('new', 'existing', 'on process') or category is null);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_funding_source_check'
  ) then
    alter table public.projects
      add constraint projects_funding_source_check
      check (funding_source in ('internally funded', 'externally funded') or funding_source is null);
  end if;
end
$$;

-- Backfill existing rows:
-- 1) Default category/funding where missing.
-- 2) Compute budget_total from budget_requirements JSON when available.
-- 3) Ensure co_project_leaders always has [] when old rows are null.
update public.projects
set
  category = coalesce(category, 'existing'),
  funding_source = coalesce(funding_source, 'internally funded'),
  co_project_leaders = coalesce(co_project_leaders, '[]'::jsonb),
  budget_total = coalesce(
    budget_total,
    (
      select coalesce(sum((item->>'amount')::numeric), 0)
      from jsonb_array_elements(coalesce(projects.budget_requirements, '[]'::jsonb)) as item
    )
  );
-- ============================================================
-- END COPY: Dashboard Table Column Support (Category/Funding/Budget Total)
-- ============================================================

-- ============================================================
-- START COPY: Program Support Using Shared Projects Table
-- ============================================================
-- Reuse public.projects for both "project" and "program" records.
alter table public.projects
add column if not exists entry_type text default 'project';

-- Enforce allowed values and non-null moving forward.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_entry_type_check'
  ) then
    alter table public.projects
      add constraint projects_entry_type_check
      check (entry_type in ('project', 'program'));
  end if;
end
$$;

update public.projects
set entry_type = coalesce(entry_type, 'project');

alter table public.projects
alter column entry_type set default 'project',
alter column entry_type set not null;
-- ============================================================
-- END COPY: Program Support Using Shared Projects Table
-- ============================================================

-- ============================================================
-- START COPY: College Coordinator Post Visibility Controls
-- ============================================================
-- Visibility scope for college coordinator posts:
-- - public: visible to all units within same department
-- - specific_units: visible only to selected unit coordinators
alter table public.projects
add column if not exists visibility_scope text default 'public',
add column if not exists visible_units jsonb default '[]';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_visibility_scope_check'
  ) then
    alter table public.projects
      add constraint projects_visibility_scope_check
      check (visibility_scope in ('public', 'specific_units'));
  end if;
end
$$;

update public.projects
set
  visibility_scope = coalesce(visibility_scope, 'public'),
  visible_units = coalesce(visible_units, '[]'::jsonb);

alter table public.projects
alter column visibility_scope set default 'public',
alter column visibility_scope set not null,
alter column visible_units set default '[]'::jsonb,
alter column visible_units set not null;
-- ============================================================
-- END COPY: College Coordinator Post Visibility Controls
-- ============================================================

-- ============================================
-- PDF Upload Enhancement
-- Run this in Supabase SQL Editor
-- ============================================

-- Add PDF columns to projects table
alter table public.projects 
add column if not exists pdf_url text,
add column if not exists pdf_name text;

-- Add documents JSONB column for multiple files
alter table public.projects
add column if not exists documents jsonb default '[]';

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
