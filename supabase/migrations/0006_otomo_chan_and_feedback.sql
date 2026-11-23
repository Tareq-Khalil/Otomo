-- ==============================================================================
-- Migration 0006: Otomo-chan Configuration, Knowledge, Feedback, and Admin Roles
-- ==============================================================================

-- 1. User Roles table for secure authorization
create table if not exists public.user_roles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'admin')) default 'student',
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

-- Function to check if the current user is an administrator
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- RLS for user_roles: users can read their own role; only admins can edit roles
drop policy if exists "user_roles: read own" on public.user_roles;
create policy "user_roles: read own" on public.user_roles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "user_roles: admin manage" on public.user_roles;
create policy "user_roles: admin manage" on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- Auto-assign default 'student' role on signup if not already assigned
create or replace function public.handle_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles (id, role)
  values (new.id, 'student')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_role on auth.users;
create trigger on_auth_user_role after insert on auth.users
  for each row execute function public.handle_user_role();

-- 2. Otomo-chan versioned configurations table
create table if not exists public.otomo_configurations (
  version integer primary key,
  status text not null check (status in ('draft', 'published', 'archived')),
  identity jsonb not null default '{}'::jsonb,
  personality jsonb not null default '{}'::jsonb,
  brain jsonb not null default '{}'::jsonb,
  voice jsonb not null default '{}'::jsonb,
  memory_rules jsonb not null default '{}'::jsonb,
  tools jsonb not null default '{}'::jsonb,
  changelog text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.otomo_configurations enable row level security;

-- Read policy: Anyone can read published configurations; Admins can read all configurations
drop policy if exists "otomo_configurations: read" on public.otomo_configurations;
create policy "otomo_configurations: read" on public.otomo_configurations
  for select using (status = 'published' or public.is_admin());

-- Write policy: Only admins can insert, update, or delete configurations
drop policy if exists "otomo_configurations: admin insert" on public.otomo_configurations;
create policy "otomo_configurations: admin insert" on public.otomo_configurations
  for insert with check (public.is_admin());

drop policy if exists "otomo_configurations: admin update" on public.otomo_configurations;
create policy "otomo_configurations: admin update" on public.otomo_configurations
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "otomo_configurations: admin delete" on public.otomo_configurations;
create policy "otomo_configurations: admin delete" on public.otomo_configurations
  for delete using (public.is_admin());

-- Insert default initial published configuration (v1)
insert into public.otomo_configurations (
  version, status, identity, personality, brain, voice, memory_rules, tools, changelog, published_at
) values (
  1,
  'published',
  '{
    "name": "Otomo-chan",
    "title": "Anime Student Companion",
    "description": "Friendly, intelligent, Japanese/anime-inspired student companion for E-JUST students.",
    "defaultLanguage": "en"
  }'::jsonb,
  '{
    "friendliness": 90,
    "playfulness": 70,
    "humor": 40,
    "formality": 45,
    "enthusiasm": 75,
    "responseLength": "balanced",
    "explanationDepth": "deep",
    "emojiUsage": "moderate",
    "customInstructions": "You are Otomo-chan, a friendly, intelligent anime companion for E-JUST university students. You combine the sharp intellect and subtle wit of Kurisu, the refined elegance of Kaguya, and a touch of playful curiosity. Always be encouraging, clear, and empathetic."
  }'::jsonb,
  '{
    "defaultModel": "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    "fallbackModel": "offline-knowledge-engine",
    "temperature": 0.7,
    "top_p": 0.9,
    "maxTokens": 1024,
    "systemPromptTemplate": "Personality: {personality}\nStudent Context: {student_context}\nMemories: {memories}\nTools Available: {tools}"
  }'::jsonb,
  '{
    "voiceIdentity": "Otomo-chan Signature (Kurisu/Kaguya Hybrid)",
    "engine": "webspeech",
    "defaultPitch": 1.02,
    "defaultRate": 1.0,
    "defaultVolume": 1.0,
    "expressiveness": 75,
    "deliveryStyles": {
      "casual": { "rate": 1.02, "pitch": 1.02 },
      "academic": { "rate": 0.94, "pitch": 1.00 },
      "focus": { "rate": 0.90, "pitch": 0.98, "volume": 0.85 },
      "discovery": { "rate": 1.06, "pitch": 1.05 },
      "serious": { "rate": 0.92, "pitch": 0.97 },
      "lighthearted": { "rate": 1.04, "pitch": 1.03 }
    }
  }'::jsonb,
  '{
    "extractionEnabled": true,
    "categories": ["preference", "academic", "project", "goal", "general"],
    "maxStoredMemories": 50,
    "retentionPolicy": "consolidate"
  }'::jsonb,
  '{
    "enabledTools": [
      "lookup_schedule",
      "lookup_tasks",
      "lookup_exams",
      "create_task",
      "query_knowledge",
      "focus_timer_status"
    ]
  }'::jsonb,
  'Initial production release of Otomo-chan configuration system.',
  now()
) on conflict (version) do nothing;

