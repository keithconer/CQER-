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

-- ============================================================
-- START COPY: Lead Unit Support
-- ============================================================
-- Lead units used in project/program forms:
-- - college coordinators can select one or more units in their department
-- - unit coordinators are auto-assigned to their own unit
alter table public.projects
add column if not exists lead_units jsonb default '[]';

update public.projects
set lead_units = coalesce(lead_units, '[]'::jsonb);

alter table public.projects
alter column lead_units set default '[]'::jsonb,
alter column lead_units set not null;
-- ============================================================
-- END COPY: Lead Unit Support
-- ============================================================

-- ============================================================
-- START COPY: Related Curricular Offering Support
-- ============================================================
-- Optional related curricular offerings for project/program forms.
-- Values are selected from units/offering options under the user's department.
alter table public.projects
add column if not exists related_curricular_offerings jsonb default '[]';

update public.projects
set related_curricular_offerings = coalesce(related_curricular_offerings, '[]'::jsonb);

alter table public.projects
alter column related_curricular_offerings set default '[]'::jsonb,
alter column related_curricular_offerings set not null;
-- ============================================================
-- END COPY: Related Curricular Offering Support
-- ============================================================

-- ============================================================
-- START COPY: Project Registration Form Fields (MOA + Partner Agencies)
-- ============================================================
-- Additional fields used by the updated Project Registration Form.
alter table public.projects
add column if not exists moa_no text,
add column if not exists moa_category text,
add column if not exists date_approved date,
add column if not exists contact_person text,
add column if not exists contact_details text,
add column if not exists partner_agencies jsonb default '[]',
add column if not exists partner_agency_count integer default 0;

update public.projects
set
  partner_agencies = coalesce(partner_agencies, '[]'::jsonb),
  partner_agency_count = coalesce(partner_agency_count, 0);

alter table public.projects
alter column partner_agencies set default '[]'::jsonb,
alter column partner_agency_count set default 0;

-- Normalize legacy MOA category values and support "processing".
update public.projects
set category = 'processing'
where category = 'on process';

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'projects_category_check'
  ) then
    alter table public.projects drop constraint projects_category_check;
  end if;

  alter table public.projects
    add constraint projects_category_check
    check (category in ('new', 'existing', 'processing') or category is null);
end
$$;
-- ============================================================
-- END COPY: Project Registration Form Fields (MOA + Partner Agencies)
-- ============================================================

-- ============================================================
-- START COPY: Project Leader Compatibility Column
-- ============================================================
-- Compatibility column so schema cache includes project_leader when older clients send it.
alter table public.projects
add column if not exists project_leader text;

-- Optional backfill from proponents JSON for existing rows.
update public.projects
set project_leader = coalesce(
  project_leader,
  nullif(trim(coalesce((proponents->0->>'name'), '')), '')
);
-- ============================================================
-- END COPY: Project Leader Compatibility Column
-- ============================================================

-- ============================================================
-- START COPY: Project Number Auto Field
-- ============================================================
-- Project No. used by the registration form as an auto-generated reference.
alter table public.projects
add column if not exists project_no text;

-- Optional uniqueness safeguard for generated project numbers.
create unique index if not exists idx_projects_project_no_unique
on public.projects (project_no)
where project_no is not null;
-- ============================================================
-- END COPY: Project Number Auto Field
-- ============================================================

-- ============================================================
-- START COPY: Program Number Auto Field
-- ============================================================
-- Program No. used by the program registration form as an auto-generated reference.
alter table public.projects
add column if not exists program_no text;

-- Optional uniqueness safeguard for generated program numbers.
create unique index if not exists idx_projects_program_no_unique
on public.projects (program_no)
where program_no is not null;
-- ============================================================
-- END COPY: Program Number Auto Field
-- ============================================================

-- ============================================================
-- START COPY: Project Registration Form Cleanup (Project Title + Removed Fields)
-- ============================================================
-- Add dedicated project title column used by the updated form.
alter table public.projects
add column if not exists project_title text;

update public.projects
set project_title = coalesce(
  nullif(trim(project_title), ''),
  nullif(trim(title), ''),
  'Untitled Project'
);

