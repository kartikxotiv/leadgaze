CREATE TABLE IF NOT EXISTS public.reminders(
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   lead_id UUID NOT NULL REFERENCES public.sales_leads(id) ON UPDATE CASCADE ON DELETE CASCADE,
   content TEXT NOT NULL,
   remind_at TIMESTAMPTZ NOT NULL,
   created_by UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
   workspace_id UUID REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE,
   updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY reminders_select_anon ON public.reminders
FOR SELECT
TO anon
USING (true);

CREATE POLICY reminders_insert_anon ON public.reminders
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY reminders_update_anon ON public.reminders
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY reminders_delete_anon ON public.reminders
FOR DELETE
TO anon
USING (true);

CREATE POLICY reminders_select_authenticated ON public.reminders
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY reminders_insert_authenticated ON public.reminders
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY reminders_update_authenticated ON public.reminders
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY reminders_delete_authenticated ON public.reminders
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY reminders_select_service_role ON public.reminders
FOR SELECT
TO service_role
USING (true);

CREATE POLICY reminders_insert_service_role ON public.reminders
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY reminders_update_service_role ON public.reminders
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY reminders_delete_service_role ON public.reminders
FOR DELETE
TO service_role
USING (true);
