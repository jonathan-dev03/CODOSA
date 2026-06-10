-- SQL Migration for CODOSA
-- Execute this in the Supabase SQL Editor

-- 1. Create Enums/Types if needed or use text constraints
-- 2. CREATE TABLES

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  campus TEXT CHECK (campus IN ('fondamantal', 'fondamentale', 'secondaire', 'both')),
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  level TEXT NOT NULL,
  section TEXT NOT NULL,
  campus TEXT CHECK (campus IN ('fondamantal', 'secondaire')),
  capacity INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  classroom_id UUID REFERENCES classrooms(id),
  campus TEXT CHECK (campus IN ('fondamantal', 'secondaire')),
  student_code TEXT UNIQUE NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  a_echoue BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Professor Profiles table
CREATE TABLE IF NOT EXISTS professor_profiles (
  id UUID PRIMARY KEY REFERENCES users(id),
  subjects TEXT[] DEFAULT '{}',
  campus TEXT CHECK (campus IN ('fondamantal', 'secondaire', 'both')),
  availability JSONB DEFAULT '{}',
  profile_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campus TEXT CHECK (campus IN ('fondamantal', 'secondaire')),
  week_start_date DATE NOT NULL,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedule Slots table
CREATE TABLE IF NOT EXISTS schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES users(id),
  classroom_id UUID REFERENCES classrooms(id),
  subject TEXT NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discipline Logs table
CREATE TABLE IF NOT EXISTS discipline_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  campus TEXT CHECK (campus IN ('fondamantal', 'secondaire')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_type TEXT CHECK (incident_type IN ('absence', 'retard', 'indiscipline', 'devoir_non_rendu', 'autre')),
  description TEXT,
  severity INT CHECK (severity BETWEEN 1 AND 3),
  logged_by UUID REFERENCES users(id),
  academic_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Professor Attendance table
CREATE TABLE IF NOT EXISTS professor_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID REFERENCES users(id),
  schedule_slot_id UUID REFERENCES schedule_slots(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')),
  noted_by UUID REFERENCES users(id),
  notes TEXT,
  campus TEXT CHECK (campus IN ('fondamantal', 'secondaire')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Homework table
CREATE TABLE IF NOT EXISTS homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID REFERENCES users(id),
  classroom_id UUID REFERENCES classrooms(id),
  campus TEXT CHECK (campus IN ('fondamantal', 'secondaire')),
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  homework_id UUID REFERENCES homework(id),
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('homework_reminder', 'announcement', 'schedule_published', 'article_status', 'account_approved')),
  read BOOLEAN DEFAULT false,
  send_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target TEXT CHECK (target IN ('all', 'teachers', 'students', 'admins')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Journal Articles table
CREATE TABLE IF NOT EXISTS journal_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES users(id),
  author_role TEXT,
  category TEXT CHECK (category IN ('article', 'gallery', 'event', 'message_directeur')),
  status TEXT CHECK (status IN ('pending', 'published', 'rejected')) DEFAULT 'pending',
  rejection_reason TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INITIAL DATA: Classrooms
INSERT INTO classrooms (name, level, section, campus) VALUES
('7èA', '7è Ane', 'A', 'fondamantal'),
('7èB', '7è Ane', 'B', 'fondamantal'),
('7èC', '7è Ane', 'C', 'fondamantal'),
('7èD', '7è Ane', 'D', 'fondamantal'),
('8èA', '8è Ane', 'A', 'fondamantal'),
('8èB', '8è Ane', 'B', 'fondamantal'),
('8èC', '8è Ane', 'C', 'fondamantal'),
('9èA', '9è Ane', 'A', 'fondamantal'),
('9èB', '9è Ane', 'B', 'fondamantal'),
('NS1A', 'NS1', 'A', 'secondaire'),
('NS1B', 'NS1', 'B', 'secondaire'),
('NS2A', 'NS2', 'A', 'secondaire'),
('NS2B', 'NS2', 'B', 'secondaire'),
('NS3A', 'NS3', 'A', 'secondaire'),
('NS3B', 'NS3', 'B', 'secondaire'),
('NS4A', 'NS4', 'A', 'secondaire'),
('NS4B', 'NS4', 'B', 'secondaire')
ON CONFLICT (name) DO NOTHING;

-- 4. RLS POLICIES

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE discipline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_articles ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION get_my_role() RETURNS text AS $$ SELECT role FROM users WHERE id = auth.uid(); $$ LANGUAGE sql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION get_my_campus() RETURNS text AS $$ SELECT campus FROM users WHERE id = auth.uid(); $$ LANGUAGE sql SECURITY DEFINER;

-- Users policies
CREATE POLICY "user_read_profile" ON users FOR SELECT USING (
  auth.uid() = id 
  OR get_my_role() IN ('super_admin', 'directeur')
  OR (get_my_role() IN ('censeur', 'resp_discipline') AND (get_my_campus() = campus OR get_my_campus() = 'both' OR campus = 'both' OR get_my_campus() IN ('fondamantal', 'fondamentale') AND campus IN ('fondamantal', 'fondamentale')))
);
CREATE POLICY "user_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- Discipline logs
CREATE POLICY "discipline_access" ON discipline_logs FOR ALL USING (
  get_my_role() IN ('super_admin','directeur')
  OR (get_my_role() IN ('censeur', 'resp_pedagogique', 'resp_discipline') AND (campus = get_my_campus() OR (campus IN ('fondamantal', 'fondamentale') AND get_my_campus() IN ('fondamantal', 'fondamentale'))))
  OR (get_my_role() = 'eleve' AND student_id = auth.uid())
);

-- Schedules
CREATE POLICY "schedule_read" ON schedules FOR SELECT USING (
  get_my_role() IN ('super_admin','directeur')
  OR (get_my_role() IN ('censeur', 'resp_pedagogique', 'resp_discipline') AND (campus = get_my_campus() OR get_my_campus() = 'both' OR (campus IN ('fondamantal', 'fondamentale') AND get_my_campus() IN ('fondamantal', 'fondamentale'))))
  OR (published = true AND (get_my_campus() = campus OR get_my_campus() = 'both' OR (campus IN ('fondamantal', 'fondamentale') AND get_my_campus() IN ('fondamantal', 'fondamentale'))))
);

-- Homework
CREATE POLICY "homework_professor" ON homework FOR ALL USING (
  professor_id = auth.uid() 
  OR get_my_role() IN ('super_admin','directeur')
  OR (get_my_role() IN ('censeur', 'resp_discipline') AND (campus = get_my_campus() OR get_my_campus() = 'both' OR (campus IN ('fondamantal', 'fondamentale') AND get_my_campus() IN ('fondamantal', 'fondamentale'))))
);
CREATE POLICY "homework_student_read" ON homework FOR SELECT USING (
  get_my_role() = 'eleve' 
  AND (campus = get_my_campus() OR (campus IN ('fondamantal', 'fondamentale') AND get_my_campus() IN ('fondamantal', 'fondamentale')))
);

-- Notifications
CREATE POLICY "notif_own" ON notifications FOR ALL USING ( user_id = auth.uid() );

-- Announcements
CREATE POLICY "announcements_read" ON announcements FOR SELECT USING (
  target = 'all'
  OR (target = 'teachers'  AND get_my_role() = 'professeur')
  OR (target = 'students'  AND get_my_role() = 'eleve')
  OR (target IN ('admins') AND get_my_role() NOT IN ('eleve', 'professeur'))
);

-- Journal
CREATE POLICY "journal_read" ON journal_articles FOR SELECT USING (
  status = 'published'
  OR author_id = auth.uid()
  OR get_my_role() IN ('super_admin','directeur', 'censeur', 'resp_pedagogique', 'resp_discipline')
);
CREATE POLICY "journal_write" ON journal_articles FOR ALL USING (true);

-- Classrooms columns update for new system
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS class_level TEXT;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS room_code TEXT;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS max_capacity INTEGER;

-- student_classroom table
CREATE TABLE IF NOT EXISTS student_classroom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive', 'alumni')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE student_classroom ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_classroom_select" ON student_classroom FOR SELECT USING (true);
CREATE POLICY "student_classroom_all" ON student_classroom FOR ALL USING (
  get_my_role() IN ('super_admin', 'directeur', 'censeur', 'resp_pedagogique', 'resp_discipline')
  OR auth.uid() = student_id
);


-- Homework Completions
CREATE TABLE IF NOT EXISTS homework_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  completed_by_student_or_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'completed', -- 'completed', 'pending'
  grade_or_remarks TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE homework_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "homework_completions_read" ON homework_completions FOR SELECT USING (true);
CREATE POLICY "homework_completions_write" ON homework_completions FOR ALL USING (true);


-- Add gender to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('M', 'F')) DEFAULT 'M';

-- School Info table
CREATE TABLE IF NOT EXISTS school_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE school_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_info_read" ON school_info FOR SELECT USING (true);
CREATE POLICY "school_info_write" ON school_info FOR ALL USING (true);

-- Attendance Records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'absent_motive')) NOT NULL,
  recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_records_read" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "attendance_records_write" ON attendance_records FOR ALL USING (true);


-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  campus TEXT CHECK (campus IN ('fondamental', 'secondaire', 'both')) NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_read" ON events FOR SELECT USING (true);
CREATE POLICY "events_write" ON events FOR ALL USING (true);


-- Chat System tables
CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type TEXT CHECK (type IN ('direct', 'group')) NOT NULL,
  campus TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_by UUID[] DEFAULT '{}'::UUID[]
);

