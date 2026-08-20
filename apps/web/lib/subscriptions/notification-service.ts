import 'server-only';

import type { Json } from '@kit/supabase/database';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { transporter } from '~/utils/send-mail';

export type SubscriptionNotificationEvent =
  | 'trial_started'
  | 'trial_ending'
  | 'trial_expired'
  | 'plan_upgraded'
  | 'plan_downgrade_scheduled'
  | 'plan_downgrade_applied'
  | 'module_added'
  | 'module_removed'
  | 'payment_failed'
  | 'subscription_cancelled'
  | 'usage_80'
  | 'usage_100';

type EmitInput = {
  workspaceId: string;
  eventType: SubscriptionNotificationEvent;
  eventKey: string;
  title: string;
  message: string;
  email: boolean;
  actionUrl?: string;
  metadata?: Json;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character] ?? character;
  });

export class SubscriptionNotificationService {
  private readonly client = getSupabaseServerAdminClient();

  async emit(input: EmitInput) {
    const eventResult = await this.client.from('billing_events').upsert(
      {
        workspace_id: input.workspaceId,
        event_type: input.eventType,
        idempotency_key: input.eventKey,
        payload: input.metadata ?? {},
      },
      { onConflict: 'idempotency_key', ignoreDuplicates: true },
    );
    if (eventResult.error) throw eventResult.error;
    const recipients = await this.getRecipients(input.workspaceId);
    const deliveredAt = new Date().toISOString();
    let inApp = 0;
    let emails = 0;

    for (const recipient of recipients) {
      const inAppResult = await this.client
        .from('subscription_notifications')
        .upsert(
          {
            workspace_id: input.workspaceId,
            recipient_id: recipient.id,
            event_type: input.eventType,
            event_key: input.eventKey,
            channel: 'in_app',
            title: input.title,
            message: input.message,
            action_url: input.actionUrl ?? '/org/subscription',
            delivery_status: 'sent',
            delivered_at: deliveredAt,
            metadata: input.metadata ?? {},
          },
          {
            onConflict: 'event_key,recipient_id,channel',
            ignoreDuplicates: true,
          },
        );
      if (!inAppResult.error) inApp += 1;

      if (!input.email || !recipient.email) continue;
      const insertedEmailRow = await this.client
        .from('subscription_notifications')
        .upsert(
          {
            workspace_id: input.workspaceId,
            recipient_id: recipient.id,
            event_type: input.eventType,
            event_key: input.eventKey,
            channel: 'email',
            title: input.title,
            message: input.message,
            action_url: input.actionUrl ?? '/org/subscription',
            delivery_status: 'pending',
            metadata: input.metadata ?? {},
          },
          {
            onConflict: 'event_key,recipient_id,channel',
            ignoreDuplicates: true,
          },
        )
        .select('id, delivery_status')
        .maybeSingle();
      if (insertedEmailRow.error) continue;
      const existingEmailRow = insertedEmailRow.data
        ? null
        : await this.client
            .from('subscription_notifications')
            .select('id, delivery_status')
            .eq('event_key', input.eventKey)
            .eq('recipient_id', recipient.id)
            .eq('channel', 'email')
            .maybeSingle();
      const emailRow = insertedEmailRow.data ?? existingEmailRow?.data;
      if (!emailRow || emailRow.delivery_status === 'sent') continue;

      try {
        await transporter.sendMail({
          from:
            process.env.SMTP_FROM ??
            process.env.SMTP_USER ??
            'noreply@leadgaze.com',
          to: recipient.email,
          subject: `${input.title} - Leadgaze`,
          html: this.renderEmail(input),
        });
        await this.client
          .from('subscription_notifications')
          .update({
            delivery_status: 'sent',
            delivered_at: new Date().toISOString(),
            delivery_error: null,
          })
          .eq('id', emailRow.id);
        emails += 1;
      } catch (error) {
        await this.client
          .from('subscription_notifications')
          .update({
            delivery_status: 'failed',
            delivery_error:
              error instanceof Error
                ? error.message.slice(0, 1000)
                : 'Unknown error',
          })
          .eq('id', emailRow.id);
      }
    }

    return { recipients: recipients.length, inApp, emails };
  }

  async emitBestEffort(input: EmitInput) {
    try {
      return await this.emit(input);
    } catch (error) {
      console.error('[SubscriptionNotification] delivery failed', error);
      return { recipients: 0, inApp: 0, emails: 0 };
    }
  }

  private async getRecipients(workspaceId: string) {
    const workspace = await this.client
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    if (workspace.error) throw workspace.error;

    const roles = await this.client
      .from('workspace_roles')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('role_key', 'admin');
    if (roles.error) throw roles.error;
    const roleIds = (roles.data ?? []).map((role: { id: string }) => role.id);
    const recipientIds = new Set<string>([workspace.data.owner_id]);
    if (roleIds.length) {
      const members = await this.client
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'accepted')
        .in('role_id', roleIds);
      if (members.error) throw members.error;
      for (const member of members.data ?? []) recipientIds.add(member.user_id);
    }
    const accounts = await this.client
      .from('accounts')
      .select('id, email, name')
      .in('id', [...recipientIds]);
    if (accounts.error) throw accounts.error;
    return accounts.data ?? [];
  }

  private renderEmail(input: EmitInput) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const actionUrl = `${appUrl}${input.actionUrl ?? '/org/subscription'}`;
    return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172033"><div style="max-width:560px;margin:32px auto;padding:28px;border:1px solid #e5e7eb;border-radius:16px"><h2>${escapeHtml(input.title)}</h2><p style="line-height:1.6">${escapeHtml(input.message)}</p><a href="${escapeHtml(actionUrl)}" style="display:inline-block;margin-top:12px;padding:11px 18px;border-radius:8px;background:#2563eb;color:white;text-decoration:none">Manage subscription</a><p style="margin-top:28px;color:#64748b;font-size:12px">Leadgaze subscription notification</p></div></body></html>`;
  }
}
