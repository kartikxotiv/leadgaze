



CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role_id UUID NOT NULL REFERENCES organization_roles(id) ON DELETE RESTRICT,
  invitation_token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users(user_id) ON DELETE SET NULL,
  message TEXT NULL,
  status_id UUID NOT NULL REFERENCES users_config(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ NULL,
  accepted_by_user_id UUID NULL REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_invitations_org_email_unique UNIQUE (organization_id, email)
);


CREATE INDEX IF NOT EXISTS idx_user_invitations_org ON user_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON user_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);


CREATE TABLE IF NOT EXISTS org_user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  last_login TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_user_accounts_org_email_unique UNIQUE (organization_id, email)
);


CREATE INDEX IF NOT EXISTS idx_org_user_accounts_email ON org_user_accounts(email);
CREATE INDEX IF NOT EXISTS idx_org_user_accounts_org ON org_user_accounts(organization_id);


SELECT 'user_invitations' as table_name, COUNT(*) as record_count FROM user_invitations
UNION ALL
SELECT 'org_user_accounts' as table_name, COUNT(*) as record_count FROM org_user_accounts;


SELECT 'invitation_status configs:' as info;
SELECT entity_type, entity_value, id FROM users_config WHERE entity_type = 'invitation_status';

SELECT 'organization_roles:' as info;
SELECT role, display_name, id FROM organization_roles;

SELECT 'Setup complete!' as status;
