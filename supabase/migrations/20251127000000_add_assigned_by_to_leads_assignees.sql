ALTER TABLE public.leads_assignees
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES public.users(user_id) ON UPDATE CASCADE ON DELETE SET NULL;

COMMENT ON COLUMN public.leads_assignees.assigned_by IS 'User who assigned this lead to the assignee';

