-- ====================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) MIGRATION SCRIPT
-- Application: राजू क्षत्रिय महिला संघ (RKS Mahila Sangha)
-- Target Database: Supabase PostgreSQL
-- ====================================================================

-- 1. Enable RLS on all production database tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 2. Define standard security policies
-- Note: Express Backend API using service_role key automatically bypasses RLS policies!

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
