/*
 * -------------------------------------------------------
 * Migration: Create Email Attachments Storage
 * Date: 2026-08-05
 * Description: Adds a private workspace-scoped bucket for outbound email
 *              attachments and stores attachment metadata with sent emails.
 * -------------------------------------------------------
 */

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit
)
VALUES (
  'email_attachments',
  'email_attachments',
  false,
  10485760
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS email_attachments_select ON storage.objects;
CREATE POLICY email_attachments_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'email_attachments'
  AND EXISTS (
    SELECT 1
    FROM public.workspaces workspace
    WHERE workspace.id::text = (storage.foldername(name))[1]
      AND (
        workspace.owner_id = auth.uid()
        OR public.current_user_is_workspace_member(workspace.id)
      )
  )
);

DROP POLICY IF EXISTS email_attachments_insert ON storage.objects;
CREATE POLICY email_attachments_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email_attachments'
  AND EXISTS (
    SELECT 1
    FROM public.workspaces workspace
    WHERE workspace.id::text = (storage.foldername(name))[1]
      AND (
        workspace.owner_id = auth.uid()
        OR public.current_user_is_workspace_member(workspace.id)
      )
  )
);

DROP POLICY IF EXISTS email_attachments_update ON storage.objects;
CREATE POLICY email_attachments_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'email_attachments'
  AND EXISTS (
    SELECT 1
    FROM public.workspaces workspace
    WHERE workspace.id::text = (storage.foldername(name))[1]
      AND (
        workspace.owner_id = auth.uid()
        OR public.current_user_is_workspace_member(workspace.id)
      )
  )
)
WITH CHECK (
  bucket_id = 'email_attachments'
  AND EXISTS (
    SELECT 1
    FROM public.workspaces workspace
    WHERE workspace.id::text = (storage.foldername(name))[1]
      AND (
        workspace.owner_id = auth.uid()
        OR public.current_user_is_workspace_member(workspace.id)
      )
  )
);

DROP POLICY IF EXISTS email_attachments_delete ON storage.objects;
CREATE POLICY email_attachments_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'email_attachments'
  AND EXISTS (
    SELECT 1
    FROM public.workspaces workspace
    WHERE workspace.id::text = (storage.foldername(name))[1]
      AND (
        workspace.owner_id = auth.uid()
        OR public.current_user_is_workspace_member(workspace.id)
      )
  )
);

ALTER TABLE core.emails
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE core.email_sends
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN core.emails.attachments IS
  'Metadata for files stored in the private email_attachments bucket.';

COMMENT ON COLUMN core.email_sends.attachments IS
  'Attachment metadata captured for this provider send attempt.';
