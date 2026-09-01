-- ====================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) MIGRATION SCRIPT
-- Application: Raju Kshatriya Mahila Sangha (RKS Mahila Sangha)
-- Target Database: Supabase PostgreSQL
-- ====================================================================

-- 1. Enable RLS on all production database tables
ALTER TABLE IF EXISTS public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to allow clean re-execution
DROP POLICY IF EXISTS "Public events read access" ON public.events;
DROP POLICY IF EXISTS "Public settings read access" ON public.settings;
DROP POLICY IF EXISTS "Public site content read access" ON public.site_content;

-- 3. Define public read-only policies for public website resources
-- (Note: Express Backend API using service_role key automatically bypasses RLS policies securely!)

-- PUBLIC EVENTS VIEW POLICY: Allow public viewing of active events on public website
CREATE POLICY "Public events read access" 
ON public.events 
FOR SELECT 
USING (true);

-- PUBLIC SETTINGS VIEW POLICY: Allow public reading of organization settings
CREATE POLICY "Public settings read access" 
ON public.settings 
FOR SELECT 
USING (true);

-- PUBLIC SITE CONTENT VIEW POLICY: Allow public reading of site content
CREATE POLICY "Public site content read access" 
ON public.site_content 
FOR SELECT 
USING (true);

-- Sensitive tables (admins, users, members, payments, event_registrations, webhook_events)
-- have NO public anon policies defined. This strictly blocks direct REST API data extraction
-- via anon API keys, protecting passwords, OTPs, donor details, and member PII!
