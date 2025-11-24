
CREATE POLICY "Allow authenticated users to view workspace invites"
ON public.workspace_invites
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to create workspace invites"
ON public.workspace_invites
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update workspace invites"
ON public.workspace_invites
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete workspace invites"
ON public.workspace_invites
FOR DELETE
TO authenticated
USING (true);