-- Enable RLS
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Turn on realtime for chat tables
-- We handle potential publication addition errors gracefully
CREATE OR REPLACE FUNCTION add_to_realtime_pub() RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_members;
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Handle gracefully
END;
$$ LANGUAGE plpgsql;

SELECT add_to_realtime_pub();

-- RLS policies for chat_channels
CREATE POLICY "chat_channels_select" ON chat_channels FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_members WHERE channel_id = id AND user_id = auth.uid())
  OR (
    type = 'group'
    AND (
      get_my_role() IN ('super_admin', 'directeur')
      OR (
        (campus = get_my_campus() OR (campus = 'fondamental' AND get_my_campus() IN ('fondamantal', 'fondamentale')))
        AND (
          (name NOT ILIKE '%Direction%' OR get_my_role() IN ('super_admin', 'directeur', 'censeur', 'resp_pedagogique', 'resp_discipline'))
        )
      )
    )
  )
);

CREATE POLICY "chat_channels_insert" ON chat_channels FOR INSERT WITH CHECK (
  get_my_role() IN ('super_admin', 'directeur', 'censeur', 'resp_pedagogique', 'resp_discipline', 'secretaire', 'professeur')
);

-- RLS policies for chat_members
CREATE POLICY "chat_members_all" ON chat_members FOR ALL USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM chat_channels WHERE id = channel_id)
);

