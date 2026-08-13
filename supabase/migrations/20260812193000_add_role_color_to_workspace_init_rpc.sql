-- Migration: Add role color to initialize_workspace_session RPC
-- Purpose: Include wr.color in workspace initialization response for user/role styling

DROP FUNCTION IF EXISTS initialize_workspace_session(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION initialize_workspace_session(
  p_user_id UUID,
  p_workspace_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_workspaces JSONB;
  v_current_workspace JSONB;
  v_team_members JSONB;
  v_dashboard_data JSONB;
  v_user_preferences JSONB;
  v_workspace_count INT;
  v_localization_preferences JSONB;
BEGIN
  -- ============================================================
  -- 1. Get all user workspaces with roles and permissions
  -- ============================================================
  WITH user_memberships AS (
    SELECT 
      wm.id as member_id,
      wm.status,
      wm.product_key,
      wm.user_id,
      w.id as workspace_id,
      w.name as workspace_name,
      w.slug,
      w.owner_id,
      w.is_onboarding_finished,
      c.logo_url as company_logo,
      c.billing_country,
      wr.id as role_id,
      wr.role_key,
      wr.role_name,
      wr.color as role_color,
      wr.hierarchy_level,
      wr.product_key as role_product_key,
      wr.is_system,
      wr.workspace_id as role_workspace_id
    FROM workspace_members wm
    INNER JOIN workspaces w ON w.id = wm.workspace_id  
    LEFT JOIN companies c ON c.id = w.company_id
    INNER JOIN workspace_roles wr ON wr.id = wm.role_id
    WHERE wm.user_id = p_user_id 
      AND wm.status = 'accepted'
      AND wr.is_active = true
  ),
  workspace_permissions AS (
    SELECT 
      um.workspace_id,
      um.role_id,
      um.product_key,
      jsonb_agg(jsonb_build_object(
        'module', cm.module_key,
        'feature', cmf.feature_key,
        'access_level', rp.access_level,
        'can_access', rp.can_access,
        'can_view_sensitive_data', rp.can_view_sensitive_data,
        'can_override_owner', rp.can_override_owner
      )) as permissions
    FROM user_memberships um
    INNER JOIN role_permissions rp ON rp.role_id = um.role_id
    INNER JOIN crm_module_features cmf ON cmf.id = rp.module_feature_id
    INNER JOIN crm_modules cm ON cm.id = cmf.module_id
    GROUP BY um.workspace_id, um.role_id, um.product_key
  ),
  workspace_roles_with_permissions AS (
    SELECT DISTINCT ON (um.workspace_id, p.prod_key)
      um.workspace_id,
      p.prod_key as target_product_key,
      um.role_id,
      um.role_workspace_id,
      um.role_key,
      um.role_name,
      um.role_color,
      um.hierarchy_level,
      um.is_system,
      COALESCE(wp.permissions, '[]'::jsonb) as permissions
    FROM user_memberships um
    CROSS JOIN (VALUES ('sales'), ('service_cloud'), ('hrms'), ('inventory'), ('funds')) AS p(prod_key)
    LEFT JOIN workspace_permissions wp ON wp.workspace_id = um.workspace_id 
      AND wp.role_id = um.role_id
      AND (wp.product_key = p.prod_key OR wp.product_key IS NULL)
    WHERE um.product_key IS NULL OR um.product_key = p.prod_key
    ORDER BY um.workspace_id, p.prod_key, um.hierarchy_level DESC
  ),
  workspace_roles_grouped AS (
    SELECT 
      workspace_id,
      jsonb_object_agg(
        target_product_key::text,
        jsonb_build_object(
          'id', role_id,
          'workspace_id', role_workspace_id,
          'role_key', role_key,
          'role_name', role_name,
          'color', role_color,
          'hierarchy_level', hierarchy_level,
          'product_key', target_product_key,
          'is_system', is_system,
          'permissions', permissions
        )
      ) as roles
    FROM workspace_roles_with_permissions
    GROUP BY workspace_id
  ),
  workspace_summary AS (
    SELECT DISTINCT ON (um.workspace_id)
      um.workspace_id,
      um.workspace_name,
      um.slug,
      um.owner_id,
      um.is_onboarding_finished,
      um.member_id,
      um.status,
      um.company_logo,
      um.billing_country,
      um.product_key
    FROM user_memberships um
    ORDER BY um.workspace_id, um.product_key
  )
  SELECT jsonb_agg(jsonb_build_object(
    'id', ws.workspace_id,
    'name', ws.workspace_name,
    'slug', ws.slug,
    'owner_id', ws.owner_id,
    'is_onboarding_finished', ws.is_onboarding_finished,
    'member_id', ws.member_id,
    'status', ws.status,
    'company_logo_url', ws.company_logo,
    'billing_country', ws.billing_country,
    'roles', wrg.roles,
    'currentRole', (wrg.roles->COALESCE(ws.product_key, 'sales')),
    'currentProductKey', COALESCE(ws.product_key, 'sales')
  )) INTO v_user_workspaces
  FROM workspace_summary ws
  INNER JOIN workspace_roles_grouped wrg ON wrg.workspace_id = ws.workspace_id;

  -- Get workspace count for logic (using direct query, not CTE)
  SELECT COUNT(DISTINCT wm.workspace_id) INTO v_workspace_count
  FROM workspace_members wm
  INNER JOIN workspace_roles wr ON wr.id = wm.role_id
  WHERE wm.user_id = p_user_id 
    AND wm.status = 'accepted'
    AND wr.is_active = true;

  -- ============================================================  
  -- 2. Get current workspace details (if specified or auto-select)
  -- ============================================================
  
  -- Auto-select workspace if not specified and user has only one
  IF p_workspace_id IS NULL AND v_workspace_count = 1 THEN
    p_workspace_id := ((v_user_workspaces->0)->>'id')::UUID;
  END IF;

  IF p_workspace_id IS NOT NULL THEN
    -- Get team members for current workspace (all products)
    WITH ordered_members AS (
      SELECT 
        wm.id,
        wm.user_id,
        wm.status,
        wm.product_key,
        wm.role_id,
        wm.created_at,
        wr.id as wr_id,
        wr.role_key,
        wr.role_name,
        wr.color as wr_color,
        wr.hierarchy_level,
        wr.product_key as wr_product_key,
        a.id as a_id,
        a.email,
        a.name,
        a.picture_url
      FROM workspace_members wm
      INNER JOIN workspace_roles wr ON wr.id = wm.role_id
      INNER JOIN accounts a ON a.id = wm.user_id
      WHERE wm.workspace_id = p_workspace_id
        AND wm.status IN ('accepted', 'pending')
        AND wr.is_active = true
      ORDER BY wm.created_at DESC
    )
    SELECT jsonb_agg(jsonb_build_object(
      'id', om.id,
      'user_id', om.user_id,
      'status', om.status,
      'product_key', om.product_key,
      'role_id', om.role_id,
      'created_at', om.created_at,
      'role', jsonb_build_object(
        'id', om.wr_id,
        'role_key', om.role_key,
        'role_name', om.role_name,
        'color', om.wr_color,
        'hierarchy_level', om.hierarchy_level,
        'product_key', om.wr_product_key
      ),
      'user', jsonb_build_object(
        'id', om.a_id,
        'email', om.email,
        'name', COALESCE(om.name, om.email),
        'picture', om.picture_url
      )
    )) INTO v_team_members
    FROM ordered_members om;

    -- Get basic dashboard metrics (lightweight for fast loading)
    SELECT jsonb_build_object(
      'summary', jsonb_build_object(
        'total_leads', COALESCE((
          SELECT COUNT(*) FROM crm_leads 
          WHERE workspace_id = p_workspace_id AND is_deleted = false
        ), 0),
        'total_contacts', COALESCE((
          SELECT COUNT(*) FROM crm_contacts 
          WHERE workspace_id = p_workspace_id AND is_deleted = false
        ), 0),
        'total_accounts', COALESCE((
          SELECT COUNT(*) FROM crm_accounts 
          WHERE workspace_id = p_workspace_id AND is_deleted = false
        ), 0),
        'total_opportunities', COALESCE((
          SELECT COUNT(*) FROM crm_opportunities 
          WHERE workspace_id = p_workspace_id AND is_deleted = false
        ), 0)
      ),
      'recent_activity', jsonb_build_object(
        'new_leads_7d', COALESCE((
          SELECT COUNT(*) FROM crm_leads 
          WHERE workspace_id = p_workspace_id 
            AND is_deleted = false
            AND created_at >= NOW() - INTERVAL '7 days'
        ), 0),
        'new_contacts_7d', COALESCE((
          SELECT COUNT(*) FROM crm_contacts 
          WHERE workspace_id = p_workspace_id 
            AND is_deleted = false
            AND created_at >= NOW() - INTERVAL '7 days'
        ), 0)
      ),
      'workspace_info', jsonb_build_object(
        'id', p_workspace_id,
        'created_at', (SELECT created_at FROM workspaces WHERE id = p_workspace_id)
      )
    ) INTO v_dashboard_data;

    -- Get localization preferences
    SELECT jsonb_build_object(
      'timezone', COALESCE(pref.timezone, 'UTC'),
      'date_format', COALESCE(pref.date_format, 'MM-DD-YYYY'),
      'time_format', COALESCE(pref.time_format, '12h'),
      'default_currency', COALESCE(pref.default_currency, 'USD'),
      'enabled_currencies', COALESCE((
        SELECT jsonb_agg(currency_code ORDER BY is_default DESC, currency_code ASC)
        FROM core.workspace_currencies 
        WHERE workspace_id = p_workspace_id AND is_active = true
      ), '["USD"]'::jsonb),
      'exchange_rates', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'base_currency', base_currency,
          'target_currency', target_currency,
          'exchange_rate', exchange_rate
        ))
        FROM core.currency_exchange_rates
        WHERE base_currency = 'USD'
      ), '[]'::jsonb)
    ) INTO v_localization_preferences
    FROM core.workspace_preferences pref
    WHERE pref.workspace_id = p_workspace_id;

    -- Set current workspace data
    v_current_workspace := jsonb_build_object(
      'team_members', COALESCE(v_team_members, '[]'::jsonb),
      'dashboard_data', COALESCE(v_dashboard_data, '{}'::jsonb),
      'localization', COALESCE(v_localization_preferences, jsonb_build_object(
        'timezone', 'UTC',
        'date_format', 'MM-DD-YYYY',
        'time_format', '12h',
        'default_currency', 'USD',
        'enabled_currencies', '["USD"]'::jsonb
      ))
    );
  ELSE
    v_current_workspace := jsonb_build_object(
      'team_members', '[]'::jsonb,
      'dashboard_data', '{}'::jsonb
    );
  END IF;

  -- ============================================================
  -- 3. Get user preferences and settings  
  -- ============================================================
  SELECT jsonb_build_object(
    'id', a.id,
    'email', a.email,
    'name', COALESCE(a.name, a.email),
    'picture', a.picture_url,
    'timezone', COALESCE(a.timezone, 'UTC'),
    'language', 'en',
    'theme', 'light',
    'last_active_workspace', p_workspace_id,
    'workspace_count', v_workspace_count,
    'auto_selected_workspace', (p_workspace_id IS NOT NULL AND v_workspace_count = 1)
  ) INTO v_user_preferences
  FROM accounts a
  WHERE a.id = p_user_id;

  -- Return complete initialization data
  RETURN jsonb_build_object(
    'success', true,
    'user_workspaces', COALESCE(v_user_workspaces, '[]'::jsonb),
    'current_workspace', v_current_workspace,
    'user_preferences', COALESCE(v_user_preferences, '{}'::jsonb),
    'session_metadata', jsonb_build_object(
      'initialized_at', EXTRACT(EPOCH FROM NOW()),
      'workspace_id', p_workspace_id,
      'user_id', p_user_id,
      'total_workspaces', v_workspace_count
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION initialize_workspace_session(UUID, UUID, TEXT) TO authenticated, anon, service_role;