alter table public.projects
alter column project_title set not null;

-- Keep legacy title aligned with project_title for table views still using "title".
update public.projects
set title = project_title
where coalesce(nullif(trim(title), ''), '') <> coalesce(nullif(trim(project_title), ''), '');

-- Remove deprecated project number field and index.
drop index if exists idx_projects_project_no_unique;
alter table public.projects
drop column if exists project_no;

-- Remove deprecated fields from each partner agency JSON object.
update public.projects
set partner_agencies = coalesce(
  (
    select jsonb_agg(agency - 'extension_activities' - 'remarks' - 'date_conducted')
    from jsonb_array_elements(coalesce(projects.partner_agencies, '[]'::jsonb)) as agency
  ),
  '[]'::jsonb
)
where jsonb_typeof(coalesce(projects.partner_agencies, '[]'::jsonb)) = 'array';
-- ============================================================
-- END COPY: Project Registration Form Cleanup (Project Title + Removed Fields)
-- ============================================================

-- ============================================================
-- START COPY: Project Proposal Module Fields
-- ============================================================
-- Extend shared projects table for Project Proposal workflow.
alter table public.projects
add column if not exists proposal_department text,
add column if not exists proposal_unit text,
add column if not exists target_beneficiary_others text,
add column if not exists faculty_involved jsonb default '[]'::jsonb;

update public.projects
set faculty_involved = coalesce(faculty_involved, '[]'::jsonb);

alter table public.projects
alter column faculty_involved set default '[]'::jsonb;

-- Expand entry_type constraint to support project proposals.
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'projects_entry_type_check'
  ) then
    alter table public.projects drop constraint projects_entry_type_check;
  end if;

  alter table public.projects
    add constraint projects_entry_type_check
    check (entry_type in ('project', 'program', 'project_proposal'));
end
$$;
-- ============================================================
-- END COPY: Project Proposal Module Fields
-- ============================================================

-- ============================================================
-- START COPY: Project Assistant Field (Registration + Proposal)
-- ============================================================
-- Shared proponents field for both Project Registration and Project Proposal forms.
alter table public.projects
add column if not exists project_assistants jsonb default '[]'::jsonb;

update public.projects
set project_assistants = coalesce(project_assistants, '[]'::jsonb);

alter table public.projects
alter column project_assistants set default '[]'::jsonb;
-- ============================================================
-- END COPY: Project Assistant Field (Registration + Proposal)
-- ============================================================

-- ============================================================
-- START COPY: Funding Report Fields + MOA Category Update
-- ============================================================
-- Funding reporting fields saved in a single JSONB payload for AB/B reporting.
alter table public.projects
add column if not exists funding_data jsonb default '{}'::jsonb;

update public.projects
set funding_data = coalesce(funding_data, '{}'::jsonb);

alter table public.projects
alter column funding_data set default '{}'::jsonb;

-- Restore project_no for report/use in project registration funding fields.
alter table public.projects
add column if not exists project_no text;

create unique index if not exists idx_projects_project_no_unique
on public.projects (project_no)
where project_no is not null;

-- Update allowed MOA categories used by the form.
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'projects_category_check'
  ) then
    alter table public.projects drop constraint projects_category_check;
  end if;

  alter table public.projects
    add constraint projects_category_check
    check (category in ('new', 'existing/ongoing', 'completed', 'terminated', 'proposal') or category is null);
end
$$;
-- ============================================================
-- END COPY: Funding Report Fields + MOA Category Update
-- ============================================================

-- ============================================================
-- START COPY: Supabase Schema Cache Reload (Funding Data)
-- ============================================================
-- Run this after adding/altering columns to refresh PostgREST schema cache.
notify pgrst, 'reload schema';
-- ============================================================
-- END COPY: Supabase Schema Cache Reload (Funding Data)
-- ============================================================

-- ============================================================
-- START COPY: Project No Cache Fix
-- ============================================================
-- If PostgREST schema cache is stale and project_no is reported missing, run this block.
alter table public.projects
add column if not exists project_no text;

create unique index if not exists idx_projects_project_no_unique
on public.projects (project_no)
where project_no is not null;

