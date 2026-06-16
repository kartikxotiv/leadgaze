import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

type SyncedEmailPayload = Record<string, any> & {
  workspace_id: string;
  provider_message_id: string;
  internet_message_id?: string | null;
  relation?: {
    entity_type: string;
    entity_id: string;
    relation_type?: string;
  } | null;
};

const DEFAULT_EMAIL_SAVE_BATCH_SIZE = 100;

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  handler: (batch: T[]) => Promise<R>,
) {
  const results: R[] = [];

  for (const batch of chunkArray(items, batchSize)) {
    results.push(await handler(batch));
  }

  return results;
}

export async function saveSyncedCoreEmails(messages: SyncedEmailPayload[]) {
  if (messages.length === 0) {
    console.log('[CoreEmailSync] No prepared messages to save');
    return 0;
  }

  const supabase = getSupabaseServerAdminClient();
  const saveBatchSize = positiveInteger(
    process.env.CORE_EMAIL_SAVE_BATCH_SIZE,
    DEFAULT_EMAIL_SAVE_BATCH_SIZE,
  );
  const workspaceId = messages[0]?.workspace_id;
  const messagesByProviderId = new Map(
    messages.map((message) => [message.provider_message_id, message]),
  );
  const providerMessageIds = Array.from(messagesByProviderId.keys());
  const internetMessageIds = Array.from(
    new Set(
      messages.map((message) => message.internet_message_id).filter(Boolean),
    ),
  );

  if (!workspaceId) return 0;

  const [existingByProviderResults, existingByInternetResults] =
    await Promise.all([
      runInBatches(providerMessageIds, saveBatchSize, async (ids) =>
        (supabase as any)
          .schema('core')
          .from('emails')
          .select('id,provider_message_id,internet_message_id')
          .eq('workspace_id', workspaceId)
          .in('provider_message_id', ids),
      ),
      runInBatches(internetMessageIds, saveBatchSize, async (ids) =>
        (supabase as any)
          .schema('core')
          .from('emails')
          .select('id,provider_message_id,internet_message_id')
          .eq('workspace_id', workspaceId)
          .in('internet_message_id', ids),
      ),
    ]);

  const existingLookupError =
    existingByProviderResults.find((result) => result.error)?.error ??
    existingByInternetResults.find((result) => result.error)?.error;

  if (existingLookupError) {
    console.error(
      '[CoreEmailSync] Failed to check existing emails:',
      existingLookupError,
    );
    return 0;
  }

  const existingEmails = [
    ...existingByProviderResults.flatMap((result) => result.data ?? []),
    ...existingByInternetResults.flatMap((result) => result.data ?? []),
  ];
  const existingByProviderId = new Map(
    (
      existingEmails as Array<{
        id: string;
        provider_message_id?: string | null;
      }>
    )
      .filter((email) => email.provider_message_id)
      .map((email) => [email.provider_message_id, email.id]),
  );
  const existingByInternetId = new Map(
    (
      existingEmails as Array<{
        id: string;
        internet_message_id?: string | null;
      }>
    )
      .filter((email) => email.internet_message_id)
      .map((email) => [email.internet_message_id, email.id]),
  );

  const toInsert = messages
    .filter(
      (message) =>
        !existingByProviderId.has(message.provider_message_id) &&
        !existingByInternetId.has(message.internet_message_id),
    )
    .map(({ relation, ...emailPayload }) => emailPayload);
  const toUpdate = messages
    .filter(
      (message) =>
        existingByProviderId.has(message.provider_message_id) ||
        existingByInternetId.has(message.internet_message_id),
    )
    .map(({ relation, ...emailPayload }) => ({
      ...emailPayload,
      id:
        existingByProviderId.get(emailPayload.provider_message_id) ??
        existingByInternetId.get(emailPayload.internet_message_id),
    }));

  const savedEmails: Array<{
    id: string;
    provider_message_id: string;
    internet_message_id?: string | null;
  }> = [];

  if (toInsert.length > 0) {
    const insertResults = await runInBatches(
      toInsert,
      saveBatchSize,
      async (batch) =>
        (supabase as any)
          .schema('core')
          .from('emails')
          .insert(batch)
          .select('id,provider_message_id,internet_message_id'),
    );

    insertResults.forEach(({ data, error }) => {
      if (error) {
        console.error('[CoreEmailSync] Failed to bulk insert emails:', error);
      } else {
        savedEmails.push(...(data ?? []));
      }
    });
  }

  if (toUpdate.length > 0) {
    const updateResults = await runInBatches(
      toUpdate,
      saveBatchSize,
      async (batch) =>
        (supabase as any)
          .schema('core')
          .from('emails')
          .upsert(batch)
          .select('id,provider_message_id,internet_message_id'),
    );

    updateResults.forEach(({ data, error }) => {
      if (error) {
        console.error('[CoreEmailSync] Failed to bulk update emails:', error);
      } else {
        savedEmails.push(...(data ?? []));
      }
    });
  }

  const relationPayloads = savedEmails
    .map((email) => {
      const message =
        messagesByProviderId.get(email.provider_message_id) ??
        messages.find(
          (item) => item.internet_message_id === email.internet_message_id,
        );
      const relation = message?.relation;

      if (!message || !relation?.entity_id || !relation.entity_type)
        return null;

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
    const relationResults = await runInBatches(
      relationPayloads,
      saveBatchSize,
      async (batch) =>
        (supabase as any).schema('core').from('email_relations').upsert(batch, {
          onConflict: 'email_id,entity_type,entity_id',
        }),
    );

    relationResults.forEach(({ error }) => {
      if (error) {
        console.error(
          '[CoreEmailSync] Failed to bulk upsert email relations:',
          error,
        );
      }
    });
  }

  const savedCount = savedEmails.length;

  console.log('[CoreEmailSync] Save batch complete', {
    workspaceId,
    attemptedCount: messages.length,
    insertCount: toInsert.length,
    updateCount: toUpdate.length,
    relationCount: relationPayloads.length,
    saveBatchSize,
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