-- RLS policies for chat_messages
CREATE POLICY "chat_messages_select" ON chat_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chat_channels WHERE id = chat_messages.channel_id)
);

CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM chat_channels
    WHERE id = chat_messages.channel_id
    AND (
      type = 'direct'
      OR (
        type = 'group'
        AND (
          get_my_role() IN ('super_admin', 'directeur')
          OR (
            (name ILIKE '%Général%' AND get_my_role() IN ('censeur', 'resp_pedagogique', 'resp_discipline', 'secretaire', 'professeur'))
            OR (name ILIKE '%Professeur%' AND get_my_role() = 'professeur')
            OR (name ILIKE '%Direction%' AND get_my_role() IN ('censeur', 'resp_pedagogique', 'resp_discipline'))
          )
        )
      )
    )
  )
);

CREATE POLICY "chat_messages_delete" ON chat_messages FOR DELETE USING (
  get_my_role() IN ('super_admin', 'directeur')
);

-- Extra schema customisations
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS needs_password_reset BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Dynamic registration role slot count checking functions
-- Check if a role slot is available for a campus
CREATE OR REPLACE FUNCTION check_role_slot_available(check_role text, check_campus text)
RETURNS boolean AS $$
DECLARE
  current_count integer;
  max_limit integer;
  normalized_campus text;
BEGIN
  -- Normalize campus to handle 'fondamantal' / 'fondamentale'
  IF check_campus IN ('fondamantal', 'fondamentale') THEN
    normalized_campus := 'fondamentale';
  ELSE
    normalized_campus := check_campus;
  END IF;

  -- Map limits
  IF check_role = 'directeur' THEN
    max_limit := 1;
  ELSIF check_role = 'censeur' THEN
    max_limit := 1;
  ELSIF check_role = 'resp_pedagogique' THEN
    max_limit := 1;
  ELSIF check_role = 'secretaire' THEN
    -- Secretaire is max 1 total (covers both campuses)
    max_limit := 1;
  ELSIF check_role = 'resp_discipline' THEN
    max_limit := 2;
  ELSE
    -- Unlimited roles
    RETURN true;
  END IF;

  -- Count existing accounts that are NOT deleted and NOT deactivated
  IF check_role = 'secretaire' THEN
    SELECT COUNT(*) INTO current_count 
    FROM public.users 
    WHERE role = 'secretaire' AND status != 'deactivated';
  ELSIF check_role = 'resp_discipline' THEN
    -- Count per campus
    SELECT COUNT(*) INTO current_count 
    FROM public.users 
    WHERE role = 'resp_discipline' 
      AND (campus = check_campus OR (check_campus IN ('fondamantal', 'fondamentale') AND campus IN ('fondamantal', 'fondamentale')))
      AND status != 'deactivated';
  ELSE
    -- directeur, censeur, resp_pedagogique are per campus
    SELECT COUNT(*) INTO current_count 
    FROM public.users 
    WHERE role = check_role 
      AND (campus = check_campus OR (check_campus IN ('fondamantal', 'fondamentale') AND campus IN ('fondamantal', 'fondamentale')))
      AND status != 'deactivated';
  END IF;

  RETURN current_count < max_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Get available roles for a campus (public security definer function)
