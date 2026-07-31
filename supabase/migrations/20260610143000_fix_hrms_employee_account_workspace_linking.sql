/*
 * Migration: Fix HRMS Employee Account Workspace Linking
 *
 * Older HRMS employee rows can have a work_email that matches an existing
 * account while account_id and workspace_members are still missing. Self-service
 * requires both the employee link and accepted workspace membership.
 */

WITH employee_accounts AS (
    SELECT
        employees.id AS employee_id,
        employees.workspace_id,
        accounts.id AS account_id
    FROM hrms.employees employees
    JOIN public.accounts accounts
      ON LOWER(accounts.email) = LOWER(employees.work_email)
    WHERE employees.is_deleted = FALSE
),
workspace_default_roles AS (
    SELECT DISTINCT ON (roles.workspace_id)
        roles.workspace_id,
        roles.id AS role_id
    FROM public.workspace_roles roles
    WHERE roles.is_active = TRUE
    ORDER BY
        roles.workspace_id,
        CASE WHEN roles.role_key = 'user' THEN 0 ELSE 1 END,
        roles.hierarchy_level ASC
)
INSERT INTO public.workspace_members (
    workspace_id,
    user_id,
    role_id,
    status,
    invited_at,
    accepted_at
)
SELECT
    employee_accounts.workspace_id,
    employee_accounts.account_id,
    workspace_default_roles.role_id,
    'accepted'::public.workspace_member_status,
    NOW(),
    NOW()
FROM employee_accounts
JOIN workspace_default_roles
  ON workspace_default_roles.workspace_id = employee_accounts.workspace_id
WHERE NOT EXISTS (
    SELECT 1
    FROM public.workspace_members members
    WHERE members.workspace_id = employee_accounts.workspace_id
      AND members.user_id = employee_accounts.account_id
)
ON CONFLICT (workspace_id, user_id) DO NOTHING;

UPDATE hrms.employees employees
SET
    account_id = accounts.id,
    updated_at = NOW()
FROM public.accounts accounts
WHERE employees.account_id IS NULL
  AND employees.is_deleted = FALSE
  AND LOWER(accounts.email) = LOWER(employees.work_email)
  AND EXISTS (
      SELECT 1
      FROM public.workspace_members members
      WHERE members.workspace_id = employees.workspace_id
        AND members.user_id = accounts.id
        AND members.status = 'accepted'
  );

CREATE OR REPLACE FUNCTION hrms.link_employees_for_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public
AS $$
BEGIN
    IF NEW.email IS NOT NULL THEN
        UPDATE hrms.employees employees
        SET account_id = NEW.id,
            updated_at = NOW()
        WHERE employees.account_id IS NULL
          AND employees.is_deleted = FALSE
          AND LOWER(employees.work_email) = LOWER(NEW.email)
          AND EXISTS (
              SELECT 1
              FROM public.workspace_members members
              WHERE members.workspace_id = employees.workspace_id
                AND members.user_id = NEW.id
                AND members.status = 'accepted'
          );
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION hrms.link_employee_for_workspace_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public
AS $$
DECLARE
    account_email TEXT;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    SELECT email INTO account_email
    FROM public.accounts
    WHERE id = NEW.user_id;

    IF account_email IS NOT NULL THEN
        UPDATE hrms.employees employees
        SET account_id = NEW.user_id,
            updated_at = NOW()
        WHERE employees.account_id IS NULL
          AND employees.workspace_id = NEW.workspace_id
          AND employees.is_deleted = FALSE
          AND LOWER(employees.work_email) = LOWER(account_email);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hrms_workspace_members_link_employee_insert_trigger
ON public.workspace_members;
CREATE TRIGGER hrms_workspace_members_link_employee_insert_trigger
AFTER INSERT ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION hrms.link_employee_for_workspace_member();

DROP TRIGGER IF EXISTS hrms_workspace_members_link_employee_update_trigger
ON public.workspace_members;
CREATE TRIGGER hrms_workspace_members_link_employee_update_trigger
AFTER UPDATE OF user_id, workspace_id, status ON public.workspace_members
FOR EACH ROW
WHEN (
    OLD.user_id IS DISTINCT FROM NEW.user_id OR
    OLD.workspace_id IS DISTINCT FROM NEW.workspace_id OR
    OLD.status IS DISTINCT FROM NEW.status
)
EXECUTE FUNCTION hrms.link_employee_for_workspace_member();
