-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  email_verified BOOLEAN DEFAULT FALSE,
  status_id UUID REFERENCES public.users_config(id),
  last_visited_organization_id UUID,
  last_login TIMESTAMPTZ,
  login_attempts INTEGER DEFAULT 0,
  lock_until TIMESTAMPTZ,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security for the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- (Optional) Add RLS policies as per your access requirements
-- Example policy for all roles to read and write
CREATE POLICY "Allow all" ON public.users
  FOR ALL
  TO authenticated, anon
  USING (true);