-- Force PostgREST to reload schema cache after adding/confirming project_no.
notify pgrst, 'reload schema';
-- ============================================================
-- END COPY: Project No Cache Fix
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

-- ============================================================
-- START COPY: Awards Module (College and Unit Coordinators)
-- ============================================================
create table if not exists public.awards (
  id uuid default gen_random_uuid() primary key,
  department text not null,
  extension_ppa jsonb not null default '[]'::jsonb,
  award_recognition_received text not null,
  donor text not null,
  level text not null,
  date_received date not null,
  remarks text,
  documents jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'awards_level_check'
  ) then
    alter table public.awards
      add constraint awards_level_check
      check (level in ('local', 'regional', 'national', 'international'));
  end if;
end
$$;

alter table public.awards enable row level security;

drop policy if exists "Users can view own awards" on public.awards;
create policy "Users can view own awards" on public.awards
  for select using (auth.uid() = created_by);

drop policy if exists "Users can create own awards" on public.awards;
create policy "Users can create own awards" on public.awards
  for insert with check (auth.uid() = created_by);

drop policy if exists "Users can update own awards" on public.awards;
create policy "Users can update own awards" on public.awards
  for update using (auth.uid() = created_by);

drop policy if exists "Users can delete own awards" on public.awards;
create policy "Users can delete own awards" on public.awards
  for delete using (auth.uid() = created_by);

create index if not exists idx_awards_created_by on public.awards (created_by);
create index if not exists idx_awards_department on public.awards (department);
create index if not exists idx_awards_date_received on public.awards (date_received desc);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'awards'
  ) then
    alter publication supabase_realtime add table public.awards;
  end if;
end
$$;
-- ============================================================
-- END COPY: Awards Module (College and Unit Coordinators)
-- ============================================================

-- ============================================================
-- START COPY: Student Involvement Module
-- ============================================================
create table if not exists public.student_involvement (
  id uuid default gen_random_uuid() primary key,
  college text not null default 'CEIT',
  department text not null,
  curricular_offering text not null,
  total_students integer not null,
  involved_students integer not null,
  percentage numeric(6,2) not null default 0,
  remarks text,
  documents jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'student_involvement_total_students_check'
  ) then
    alter table public.student_involvement
      add constraint student_involvement_total_students_check
      check (total_students > 0);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'student_involvement_involved_students_check'
  ) then
    alter table public.student_involvement
      add constraint student_involvement_involved_students_check
      check (involved_students >= 0 and involved_students <= total_students);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'student_involvement_percentage_check'
  ) then
    alter table public.student_involvement
      add constraint student_involvement_percentage_check
      check (percentage >= 0 and percentage <= 100);
  end if;
end
$$;

alter table public.student_involvement enable row level security;

drop policy if exists "Users can view own student involvement" on public.student_involvement;
create policy "Users can view own student involvement" on public.student_involvement
  for select using (auth.uid() = created_by);

drop policy if exists "Users can create own student involvement" on public.student_involvement;
create policy "Users can create own student involvement" on public.student_involvement
  for insert with check (auth.uid() = created_by);

drop policy if exists "Users can update own student involvement" on public.student_involvement;
create policy "Users can update own student involvement" on public.student_involvement
  for update using (auth.uid() = created_by);

drop policy if exists "Users can delete own student involvement" on public.student_involvement;
create policy "Users can delete own student involvement" on public.student_involvement
  for delete using (auth.uid() = created_by);

create index if not exists idx_student_involvement_created_by on public.student_involvement (created_by);
create index if not exists idx_student_involvement_department on public.student_involvement (department);
create index if not exists idx_student_involvement_curricular on public.student_involvement (curricular_offering);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'student_involvement'
  ) then
    alter publication supabase_realtime add table public.student_involvement;
  end if;
end
$$;
-- ============================================================
-- END COPY: Student Involvement Module
-- ============================================================

