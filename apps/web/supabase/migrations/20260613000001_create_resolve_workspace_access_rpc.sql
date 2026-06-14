-- Migration: Create RPC function for resolving workspace access + hierarchy in a single DB call
-- Purpose: Collapse 5-8 sequential auth/workspace/hierarchy queries into 1 RPC call.
-- Replaces: auth.getUser() -> accounts lookup -> workspaces.owner_id -> workspace_members check
--           -> getHierarchyVisibleUserIds (3-5 internal queries)

CREATE OR REPLACE FUNCTION resolve_workspace_access(
  p_workspace_id UUID,
  p_user_id UUID,
  p_user_email TEXT DEFAULT NULL,
  p_require_shared_team BOOLEAN DEFAULT TRUE
)
RETURNS JSON AS $$
DECLARE
  v_actor_account_id UUID;
  v_workspace_owner_id UUID;
  v_is_owner BOOLEAN := FALSE;
  v_is_member BOOLEAN := FALSE;
  v_role_key TEXT;
  v_user_level INT;
  v_hierarchy_type TEXT := 'restricted';
  v_visible_user_ids UUID[];
BEGIN
  -- ============================================================
  -- 1. Resolve actor account ID (by user_id first, then email fallback)
  -- ============================================================
  SELECT id INTO v_actor_account_id
  FROM accounts
  WHERE id = p_user_id
  LIMIT 1;

  IF v_actor_account_id IS NULL AND p_user_email IS NOT NULL THEN
    SELECT id INTO v_actor_account_id
    FROM accounts
    WHERE email = p_user_email
    LIMIT 1;
  END IF;

  -- Fallback to user_id if no account found
  IF v_actor_account_id IS NULL THEN
    v_actor_account_id := p_user_id;
  END IF;

  -- ============================================================
  -- 2. Check workspace existence and owner
  -- ============================================================
  SELECT owner_id INTO v_workspace_owner_id
  FROM workspaces
  WHERE id = p_workspace_id
  LIMIT 1;

  IF v_workspace_owner_id IS NULL THEN
    RETURN json_build_object(
      'actor_account_id', v_actor_account_id,
      'is_owner', FALSE,
      'is_member', FALSE,
      'hierarchy_type', 'restricted',
      'visible_user_ids', ARRAY[p_user_id]::UUID[]
    );
  END IF;

  v_is_owner := (v_workspace_owner_id = v_actor_account_id OR v_workspace_owner_id = p_user_id);

  -- ============================================================
  -- 3. Check workspace membership
  -- ============================================================
  IF NOT v_is_owner THEN
    SELECT EXISTS(
      SELECT 1 FROM workspace_members
      WHERE workspace_id = p_workspace_id
        AND user_id = v_actor_account_id
        AND status = 'accepted'
    ) INTO v_is_member;
  ELSE
    v_is_member := TRUE;
  END IF;

  -- ============================================================
  -- 4. Owner bypass: full visibility
  -- ============================================================
  IF v_is_owner THEN
    RETURN json_build_object(
      'actor_account_id', v_actor_account_id,
      'is_owner', TRUE,
      'is_member', TRUE,
      'hierarchy_type', 'all',
      'visible_user_ids', NULL::UUID[]
    );
  END IF;

  -- Non-owner, non-member: restricted to self only
  IF NOT v_is_member THEN
    RETURN json_build_object(
      'actor_account_id', v_actor_account_id,
      'is_owner', FALSE,
      'is_member', FALSE,
      'hierarchy_type', 'restricted',
      'visible_user_ids', ARRAY[p_user_id]::UUID[]
    );
  END IF;

  -- ============================================================
  -- 5. Get user's role and hierarchy level
  -- ============================================================
  SELECT wr.role_key, COALESCE(wr.hierarchy_level, 0)
  INTO v_role_key, v_user_level
  FROM workspace_members wm
  INNER JOIN workspace_roles wr ON wr.id = wm.role_id
  WHERE wm.workspace_id = p_workspace_id
    AND wm.user_id = v_actor_account_id
    AND wm.status = 'accepted'
  LIMIT 1;

  -- Admin or high-level: full visibility
  IF v_role_key = 'admin' OR v_user_level >= 100 THEN
    RETURN json_build_object(
      'actor_account_id', v_actor_account_id,
      'is_owner', FALSE,
      'is_member', TRUE,
      'hierarchy_type', 'all',
      'visible_user_ids', NULL::UUID[]
    );
  END IF;

  -- ============================================================
  -- 6. Find subordinate roles (lower hierarchy_level)
  -- ============================================================
  -- Collect subordinate user IDs
  WITH subordinate_roles AS (
    SELECT id FROM workspace_roles
    WHERE workspace_id = p_workspace_id
      AND COALESCE(hierarchy_level, 0) < v_user_level
  ),
  subordinate_users AS (
    SELECT DISTINCT wm.user_id
    FROM workspace_members wm
    INNER JOIN subordinate_roles sr ON sr.id = wm.role_id
    WHERE wm.workspace_id = p_workspace_id
      AND wm.status = 'accepted'
  )
  SELECT ARRAY_AGG(DISTINCT user_id) INTO v_visible_user_ids
  FROM subordinate_users;

  -- No subordinates: can only see own data
  IF v_visible_user_ids IS NULL OR array_length(v_visible_user_ids, 1) IS NULL THEN
    v_visible_user_ids := ARRAY[p_user_id]::UUID[];
    -- Ensure user_id is included even if actor_account_id differs
    IF p_user_id != v_actor_account_id AND NOT (p_user_id = ANY(v_visible_user_ids)) THEN
      v_visible_user_ids := array_append(v_visible_user_ids, p_user_id);
    END IF;

    RETURN json_build_object(
      'actor_account_id', v_actor_account_id,
      'is_owner', FALSE,
      'is_member', TRUE,
      'hierarchy_type', 'restricted',
      'visible_user_ids', v_visible_user_ids
    );
  END IF;

  -- ============================================================
  -- 7a. No shared team requirement: all subordinates visible
  -- ============================================================
  IF NOT p_require_shared_team THEN
    -- Add self to visible set
    IF NOT (v_actor_account_id = ANY(v_visible_user_ids)) THEN
      v_visible_user_ids := array_append(v_visible_user_ids, v_actor_account_id);
    END IF;
    IF NOT (p_user_id = ANY(v_visible_user_ids)) THEN
      v_visible_user_ids := array_append(v_visible_user_ids, p_user_id);
    END IF;

    RETURN json_build_object(
      'actor_account_id', v_actor_account_id,
      'is_owner', FALSE,
      'is_member', TRUE,
      'hierarchy_type', 'restricted',
      'visible_user_ids', v_visible_user_ids
    );
  END IF;

  -- ============================================================
  -- 7b. Shared team: intersect subordinates with team members
  -- ============================================================
  WITH user_teams AS (
    SELECT team_id FROM workspace_team_members
    WHERE workspace_id = p_workspace_id
      AND user_id = v_actor_account_id
  ),
  team_members AS (
    SELECT DISTINCT wtm.user_id
    FROM workspace_team_members wtm
    INNER JOIN user_teams ut ON ut.team_id = wtm.team_id
  ),
  visible_team_subordinates AS (
    -- Intersection: must be both a team member AND a subordinate
    SELECT DISTINCT tm.user_id
    FROM team_members tm
    WHERE tm.user_id = ANY(v_visible_user_ids)
  )
  SELECT ARRAY_AGG(DISTINCT user_id) INTO v_visible_user_ids
  FROM visible_team_subordinates;

  -- Always include self
  IF v_visible_user_ids IS NULL THEN
    v_visible_user_ids := ARRAY[v_actor_account_id]::UUID[];
  ELSE
    IF NOT (v_actor_account_id = ANY(v_visible_user_ids)) THEN
      v_visible_user_ids := array_append(v_visible_user_ids, v_actor_account_id);
    END IF;
  END IF;

  IF NOT (p_user_id = ANY(v_visible_user_ids)) THEN
    v_visible_user_ids := array_append(v_visible_user_ids, p_user_id);
  END IF;

  RETURN json_build_object(
    'actor_account_id', v_actor_account_id,
    'is_owner', FALSE,
    'is_member', TRUE,
    'hierarchy_type', 'restricted',
    'visible_user_ids', v_visible_user_ids
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION resolve_workspace_access(UUID, UUID, TEXT, BOOLEAN) TO authenticated, anon, service_role;
