-- Create the demo submissions table in public schema
CREATE TABLE IF NOT EXISTS public.demo_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    work_email TEXT NOT NULL,
    company TEXT NOT NULL,
    company_size TEXT NOT NULL,
    heard_about TEXT NOT NULL,
    is_agency BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) to secure the submissions
ALTER TABLE public.demo_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/anonymous users) to insert a submission (public lead capture form)
CREATE POLICY "Enable public inserts for demo submissions" 
ON public.demo_submissions 
FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow only authenticated users (admins) to select/read the submissions
CREATE POLICY "Enable authenticated select for demo submissions" 
ON public.demo_submissions 
FOR SELECT 
TO authenticated 
USING (true);
