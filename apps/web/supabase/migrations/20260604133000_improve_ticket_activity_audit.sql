/*
 * -------------------------------------------------------
 * Migration: Improve Service Cloud Ticket Activity Audit
 * Date: 2026-06-04
 * Description: Records readable ticket activities for status changes,
 *              field updates, assignee changes, email replies, and time logs.
 * -------------------------------------------------------
 */

CREATE OR REPLACE FUNCTION service_cloud.account_display_name(p_account_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_label TEXT;
BEGIN
  IF p_account_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(NULLIF(a.name, ''), NULLIF(a.email, ''), a.id::TEXT)
  INTO v_label
  FROM public.accounts a
  WHERE a.id = p_account_id;

  RETURN COALESCE(v_label, p_account_id::TEXT);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION service_cloud.record_ticket_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type service_cloud.activity_event_enum := 'status_changed';
  v_new_lifecycle service_cloud.ticket_lifecycle_enum;
  v_old_status TEXT;
  v_new_status TEXT;
BEGIN
  IF NEW.status_id IS NOT DISTINCT FROM OLD.status_id THEN
    RETURN NEW;
  END IF;

  UPDATE service_cloud.ticket_status_durations
  SET ended_at = now(),
      duration_seconds = GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at))::INTEGER)
  WHERE ticket_id = NEW.id
    AND ended_at IS NULL;

  INSERT INTO service_cloud.ticket_status_durations (
    workspace_id,
    ticket_id,
    status_id,
    started_at,
    changed_by
  )
  VALUES (
    NEW.workspace_id,
    NEW.id,
    NEW.status_id,
    now(),
    NEW.updated_by
  );

  SELECT lifecycle, name INTO v_new_lifecycle, v_new_status
  FROM service_cloud.ticket_statuses
  WHERE id = NEW.status_id;

  SELECT name INTO v_old_status
  FROM service_cloud.ticket_statuses
  WHERE id = OLD.status_id;

  IF v_new_lifecycle = 'resolved' THEN
    v_event_type := 'ticket_resolved';
  ELSIF v_new_lifecycle = 'closed' THEN
    v_event_type := 'ticket_closed';
  ELSIF OLD.closed_at IS NOT NULL AND v_new_lifecycle NOT IN ('resolved', 'closed') THEN
    v_event_type := 'ticket_reopened';
  END IF;

  INSERT INTO service_cloud.ticket_activities (
    workspace_id,
    ticket_id,
    event_type,
    actor_account_id,
    summary,
    from_value,
    to_value
  )
  VALUES (
    NEW.workspace_id,
    NEW.id,
    v_event_type,
    NEW.updated_by,
    format(
      'Status changed from %s to %s',
      COALESCE(v_old_status, 'Unassigned'),
      COALESCE(v_new_status, 'Unassigned')
    ),
    jsonb_build_object('status_id', OLD.status_id, 'label', v_old_status),
    jsonb_build_object('status_id', NEW.status_id, 'label', v_new_status)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION service_cloud.record_ticket_field_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_old_priority TEXT;
  v_new_priority TEXT;
  v_old_category TEXT;
  v_new_category TEXT;
  v_old_team TEXT;
  v_new_team TEXT;
  v_old_owner TEXT;
  v_new_owner TEXT;
BEGIN
  IF NEW.priority_id IS DISTINCT FROM OLD.priority_id THEN
    SELECT name INTO v_old_priority FROM service_cloud.ticket_priorities WHERE id = OLD.priority_id;
    SELECT name INTO v_new_priority FROM service_cloud.ticket_priorities WHERE id = NEW.priority_id;

    INSERT INTO service_cloud.ticket_activities (
      workspace_id, ticket_id, event_type, actor_account_id, summary, from_value, to_value
    )
    VALUES (
      NEW.workspace_id,
      NEW.id,
      'priority_changed',
      NEW.updated_by,
      format('Priority changed from %s to %s', COALESCE(v_old_priority, 'None'), COALESCE(v_new_priority, 'None')),
      jsonb_build_object('priority_id', OLD.priority_id, 'label', v_old_priority),
      jsonb_build_object('priority_id', NEW.priority_id, 'label', v_new_priority)
    );
  END IF;

  IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    SELECT name INTO v_old_category FROM service_cloud.ticket_categories WHERE id = OLD.category_id;
    SELECT name INTO v_new_category FROM service_cloud.ticket_categories WHERE id = NEW.category_id;

    INSERT INTO service_cloud.ticket_activities (
      workspace_id, ticket_id, event_type, actor_account_id, summary, from_value, to_value
    )
    VALUES (
      NEW.workspace_id,
      NEW.id,
      'category_changed',
      NEW.updated_by,
      format('Category changed from %s to %s', COALESCE(v_old_category, 'None'), COALESCE(v_new_category, 'None')),
      jsonb_build_object('category_id', OLD.category_id, 'label', v_old_category),
      jsonb_build_object('category_id', NEW.category_id, 'label', v_new_category)
    );
  END IF;

  IF NEW.assigned_agent_id IS DISTINCT FROM OLD.assigned_agent_id THEN
    v_old_owner := service_cloud.account_display_name(OLD.assigned_agent_id);
    v_new_owner := service_cloud.account_display_name(NEW.assigned_agent_id);

    INSERT INTO service_cloud.ticket_activities (
      workspace_id, ticket_id, event_type, actor_account_id, summary, from_value, to_value
    )
    VALUES (
      NEW.workspace_id,
      NEW.id,
      CASE WHEN OLD.assigned_agent_id IS NULL THEN 'ticket_assigned'::service_cloud.activity_event_enum ELSE 'ticket_reassigned'::service_cloud.activity_event_enum END,
      NEW.updated_by,
      CASE
        WHEN NEW.assigned_agent_id IS NULL THEN format('Primary owner removed from %s', COALESCE(v_old_owner, 'Unassigned'))
        WHEN OLD.assigned_agent_id IS NULL THEN format('Primary owner assigned to %s', COALESCE(v_new_owner, 'Unassigned'))
        ELSE format('Primary owner changed from %s to %s', COALESCE(v_old_owner, 'Unassigned'), COALESCE(v_new_owner, 'Unassigned'))
      END,
      jsonb_build_object('account_id', OLD.assigned_agent_id, 'label', v_old_owner),
      jsonb_build_object('account_id', NEW.assigned_agent_id, 'label', v_new_owner)
    );
  END IF;

  IF NEW.assigned_team_id IS DISTINCT FROM OLD.assigned_team_id THEN
    SELECT name INTO v_old_team FROM service_cloud.teams WHERE id = OLD.assigned_team_id;
    SELECT name INTO v_new_team FROM service_cloud.teams WHERE id = NEW.assigned_team_id;

    INSERT INTO service_cloud.ticket_activities (
      workspace_id, ticket_id, event_type, actor_account_id, summary, from_value, to_value
    )
    VALUES (
      NEW.workspace_id,
      NEW.id,
      'ticket_assigned',
      NEW.updated_by,
      format('Team changed from %s to %s', COALESCE(v_old_team, 'None'), COALESCE(v_new_team, 'None')),
      jsonb_build_object('team_id', OLD.assigned_team_id, 'label', v_old_team),
      jsonb_build_object('team_id', NEW.assigned_team_id, 'label', v_new_team)
    );
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO service_cloud.ticket_activities (
      workspace_id, ticket_id, event_type, actor_account_id, summary, from_value, to_value
    )
    VALUES (
      NEW.workspace_id,
      NEW.id,
      'ticket_updated',
      NEW.updated_by,
      format('Due date changed from %s to %s', COALESCE(OLD.due_date::TEXT, 'None'), COALESCE(NEW.due_date::TEXT, 'None')),
      jsonb_build_object('due_date', OLD.due_date),
      jsonb_build_object('due_date', NEW.due_date)
    );
  END IF;

  IF NEW.subject IS DISTINCT FROM OLD.subject THEN
    INSERT INTO service_cloud.ticket_activities (
      workspace_id, ticket_id, event_type, actor_account_id, summary, from_value, to_value
    )
    VALUES (
      NEW.workspace_id,
      NEW.id,
      'ticket_updated',
      NEW.updated_by,
      'Ticket subject updated',
      jsonb_build_object('subject', OLD.subject),
      jsonb_build_object('subject', NEW.subject)
    );
  END IF;

  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO service_cloud.ticket_activities (
      workspace_id, ticket_id, event_type, actor_account_id, summary, from_value, to_value
    )
    VALUES (
      NEW.workspace_id,
      NEW.id,
      'ticket_updated',
      NEW.updated_by,
      'Ticket description updated',
      jsonb_build_object('changed', TRUE),
      jsonb_build_object('changed', TRUE)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sc_tickets_field_changes ON service_cloud.tickets;
CREATE TRIGGER trg_sc_tickets_field_changes
  AFTER UPDATE OF priority_id, category_id, assigned_agent_id, assigned_team_id, due_date, subject, description
  ON service_cloud.tickets
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.record_ticket_field_changes();

CREATE OR REPLACE FUNCTION service_cloud.record_ticket_assignee_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_label TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_primary = TRUE THEN
      RETURN OLD;
    END IF;

    v_label := service_cloud.account_display_name(OLD.account_id);

    INSERT INTO service_cloud.ticket_activities (
      workspace_id, ticket_id, event_type, actor_account_id, summary, from_value, metadata
    )
    VALUES (
      OLD.workspace_id,
      OLD.ticket_id,
      'ticket_reassigned',
      OLD.created_by,
      format('Team member removed: %s', COALESCE(v_label, 'Unknown member')),
      jsonb_build_object('account_id', OLD.account_id, 'label', v_label),
      jsonb_build_object('assignment_role', OLD.assignment_role, 'is_primary', OLD.is_primary)
    );

    RETURN OLD;
  END IF;

  IF NEW.is_primary = TRUE THEN
    RETURN NEW;
  END IF;

  v_label := service_cloud.account_display_name(NEW.account_id);

  INSERT INTO service_cloud.ticket_activities (
    workspace_id, ticket_id, event_type, actor_account_id, summary, to_value, metadata
  )
  VALUES (
    NEW.workspace_id,
    NEW.ticket_id,
    'ticket_assigned',
    NEW.created_by,
    format('Team member assigned: %s', COALESCE(v_label, 'Unknown member')),
    jsonb_build_object('account_id', NEW.account_id, 'label', v_label),
    jsonb_build_object('assignment_role', NEW.assignment_role, 'is_primary', NEW.is_primary)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sc_ticket_assignees_activity_insert ON service_cloud.ticket_assignees;
CREATE TRIGGER trg_sc_ticket_assignees_activity_insert
  AFTER INSERT ON service_cloud.ticket_assignees
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.record_ticket_assignee_activity();

DROP TRIGGER IF EXISTS trg_sc_ticket_assignees_activity_delete ON service_cloud.ticket_assignees;
CREATE TRIGGER trg_sc_ticket_assignees_activity_delete
  AFTER DELETE ON service_cloud.ticket_assignees
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.record_ticket_assignee_activity();

CREATE OR REPLACE FUNCTION service_cloud.record_ticket_email_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_direction TEXT;
  v_subject TEXT;
BEGIN
  SELECT direction, subject
  INTO v_direction, v_subject
  FROM core.emails
  WHERE id = NEW.email_id
    AND workspace_id = NEW.workspace_id;

  INSERT INTO service_cloud.ticket_activities (
    workspace_id, ticket_id, event_type, actor_account_id, summary, to_value, metadata
  )
  VALUES (
    NEW.workspace_id,
    NEW.ticket_id,
    CASE
      WHEN v_direction = 'inbound' THEN 'customer_replied'::service_cloud.activity_event_enum
      WHEN v_direction = 'outbound' THEN 'agent_replied'::service_cloud.activity_event_enum
      ELSE 'email_linked'::service_cloud.activity_event_enum
    END,
    NEW.account_id,
    CASE
      WHEN v_direction = 'inbound' THEN format('Customer replied: %s', COALESCE(v_subject, '(No Subject)'))
      WHEN v_direction = 'outbound' THEN format('Agent replied: %s', COALESCE(v_subject, '(No Subject)'))
      ELSE format('Email linked: %s', COALESCE(v_subject, '(No Subject)'))
    END,
    jsonb_build_object('email_id', NEW.email_id, 'subject', v_subject, 'direction', v_direction),
    jsonb_build_object('email_role', NEW.email_role)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sc_ticket_emails_activity_insert ON service_cloud.ticket_emails;
CREATE TRIGGER trg_sc_ticket_emails_activity_insert
  AFTER INSERT ON service_cloud.ticket_emails
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.record_ticket_email_activity();

CREATE OR REPLACE FUNCTION service_cloud.record_time_logged_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO service_cloud.ticket_activities (
    workspace_id, ticket_id, event_type, actor_account_id, summary, to_value
  )
  VALUES (
    NEW.workspace_id,
    NEW.ticket_id,
    'time_logged',
    NEW.account_id,
    format('Time logged: %s minutes', ROUND(NEW.duration_seconds::NUMERIC / 60, 1)),
    jsonb_build_object(
      'time_entry_id', NEW.id,
      'duration_seconds', NEW.duration_seconds,
      'description', NEW.description,
      'logged_date', NEW.logged_date
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sc_time_entries_activity_insert ON service_cloud.time_entries;
CREATE TRIGGER trg_sc_time_entries_activity_insert
  AFTER INSERT ON service_cloud.time_entries
  FOR EACH ROW EXECUTE PROCEDURE service_cloud.record_time_logged_activity();
