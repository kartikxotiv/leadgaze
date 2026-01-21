-- Create business_type table
CREATE TABLE IF NOT EXISTS public.business_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create industry table
CREATE TABLE IF NOT EXISTS public.industry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.business_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow all authenticated users to read)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'business_type' AND policyname = 'Allow authenticated read access to business_type'
    ) THEN
        CREATE POLICY "Allow authenticated read access to business_type" ON public.business_type
            FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'industry' AND policyname = 'Allow authenticated read access to industry'
    ) THEN
        CREATE POLICY "Allow authenticated read access to industry" ON public.industry
            FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
