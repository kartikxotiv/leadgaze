-- Create tables to track sent notifications to prevent duplicates

-- Table to track sent reminder notifications
CREATE TABLE IF NOT EXISTS public.reminder_notifications_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id UUID NOT NULL REFERENCES public.crm_reminders(id) ON DELETE CASCADE,
  sent_to UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure we don't send duplicate notifications for the same reminder
  UNIQUE(reminder_id, sent_to)
);

CREATE INDEX IF NOT EXISTS idx_reminder_notifications_reminder ON public.reminder_notifications_sent(reminder_id);
CREATE INDEX IF NOT EXISTS idx_reminder_notifications_sent_at ON public.reminder_notifications_sent(sent_at);

-- Table to track sent meeting notifications with interval tracking
CREATE TABLE IF NOT EXISTS public.meeting_notifications_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.crm_meetings(id) ON DELETE CASCADE,
  sent_to UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  interval_minutes INTEGER NOT NULL, -- 60, 30, 5 (minutes before meeting)
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure we don't send duplicate notifications for the same meeting and interval
  UNIQUE(meeting_id, sent_to, interval_minutes)
);

CREATE INDEX IF NOT EXISTS idx_meeting_notifications_meeting ON public.meeting_notifications_sent(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notifications_interval ON public.meeting_notifications_sent(interval_minutes);
CREATE INDEX IF NOT EXISTS idx_meeting_notifications_sent_at ON public.meeting_notifications_sent(sent_at);

-- Enable RLS
ALTER TABLE public.reminder_notifications_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Policies (service_role can manage these)
CREATE POLICY reminder_notifications_policy ON public.reminder_notifications_sent
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY meeting_notifications_policy ON public.meeting_notifications_sent
  FOR ALL TO service_role USING (true) WITH CHECK (true);
