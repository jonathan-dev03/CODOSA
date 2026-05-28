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
  OR (get_my_role() = 'censeur' AND (get_my_campus() = campus OR get_my_campus() = 'both' OR campus = 'both' OR get_my_campus() IN ('fondamantal', 'fondamentale') AND campus IN ('fondamantal', 'fondamentale')))
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
  OR (get_my_role() IN ('censeur', 'resp_pedagogique') AND (campus = get_my_campus() OR get_my_campus() = 'both' OR (campus IN ('fondamantal', 'fondamentale') AND get_my_campus() IN ('fondamantal', 'fondamentale'))))
  OR (published = true AND (get_my_campus() = campus OR get_my_campus() = 'both' OR (campus IN ('fondamantal', 'fondamentale') AND get_my_campus() IN ('fondamantal', 'fondamentale'))))
);

-- Homework
CREATE POLICY "homework_professor" ON homework FOR ALL USING (
  professor_id = auth.uid() 
  OR get_my_role() IN ('super_admin','directeur')
  OR (get_my_role() = 'censeur' AND (campus = get_my_campus() OR get_my_campus() = 'both' OR (campus IN ('fondamantal', 'fondamentale') AND get_my_campus() IN ('fondamantal', 'fondamentale'))))
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
  OR get_my_role() IN ('super_admin','directeur', 'censeur', 'resp_pedagogique')
);

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
  get_my_role() IN ('super_admin', 'directeur', 'censeur', 'resp_pedagogique')
  OR auth.uid() = student_id
);