-- 3. University Knowledge Base table
create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  faculty text not null default 'all',
  level integer check (level is null or (level between 1 and 5)),
  course_code text check (course_code is null or char_length(course_code) <= 20),
  category text not null default 'general' check (category in ('general', 'faculty', 'course', 'exam', 'regulation', 'campus')),
  content text not null check (char_length(content) > 0),
  tags text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_documents enable row level security;

-- Knowledge documents are readable by any authenticated user and guests
drop policy if exists "knowledge_documents: read" on public.knowledge_documents;
create policy "knowledge_documents: read" on public.knowledge_documents
  for select using (true);

-- Knowledge documents can only be created/updated/deleted by admins
drop policy if exists "knowledge_documents: admin insert" on public.knowledge_documents;
create policy "knowledge_documents: admin insert" on public.knowledge_documents
  for insert with check (public.is_admin());

drop policy if exists "knowledge_documents: admin update" on public.knowledge_documents;
create policy "knowledge_documents: admin update" on public.knowledge_documents
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "knowledge_documents: admin delete" on public.knowledge_documents;
create policy "knowledge_documents: admin delete" on public.knowledge_documents
  for delete using (public.is_admin());

-- 4. Feedback & Complaints System
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  user_name text,
  type text not null check (type in ('suggestion', 'complaint', 'bug', 'other')),
  subject text not null check (char_length(btrim(subject)) between 1 and 150),
  description text not null check (char_length(btrim(description)) between 1 and 5000),
  attachment_url text,
  contact_pref text default 'in_app',
  status text not null check (status in ('new', 'under_review', 'in_progress', 'responded', 'resolved', 'rejected')) default 'new',
  admin_response text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feedback_user_idx on public.feedback_submissions (user_id);
create index if not exists feedback_status_idx on public.feedback_submissions (status);

alter table public.feedback_submissions enable row level security;

-- Attach authenticated submissions to the signed-in user before RLS is evaluated.
create or replace function public.set_feedback_owner()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.user_id := auth.uid();
  return new;
end $$;

drop trigger if exists on_feedback_set_owner on public.feedback_submissions;
create trigger on_feedback_set_owner
  before insert on public.feedback_submissions
  for each row execute function public.set_feedback_owner();

-- Students can insert feedback for themselves or anonymously.
drop policy if exists "feedback: insert own" on public.feedback_submissions;
create policy "feedback: insert own" on public.feedback_submissions
  for insert with check (
    (auth.uid() is null and user_id is null)
    or user_id = auth.uid()
  );

-- Students can view only their own feedback; Admins can view all feedback
drop policy if exists "feedback: select own or admin" on public.feedback_submissions;
create policy "feedback: select own or admin" on public.feedback_submissions
  for select using (user_id = auth.uid() or public.is_admin());

-- Only admins can update status or write an admin response
drop policy if exists "feedback: admin update" on public.feedback_submissions;
create policy "feedback: admin update" on public.feedback_submissions
  for update using (public.is_admin()) with check (public.is_admin());

-- 5. Storage Bucket for feedback attachments (if storage schema exists)
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('feedback_attachments', 'feedback_attachments', false)
    on conflict (id) do nothing;
    update storage.buckets set public = false
      where id = 'feedback_attachments';
  end if;
end $$;

-- Private feedback attachments: users may manage only their own folder; admins may read all.
drop policy if exists "feedback attachments: upload own" on storage.objects;
create policy "feedback attachments: upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'feedback_attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "feedback attachments: read own or admin" on storage.objects;
create policy "feedback attachments: read own or admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

drop policy if exists "feedback attachments: delete own" on storage.objects;
create policy "feedback attachments: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'feedback_attachments'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
