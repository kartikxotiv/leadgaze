CREATE POLICY "Allow authenticated users to read workspace roles"
  ON public.workspace_roles
  FOR SELECT
  TO authenticated
  USING (is_deleted = false);

CREATE POLICY "Allow authenticated users to insert workspace roles"
  ON public.workspace_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update workspace roles"
  ON public.workspace_roles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete workspace roles"
  ON public.workspace_roles
  FOR DELETE
  TO authenticated
  USING (true);