-- ============================================================
-- START COPY: Faculty Involvement in ESCE + Pool of Experts
-- ============================================================
create table if not exists public.faculty_involvement (
  id uuid default gen_random_uuid() primary key,
  department text not null,
  faculty_name text not null,
  sex text not null,
  rank text not null,
  employment_status text not null,
  avg_hours_per_week numeric(10,2) not null default 0,
  total_hours_period numeric(10,2) not null default 0,
  remarks text,
  documents jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'faculty_involvement_sex_check'
  ) then
    alter table public.faculty_involvement
      add constraint faculty_involvement_sex_check
      check (sex in ('male', 'female'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'faculty_involvement_employment_check'
  ) then
    alter table public.faculty_involvement
      add constraint faculty_involvement_employment_check
      check (employment_status in ('permanent', 'COS', 'JO'));
  end if;
end
$$;

alter table public.faculty_involvement enable row level security;

drop policy if exists "Users can view own faculty involvement" on public.faculty_involvement;
create policy "Users can view own faculty involvement" on public.faculty_involvement
  for select using (auth.uid() = created_by);

drop policy if exists "Users can create own faculty involvement" on public.faculty_involvement;
create policy "Users can create own faculty involvement" on public.faculty_involvement
  for insert with check (auth.uid() = created_by);

drop policy if exists "Users can update own faculty involvement" on public.faculty_involvement;
create policy "Users can update own faculty involvement" on public.faculty_involvement
  for update using (auth.uid() = created_by);

drop policy if exists "Users can delete own faculty involvement" on public.faculty_involvement;
create policy "Users can delete own faculty involvement" on public.faculty_involvement
  for delete using (auth.uid() = created_by);

create index if not exists idx_faculty_involvement_created_by on public.faculty_involvement (created_by);
create index if not exists idx_faculty_involvement_name on public.faculty_involvement (faculty_name);

create table if not exists public.pool_of_experts (
  id uuid default gen_random_uuid() primary key,
  department text not null,
  faculty_name text not null,
  sex text not null,
  rank text not null,
  employment_status text not null,
  educational_qualifications jsonb not null default '[]'::jsonb,
  specialization jsonb not null default '[]'::jsonb,
  other_expertise text,
  remarks text,
  documents jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pool_of_experts_sex_check'
  ) then
    alter table public.pool_of_experts
      add constraint pool_of_experts_sex_check
      check (sex in ('male', 'female'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pool_of_experts_employment_check'
  ) then
    alter table public.pool_of_experts
      add constraint pool_of_experts_employment_check
      check (employment_status in ('permanent', 'COS', 'JO'));
  end if;
end
$$;

alter table public.pool_of_experts enable row level security;

drop policy if exists "Users can view own pool experts" on public.pool_of_experts;
create policy "Users can view own pool experts" on public.pool_of_experts
  for select using (auth.uid() = created_by);

drop policy if exists "Users can create own pool experts" on public.pool_of_experts;
create policy "Users can create own pool experts" on public.pool_of_experts
  for insert with check (auth.uid() = created_by);

drop policy if exists "Users can update own pool experts" on public.pool_of_experts;
create policy "Users can update own pool experts" on public.pool_of_experts
  for update using (auth.uid() = created_by);

drop policy if exists "Users can delete own pool experts" on public.pool_of_experts;
create policy "Users can delete own pool experts" on public.pool_of_experts
  for delete using (auth.uid() = created_by);

create index if not exists idx_pool_of_experts_created_by on public.pool_of_experts (created_by);
create index if not exists idx_pool_of_experts_name on public.pool_of_experts (faculty_name);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'faculty_involvement'
  ) then
    alter publication supabase_realtime add table public.faculty_involvement;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'pool_of_experts'
  ) then
    alter publication supabase_realtime add table public.pool_of_experts;
  end if;
end
$$;
-- ============================================================
-- END COPY: Faculty Involvement in ESCE + Pool of Experts
-- ============================================================

-- ============================================================
-- START COPY: Technologies/Innovation Adapted and Commercialized
-- ============================================================
create table if not exists public.technologies_innovations (
  id uuid default gen_random_uuid() primary key,
  college text not null default 'CEIT',
  department text not null,
  curricular_offering text not null,
  technology_title text not null,
  year_develop integer not null,
  end_users_clientele jsonb not null default '[]'::jsonb,
  technology_generators text not null,
  status text not null,
  remarks text,
  documents jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'technologies_innovations_year_check'
  ) then
    alter table public.technologies_innovations
      add constraint technologies_innovations_year_check
      check (year_develop between 1000 and 9999);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'technologies_innovations_status_check'
  ) then
    alter table public.technologies_innovations
      add constraint technologies_innovations_status_check
      check (status in ('Commercialized', 'Multi-Modal Deployment', 'Pre-launch activities completed'));
  end if;
