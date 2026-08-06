/*
 * -------------------------------------------------------
 * Migration: Fix Email Attachment Storage RLS
 * Date: 2026-08-06
 * Description: Evaluates workspace ownership and membership through a
 *              security-definer function so storage object policies are not
 *              blocked by RLS on the workspace tables.
 * -------------------------------------------------------
 */

CREATE OR REPLACE FUNCTION public.can_access_email_attachment_object(
  p_object_name TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND position('/' IN p_object_name) > 1
    AND EXISTS (
      SELECT 1
      FROM public.workspaces workspace
      WHERE workspace.id::text = split_part(p_object_name, '/', 1)
        AND (
          workspace.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.workspace_members member
            WHERE member.workspace_id = workspace.id
              AND member.user_id = auth.uid()
              AND member.status = 'accepted'
          )
        )
    );
$$;

REVOKE ALL
ON FUNCTION public.can_access_email_attachment_object(TEXT)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.can_access_email_attachment_object(TEXT)
TO authenticated, service_role;

DROP POLICY IF EXISTS email_attachments_select ON storage.objects;
CREATE POLICY email_attachments_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'email_attachments'
  AND public.can_access_email_attachment_object(name)
);

DROP POLICY IF EXISTS email_attachments_insert ON storage.objects;
CREATE POLICY email_attachments_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email_attachments'
  AND public.can_access_email_attachment_object(name)
);

DROP POLICY IF EXISTS email_attachments_update ON storage.objects;
CREATE POLICY email_attachments_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'email_attachments'
  AND public.can_access_email_attachment_object(name)
)
WITH CHECK (
  bucket_id = 'email_attachments'
  AND public.can_access_email_attachment_object(name)
);

DROP POLICY IF EXISTS email_attachments_delete ON storage.objects;
CREATE POLICY email_attachments_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'email_attachments'
  AND public.can_access_email_attachment_object(name)
);
