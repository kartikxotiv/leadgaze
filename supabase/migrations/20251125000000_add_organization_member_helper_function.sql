CREATE OR REPLACE FUNCTION add_organization_member(
  p_user_email VARCHAR(255) DEFAULT NULL,
  p_organization_name VARCHAR(255) DEFAULT NULL,
  p_role_name VARCHAR(100) DEFAULT NULL,
  p_invited_by_email VARCHAR(255) DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_role_id UUID DEFAULT NULL,
  p_invited_by_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_role_id UUID;
  v_invited_by_id UUID;
  v_member_id UUID;
BEGIN
  IF p_user_id IS NOT NULL THEN
    v_user_id := p_user_id;
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = v_user_id) THEN
      RAISE EXCEPTION 'User with ID % not found', p_user_id;
    END IF;
  ELSIF p_user_email IS NOT NULL THEN
    SELECT user_id INTO v_user_id
    FROM users
    WHERE email = LOWER(TRIM(p_user_email));
    
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'User with email % not found', p_user_email;
    END IF;
  ELSE
    RAISE EXCEPTION 'Either user_id or user_email must be provided';
  END IF;
  
  IF p_organization_id IS NOT NULL THEN
    v_org_id := p_organization_id;
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE organization_id = v_org_id) THEN
      RAISE EXCEPTION 'Organization with ID % not found', p_organization_id;
    END IF;
  ELSIF p_organization_name IS NOT NULL THEN
    SELECT organization_id INTO v_org_id
    FROM organizations
    WHERE name = p_organization_name;
    
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Organization % not found', p_organization_name;
    END IF;
  ELSE
    RAISE EXCEPTION 'Either organization_id or organization_name must be provided';
  END IF;
  
  IF p_role_id IS NOT NULL THEN
    v_role_id := p_role_id;
    IF NOT EXISTS (SELECT 1 FROM organization_roles WHERE id = v_role_id AND is_active = true) THEN
      RAISE EXCEPTION 'Role with ID % not found or not active', p_role_id;
    END IF;
  ELSIF p_role_name IS NOT NULL THEN
    SELECT id INTO v_role_id
    FROM organization_roles
    WHERE role = p_role_name AND is_active = true
    LIMIT 1;
    
    IF v_role_id IS NULL THEN
      RAISE EXCEPTION 'Role % not found or not active', p_role_name;
    END IF;
  ELSE
    RAISE EXCEPTION 'Either role_id or role_name must be provided';
  END IF;
  
  IF p_invited_by_id IS NOT NULL THEN
    v_invited_by_id := p_invited_by_id;
  ELSIF p_invited_by_email IS NOT NULL THEN
    SELECT user_id INTO v_invited_by_id
    FROM users
    WHERE email = LOWER(TRIM(p_invited_by_email));
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM user_organizations
    WHERE user_id = v_user_id AND organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'User is already a member of this organization';
  END IF;
  
  INSERT INTO user_organizations (
    user_id,
    organization_id,
    role_id,
    status,
    joined_at,
    invited_by
  ) VALUES (
    v_user_id,
    v_org_id,
    v_role_id,
    'active',
    NOW(),
    v_invited_by_id
  ) RETURNING id INTO v_member_id;
  
  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW organization_members_view AS
SELECT 
  uo.id,
  uo.user_id,
  uo.organization_id,
  uo.role_id,
  uo.status,
  uo.joined_at,
  uo.invited_by,
  u.first_name,
  u.last_name,
  u.email,
  u.phone_number,
  o.name as organization_name,
  r.role,
  r.display_name as role_display_name,
  r.permissions as role_permissions,
  inviter.first_name as invited_by_first_name,
  inviter.last_name as invited_by_last_name,
  inviter.email as invited_by_email
FROM user_organizations uo
LEFT JOIN users u ON uo.user_id = u.user_id
LEFT JOIN organizations o ON uo.organization_id = o.organization_id
LEFT JOIN organization_roles r ON uo.role_id = r.id
LEFT JOIN users inviter ON uo.invited_by = inviter.user_id
WHERE uo.status = 'active';

GRANT SELECT ON organization_members_view TO authenticated;
GRANT EXECUTE ON FUNCTION add_organization_member TO authenticated;