CREATE OR REPLACE FUNCTION get_available_roles_for_campus(target_campus text)
RETURNS TABLE (role_name text, is_available boolean) AS $$
BEGIN
  RETURN QUERY 
  SELECT 'eleve'::text, true
  UNION ALL SELECT 'professeur'::text, true
  UNION ALL SELECT 'directeur'::text, check_role_slot_available('directeur', target_campus)    
  UNION ALL SELECT 'censeur'::text, check_role_slot_available('censeur', target_campus)      
  UNION ALL SELECT 'resp_pedagogique'::text, check_role_slot_available('resp_pedagogique', target_campus)
  UNION ALL SELECT 'secretaire'::text, check_role_slot_available('secretaire', target_campus)
  UNION ALL SELECT 'resp_discipline'::text, check_role_slot_available('resp_discipline', target_campus);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. RESET PASSWORD (accessible by super_admin and directeur)
CREATE OR REPLACE FUNCTION admin_reset_password(target_user_id uuid, temp_password text)
RETURNS void AS $$
BEGIN
  IF (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('super_admin', 'directeur') THEN
    RAISE EXCEPTION 'Aksyon sa a rezève pou Direktè oswa Super Admin sèlman';
  END IF;

  UPDATE auth.users 
  SET encrypted_password = crypt(temp_password, gen_salt('bf'))
  WHERE id = target_user_id;

  UPDATE public.users 
  SET needs_password_reset = true
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. CHANGE EMAIL (accessible by super_admin and directeur)
CREATE OR REPLACE FUNCTION admin_change_email(target_user_id uuid, new_email text)
RETURNS void AS $$
BEGIN
  IF (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('super_admin', 'directeur') THEN
    RAISE EXCEPTION 'Aksyon sa a rezève pou Direktè oswa Super Admin sèlman';
  END IF;

  IF NOT (new_email LIKE '%@codosapv.com') THEN
    RAISE EXCEPTION 'Imel la dwe fennen nan @codosapv.com sèlman';
  END IF;

  UPDATE auth.users 
  SET email = new_email, email_confirmed_at = now()
  WHERE id = target_user_id;

  UPDATE public.users 
  SET email = new_email 
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. DELETE ACCOUNT (super_admin only)
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id uuid)
RETURNS void AS $$
BEGIN
  IF (SELECT role FROM public.users WHERE id = auth.uid()) != 'super_admin' THEN
    RAISE EXCEPTION 'Aksyon sa a rezève pou Super Admin sèlman';
  END IF;

  -- 1. Foreign Key nullable-outs for Kept tables
  UPDATE public.discipline_logs SET logged_by = NULL WHERE logged_by = target_user_id;
  UPDATE public.professor_attendance SET noted_by = NULL WHERE noted_by = target_user_id;
  UPDATE public.professor_attendance SET professor_id = NULL WHERE professor_id = target_user_id;
  UPDATE public.attendance_records SET recorded_by = NULL WHERE recorded_by = target_user_id;
  UPDATE public.school_info SET updated_by = NULL WHERE updated_by = target_user_id;
  UPDATE public.events SET created_by = NULL WHERE created_by = target_user_id;
  UPDATE public.homework_completions SET completed_by_student_or_teacher_id = NULL WHERE completed_by_student_or_teacher_id = target_user_id;

  -- 2. Deletions of associated records
  DELETE FROM public.professor_profiles WHERE id = target_user_id;
  DELETE FROM public.schedules WHERE created_by = target_user_id;
  DELETE FROM public.schedule_slots WHERE professor_id = target_user_id;
  DELETE FROM public.homework WHERE professor_id = target_user_id;
  DELETE FROM public.notifications WHERE user_id = target_user_id;
  DELETE FROM public.announcements WHERE created_by = target_user_id;
  DELETE FROM public.journal_articles WHERE author_id = target_user_id;
  DELETE FROM public.student_classroom WHERE student_id = target_user_id OR student_id IN (SELECT id FROM public.students WHERE user_id = target_user_id);
  DELETE FROM public.students WHERE user_id = target_user_id OR id = target_user_id;
  DELETE FROM public.chat_members WHERE user_id = target_user_id;
  DELETE FROM public.chat_messages WHERE sender_id = target_user_id;

  -- 3. Delete users table and auth.users
  DELETE FROM public.users WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;





