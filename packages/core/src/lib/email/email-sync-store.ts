import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

type SyncedEmailPayload = Record<string, any> & {
  workspace_id: string;
  provider_message_id: string;
  relation?: {
    entity_type: string;
    entity_id: string;
    relation_type?: string;
  } | null;
};

export async function saveSyncedCoreEmails(messages: SyncedEmailPayload[]) {
  if (messages.length === 0) {
    console.log('[CoreEmailSync] No prepared messages to save');
    return 0;
  }

  const supabase = getSupabaseServerAdminClient();
  const workspaceId = messages[0]?.workspace_id;
  const messagesByProviderId = new Map(
    messages.map((message) => [message.provider_message_id, message]),
  );
  const providerMessageIds = Array.from(messagesByProviderId.keys());

  if (!workspaceId) return 0;

  const { data: existingEmails, error: lookupError } = await (supabase as any)
    .schema('core')
    .from('emails')
    .select('id,provider_message_id')
    .eq('workspace_id', workspaceId)
    .in('provider_message_id', providerMessageIds);

  if (lookupError) {
    console.error('[CoreEmailSync] Failed to check existing emails:', lookupError);
    return 0;
  }

  const existingByProviderId = new Map(
    ((existingEmails ?? []) as Array<{ id: string; provider_message_id: string }>)
      .map((email) => [email.provider_message_id, email.id]),
  );

  const toInsert = messages
    .filter((message) => !existingByProviderId.has(message.provider_message_id))
    .map(({ relation, ...emailPayload }) => emailPayload);
  const toUpdate = messages
    .filter((message) => existingByProviderId.has(message.provider_message_id))
    .map(({ relation, ...emailPayload }) => ({
      ...emailPayload,
      id: existingByProviderId.get(emailPayload.provider_message_id),
    }));

  const savedEmails: Array<{ id: string; provider_message_id: string }> = [];

  if (toInsert.length > 0) {
    const { data, error } = await (supabase as any)
      .schema('core')
      .from('emails')
      .insert(toInsert)
      .select('id,provider_message_id');

    if (error) {
      console.error('[CoreEmailSync] Failed to bulk insert emails:', error);
    } else {
      savedEmails.push(...(data ?? []));
    }
  }

  if (toUpdate.length > 0) {
    const { data, error } = await (supabase as any)
      .schema('core')
      .from('emails')
      .upsert(toUpdate)
      .select('id,provider_message_id');

    if (error) {
      console.error('[CoreEmailSync] Failed to bulk update emails:', error);
    } else {
      savedEmails.push(...(data ?? []));
    }
  }

  const relationPayloads = savedEmails
    .map((email) => {
      const message = messagesByProviderId.get(email.provider_message_id);
      const relation = message?.relation;

      if (!message || !relation?.entity_id || !relation.entity_type) return null;

      return {
        workspace_id: message.workspace_id,
        email_id: email.id,
        entity_type: relation.entity_type,
        entity_id: relation.entity_id,
        relation_type: relation.relation_type ?? 'related',
      };
    })
    .filter(Boolean);

  if (relationPayloads.length > 0) {
    const { error } = await (supabase as any)
      .schema('core')
      .from('email_relations')
      .upsert(relationPayloads, { onConflict: 'email_id,entity_type,entity_id' });

    if (error) {
      console.error('[CoreEmailSync] Failed to bulk upsert email relations:', error);
    }
  }

  const savedCount = savedEmails.length;

  console.log('[CoreEmailSync] Save batch complete', {
    workspaceId,
    attemptedCount: messages.length,
    insertCount: toInsert.length,
    updateCount: toUpdate.length,
    relationCount: relationPayloads.length,
    savedCount,
    savedMessages: savedEmails.slice(0, 20).map((email) => {
      const message = messagesByProviderId.get(email.provider_message_id);

      return {
        emailId: email.id,
        providerMessageId: email.provider_message_id,
        subject: message?.subject,
        direction: message?.direction,
      };
    }),
  });

  return savedCount;
}