end
$$;

alter table public.technologies_innovations enable row level security;

drop policy if exists "Users can view own technologies innovations" on public.technologies_innovations;
create policy "Users can view own technologies innovations" on public.technologies_innovations
  for select using (auth.uid() = created_by);

drop policy if exists "Users can create own technologies innovations" on public.technologies_innovations;
create policy "Users can create own technologies innovations" on public.technologies_innovations
  for insert with check (auth.uid() = created_by);

drop policy if exists "Users can update own technologies innovations" on public.technologies_innovations;
create policy "Users can update own technologies innovations" on public.technologies_innovations
  for update using (auth.uid() = created_by);

drop policy if exists "Users can delete own technologies innovations" on public.technologies_innovations;
create policy "Users can delete own technologies innovations" on public.technologies_innovations
  for delete using (auth.uid() = created_by);

create index if not exists idx_technologies_innovations_created_by on public.technologies_innovations (created_by);
create index if not exists idx_technologies_innovations_department on public.technologies_innovations (department);
create index if not exists idx_technologies_innovations_year on public.technologies_innovations (year_develop);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'technologies_innovations'
  ) then
    alter publication supabase_realtime add table public.technologies_innovations;
  end if;
end
$$;
-- ============================================================
-- END COPY: Technologies/Innovation Adapted and Commercialized
-- ============================================================

-- ============================================================
-- START COPY: Ordinance or Resolutions
-- ============================================================
create table if not exists public.ordinance_resolutions (
  id uuid default gen_random_uuid() primary key,
  department text not null,
  curricular_offering text not null,
  extension_project_activity text not null,
  ordinance_resolution text not null,
  status text not null,
  date_approved date,
  remarks text,
  documents jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ordinance_resolutions_status_check'
  ) then
    alter table public.ordinance_resolutions
      add constraint ordinance_resolutions_status_check
      check (status in ('Submitted/Endorse', 'approved'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ordinance_resolutions_date_check'
  ) then
    alter table public.ordinance_resolutions
      add constraint ordinance_resolutions_date_check
      check (
        (status = 'approved' and date_approved is not null)
        or (status <> 'approved')
      );
  end if;
end
$$;

alter table public.ordinance_resolutions enable row level security;

drop policy if exists "Users can view own ordinance resolutions" on public.ordinance_resolutions;
create policy "Users can view own ordinance resolutions" on public.ordinance_resolutions
  for select using (auth.uid() = created_by);

drop policy if exists "Users can create own ordinance resolutions" on public.ordinance_resolutions;
create policy "Users can create own ordinance resolutions" on public.ordinance_resolutions
  for insert with check (auth.uid() = created_by);

drop policy if exists "Users can update own ordinance resolutions" on public.ordinance_resolutions;
create policy "Users can update own ordinance resolutions" on public.ordinance_resolutions
  for update using (auth.uid() = created_by);

drop policy if exists "Users can delete own ordinance resolutions" on public.ordinance_resolutions;
create policy "Users can delete own ordinance resolutions" on public.ordinance_resolutions
  for delete using (auth.uid() = created_by);

create index if not exists idx_ordinance_resolutions_created_by on public.ordinance_resolutions (created_by);
create index if not exists idx_ordinance_resolutions_department on public.ordinance_resolutions (department);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ordinance_resolutions'
  ) then
    alter publication supabase_realtime add table public.ordinance_resolutions;
  end if;
end
$$;
-- ============================================================
-- END COPY: Ordinance or Resolutions
-- ============================================================

