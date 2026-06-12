-- Add product_key to workspace_invitations so seat auto-assignment
-- only assigns the module the invitee was invited from.
ALTER TABLE public.workspace_invitations
  ADD COLUMN IF NOT EXISTS product_key VARCHAR(100);

COMMENT ON COLUMN public.workspace_invitations.product_key
  IS 'Module product key (e.g. sales, hrms) the invitation was sent from. Used for targeted seat assignment on accept.';
