-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'SDR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    alt_email VARCHAR(255),
    alt_phone VARCHAR(50),
    website VARCHAR(255),
    linkedin_company VARCHAR(255),
    linkedin_profile VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'New',
    type VARCHAR(50) NOT NULL DEFAULT 'Warm',
    source VARCHAR(100) NOT NULL,
    deal_value INTEGER DEFAULT 0,
    industry VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'Medium',
    notes TEXT,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pipeline_stages table
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL,
    color VARCHAR(50) DEFAULT 'bg-blue-500',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES pipeline_stages(id),
    value INTEGER NOT NULL DEFAULT 0,
    probability INTEGER DEFAULT 50,
    expected_close_date DATE,
    notes TEXT,
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'Task',
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT FALSE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activities table for audit trail
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pipeline stages
INSERT INTO pipeline_stages (name, position, color) VALUES
('New', 1, 'bg-blue-500'),
('Contacted', 2, 'bg-yellow-500'),
('Qualified', 3, 'bg-orange-500'),
('Demo Scheduled', 4, 'bg-purple-500'),
('Proposal Sent', 5, 'bg-green-500'),
('Negotiation', 6, 'bg-red-500'),
('Won', 7, 'bg-emerald-500'),
('Lost', 8, 'bg-gray-500');

-- Insert sample users
INSERT INTO users (email, name, role) VALUES
('sarah.johnson@company.com', 'Sarah Johnson', 'BDM'),
('mike.brown@company.com', 'Mike Brown', 'SDR'),
('lisa.davis@company.com', 'Lisa Davis', 'SDR');