-- ============================================================
-- START COPY: Trainings Management
-- ============================================================
create table if not exists public.trainings (
  id uuid default gen_random_uuid() primary key,
  college text not null default 'CEIT',
  department text not null,
  lead_units jsonb not null default '[]'::jsonb,
  contact_person text not null,
  contact_details text not null,
  related_curricular_offerings jsonb not null default '[]'::jsonb,
  training_title text not null,
  date_mode text not null default 'days',
  inclusive_dates jsonb not null default '[]'::jsonb,
  manual_hours numeric(6,2),
  venue_platform text not null,
  sdg_goals jsonb not null default '[]'::jsonb,
  training_category text not null,
  training_category_other text,
  training_mode text not null,
  faculty_male integer not null default 0,
  faculty_female integer not null default 0,
  non_academic_male integer not null default 0,
  non_academic_female integer not null default 0,
  cvsu_students_male integer not null default 0,
  cvsu_students_female integer not null default 0,
  partner_agencies_male integer not null default 0,
  partner_agencies_female integer not null default 0,
  participants_prefer_not_say integer not null default 0,
  participants_male_total integer not null default 0,
  participants_female_total integer not null default 0,
  participants_overall_total integer not null default 0,
  category_student integer not null default 0,
  category_farmer integer not null default 0,
  category_fisherfolk integer not null default 0,
  category_ag_technical integer not null default 0,
  category_government_employee integer not null default 0,
  category_private_employee integer not null default 0,
  category_4ps integer not null default 0,
  category_others integer not null default 0,
  category_total integer not null default 0,
  tvl_solo_parent integer not null default 0,
  tvl_4ps_members integer not null default 0,
  tvl_disabilities_count integer not null default 0,
  tvl_disability_breakdown jsonb not null default '[]'::jsonb,
  tvl_total_persons_trained integer not null default 0,
  conducted_days_count integer not null default 0,
  days_multiplier numeric(6,2) not null default 0,
  weighted_days_trained numeric(10,2) not null default 0,
  days_trained_per_weight numeric(10,2) not null default 0,
  total_trainees_surveyed integer not null default 0,
  rating_relevance integer not null default 3,
  rating_equality integer not null default 3,
  rating_timeliness integer not null default 3,
  total_clients_requesting_trainings integer not null default 0,
  total_requests_responded_next_3_days integer not null default 0,
  amount_charged_to_cvsu numeric(14,2) not null default 0,
  amount_charged_to_partner_agency numeric(14,2) not null default 0,
  partner_agencies jsonb not null default '[]'::jsonb,
  thematic_area jsonb not null default '[]'::jsonb,
  remarks text,
  documents jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trainings_date_mode_check'
  ) then
    alter table public.trainings
      add constraint trainings_date_mode_check
      check (date_mode in ('days', 'hours'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trainings_category_check'
  ) then
    alter table public.trainings
      add constraint trainings_category_check
      check (training_category in ('TVL', 'CE', 'GAD', 'AE', 'BE', 'OTHERS'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trainings_mode_check'
  ) then
    alter table public.trainings
      add constraint trainings_mode_check
      check (training_mode in ('FTF', 'O', 'H'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trainings_ratings_check'
  ) then
    alter table public.trainings
      add constraint trainings_ratings_check
      check (
        rating_relevance between 1 and 5 and
        rating_equality between 1 and 5 and
        rating_timeliness between 1 and 5
      );
  end if;
end
$$;

alter table public.trainings enable row level security;

drop policy if exists "Users can view own trainings" on public.trainings;
create policy "Users can view own trainings" on public.trainings
  for select using (auth.uid() = created_by);

drop policy if exists "Users can create own trainings" on public.trainings;
create policy "Users can create own trainings" on public.trainings
  for insert with check (auth.uid() = created_by);

drop policy if exists "Users can update own trainings" on public.trainings;
create policy "Users can update own trainings" on public.trainings
  for update using (auth.uid() = created_by);

drop policy if exists "Users can delete own trainings" on public.trainings;
create policy "Users can delete own trainings" on public.trainings
  for delete using (auth.uid() = created_by);

create index if not exists idx_trainings_created_by on public.trainings (created_by);
create index if not exists idx_trainings_department on public.trainings (department);
create index if not exists idx_trainings_training_category on public.trainings (training_category);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trainings'
  ) then
    alter publication supabase_realtime add table public.trainings;
  end if;
end
$$;
-- ============================================================
-- END COPY: Trainings Management
-- ============================================================
