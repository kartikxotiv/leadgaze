import { NextRequest, NextResponse } from 'next/server';

//
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { getRelatedEntityIds } from '../_helpers/get-related-entities';
import {
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';

/**
 * GET /api/audit-logs
 * Fetch audit logs for a workspace with filtering
 */
export const getAuditLogs = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient();
    const url = new URL(request.url);

    const workspaceId = url.searchParams.get('workspaceId');
    const module = url.searchParams.get('module');
    const entityId = url.searchParams.get('entityId');
    const entityType = url.searchParams.get('entityType');
    const action = url.searchParams.get('action');
    const actorId = url.searchParams.get('actorId');
    const productKey = url.searchParams.get('productKey');
    const createdAtFrom = url.searchParams.get('createdAtFrom');
    const createdAtTo = url.searchParams.get('createdAtTo');

    // Pagination
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Build target entity IDs if entityId is specified
    let targetEntityIds: string[] | null = null;

    if (entityId) {
      let primaryIds: string[] = [entityId];

      if (entityType) {
        try {
          const related = await getRelatedEntityIds(supabase, entityType, entityId);
          primaryIds = Array.from(new Set(related.map((r) => r.entity_id)));
        } catch (e) {
          console.error('Error fetching related entities for audit logs:', e);
        }
      }

      // Fetch related core table entity IDs (notes, meetings, reminders, documents, tasks, emails, call logs)
      const [
        { data: noteRel },
        { data: meetingRel },
        { data: reminderRel },
        { data: docRel },
        { data: taskRel },
        { data: emailRel },
        { data: calls },
      ] = await Promise.all([
        supabase.schema('core').from('note_relations').select('note_id').in('entity_id', primaryIds),
        supabase.schema('core').from('meeting_relations').select('meeting_id').in('entity_id', primaryIds),
        supabase.schema('core').from('reminder_relations').select('reminder_id').in('entity_id', primaryIds),
        supabase.schema('core').from('document_relations').select('document_id').in('entity_id', primaryIds),
        supabase.schema('core').from('task_relations').select('task_id').in('entity_id', primaryIds),
        supabase.schema('core').from('email_relations').select('email_id').in('entity_id', primaryIds),
        supabase.from('crm_call_logs').select('id').in('entity_id', primaryIds),
      ]);

      const allEntityIdsSet = new Set<string>(primaryIds);
      noteRel?.forEach((r: any) => r.note_id && allEntityIdsSet.add(r.note_id));
      meetingRel?.forEach((r: any) => r.meeting_id && allEntityIdsSet.add(r.meeting_id));
      reminderRel?.forEach((r: any) => r.reminder_id && allEntityIdsSet.add(r.reminder_id));
      docRel?.forEach((r: any) => r.document_id && allEntityIdsSet.add(r.document_id));
      taskRel?.forEach((r: any) => r.task_id && allEntityIdsSet.add(r.task_id));
      emailRel?.forEach((r: any) => r.email_id && allEntityIdsSet.add(r.email_id));
      calls?.forEach((c: any) => c.id && allEntityIdsSet.add(c.id));

      const taskIds = taskRel?.map((t: any) => t.task_id).filter(Boolean) || [];
      if (taskIds.length > 0) {
        const { data: timeLogs } = await supabase
          .schema('core')
          .from('task_time_logs')
          .select('id')
          .in('task_id', taskIds);
        timeLogs?.forEach((tl: any) => tl.id && allEntityIdsSet.add(tl.id));
      }

      targetEntityIds = Array.from(allEntityIdsSet);
    }

    // Build the query
    let query = supabase
      .from('audit_logs')
      .select(
        `
          *,
          actor:accounts!audit_logs_actor_id_fkey(id, email, name)
        `,
        { count: 'exact' },
      )
      .eq('workspace_id', workspaceId);

    if (module) {
      query = query.eq('module', module);
    }

    if (targetEntityIds) {
      query = query.in('entity_id', targetEntityIds);
    }


    if (action) {
      query = query.eq('action', action);
    }

    if (actorId) {
      query = query.eq('actor_id', actorId);
    }

    if (productKey && productKey !== 'all') {
      query = query.eq('product_key', productKey);
    }

    if (createdAtFrom) query = query.gte('created_at', (createdAtFrom.includes('T') ? createdAtFrom : `${createdAtFrom}T00:00:00.000Z`));
    if (createdAtTo) query = query.lte('created_at', (createdAtTo.includes('T') ? createdAtTo : `${createdAtTo}T23:59:59.999Z`));

    const {
      data: logs,
      count,
      error,
    } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get audit logs error:', error);
      throw error;
    }

    // Enrich logs for ALL modules: batch resolve entity titles and strip all raw UUIDs
    if (logs && logs.length > 0) {
      const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

      // Group entity IDs needing title resolution by table type
      const moduleMap: Record<string, Set<string>> = {
        tasks: new Set(),
        notes: new Set(),
        meetings: new Set(),
        reminders: new Set(),
        documents: new Set(),
        emails: new Set(),
        call_logs: new Set(),
        leads: new Set(),
        contacts: new Set(),
        accounts: new Set(),
        opportunities: new Set(),
      };

      logs.forEach((log: any) => {
        const mod = log.module;
        const eId = log.entity_id;

        // Check for task_id references in entity_name or new_data
        if (log.entity_name) {
          const matches = log.entity_name.match(uuidPattern);
          matches?.forEach((id: string) => moduleMap.tasks.add(id));
        }
        if (log.new_data?.task_id) {
          moduleMap.tasks.add(log.new_data.task_id);
        }

        // Add main entity_id if entity_name is missing or contains UUID or fallback prefix
        if (
          !log.entity_name ||
          uuidPattern.test(log.entity_name) ||
          log.entity_name.startsWith('#') ||
          log.entity_name.includes('Unknown')
        ) {
          if (mod === 'core_tasks' || mod === 'tasks') moduleMap.tasks.add(eId);
          else if (mod === 'core_notes' || mod === 'notes') moduleMap.notes.add(eId);
          else if (mod === 'core_meetings' || mod === 'meetings') moduleMap.meetings.add(eId);
          else if (mod === 'core_reminders' || mod === 'reminders') moduleMap.reminders.add(eId);
          else if (mod === 'core_documents' || mod === 'documents') moduleMap.documents.add(eId);
          else if (mod === 'core_emails' || mod === 'emails') moduleMap.emails.add(eId);
          else if (mod === 'call_logs') moduleMap.call_logs.add(eId);
          else if (mod === 'leads') moduleMap.leads.add(eId);
          else if (mod === 'contacts') moduleMap.contacts.add(eId);
          else if (mod === 'accounts') moduleMap.accounts.add(eId);
          else if (mod === 'opportunities') moduleMap.opportunities.add(eId);
        }
      });

      // Batch queries in parallel across tables
      const titleMap = new Map<string, string>();

      await Promise.all([
        moduleMap.tasks.size > 0
          ? supabase
              .schema('core')
              .from('tasks')
              .select('id, title')
              .in('id', Array.from(moduleMap.tasks))
              .then(({ data }) => data?.forEach((t: any) => titleMap.set(t.id, t.title)))
          : Promise.resolve(),
        moduleMap.notes.size > 0
          ? supabase
              .schema('core')
              .from('notes')
              .select('id, note')
              .in('id', Array.from(moduleMap.notes))
              .then(({ data }) => data?.forEach((n: any) => titleMap.set(n.id, n.note ? `Note: ${n.note.slice(0, 50)}` : '')))
          : Promise.resolve(),
        moduleMap.meetings.size > 0
          ? supabase
              .schema('core')
              .from('meetings')
              .select('id, title')
              .in('id', Array.from(moduleMap.meetings))
              .then(({ data }) => data?.forEach((m: any) => titleMap.set(m.id, m.title)))
          : Promise.resolve(),
        moduleMap.reminders.size > 0
          ? supabase
              .schema('core')
              .from('reminders')
              .select('id, title')
              .in('id', Array.from(moduleMap.reminders))
              .then(({ data }) => data?.forEach((r: any) => titleMap.set(r.id, r.title)))
          : Promise.resolve(),
        moduleMap.documents.size > 0
          ? supabase
              .schema('core')
              .from('documents')
              .select('id, name')
              .in('id', Array.from(moduleMap.documents))
              .then(({ data }) => data?.forEach((d: any) => titleMap.set(d.id, d.name)))
          : Promise.resolve(),
        moduleMap.emails.size > 0
          ? supabase
              .schema('core')
              .from('emails')
              .select('id, subject')
              .in('id', Array.from(moduleMap.emails))
              .then(({ data }) => data?.forEach((e: any) => titleMap.set(e.id, e.subject)))
          : Promise.resolve(),
        moduleMap.call_logs.size > 0
          ? supabase
              .from('crm_call_logs')
              .select('id, subject')
              .in('id', Array.from(moduleMap.call_logs))
              .then(({ data }) => data?.forEach((c: any) => titleMap.set(c.id, c.subject)))
          : Promise.resolve(),
        moduleMap.leads.size > 0
          ? supabase
              .from('crm_leads')
              .select('id, first_name, last_name')
              .in('id', Array.from(moduleMap.leads))
              .then(({ data }) => data?.forEach((l: any) => titleMap.set(l.id, `${l.first_name || ''} ${l.last_name || ''}`.trim())))
          : Promise.resolve(),
        moduleMap.contacts.size > 0
          ? supabase
              .from('crm_contacts')
              .select('id, first_name, last_name')
              .in('id', Array.from(moduleMap.contacts))
              .then(({ data }) => data?.forEach((c: any) => titleMap.set(c.id, `${c.first_name || ''} ${c.last_name || ''}`.trim())))
          : Promise.resolve(),
        moduleMap.accounts.size > 0
          ? supabase
              .from('crm_accounts')
              .select('id, account_name')
              .in('id', Array.from(moduleMap.accounts))
              .then(({ data }) => data?.forEach((a: any) => titleMap.set(a.id, a.account_name)))
          : Promise.resolve(),
        moduleMap.opportunities.size > 0
          ? supabase
              .from('crm_opportunities')
              .select('id, opportunity_name')
              .in('id', Array.from(moduleMap.opportunities))
              .then(({ data }) => data?.forEach((o: any) => titleMap.set(o.id, o.opportunity_name)))
          : Promise.resolve(),
      ]);

      // Apply entity name updates & strip all raw UUIDs
      logs.forEach((log: any) => {
        // If title is available for entity_id and entity_name is missing/fallback
        if (titleMap.has(log.entity_id) && (!log.entity_name || uuidPattern.test(log.entity_name) || log.entity_name.startsWith('#'))) {
          log.entity_name = titleMap.get(log.entity_id);
        }

        // Replace embedded UUIDs (e.g. Task <uuid>) with actual titles or clean string
        if (log.entity_name) {
          log.entity_name = log.entity_name
            .replace(uuidPattern, (match: string) => {
              const title = titleMap.get(match);
              return title ? `"${title}"` : '';
            })
            .replace(/^#\s*/, '')
            .replace(/#[0-9a-f]{8,}/gi, '')
            .replace(/\s+Task\s*""/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        }

        // Detect soft-delete updates and map action to DELETE
        const newIsDeleted =
          log.new_data?.is_deleted === true ||
          log.new_data?.is_deleted === 'true' ||
          Boolean(log.new_data?.deleted_at);
        const oldIsDeleted =
          log.old_data?.is_deleted === true ||
          log.old_data?.is_deleted === 'true' ||
          Boolean(log.old_data?.deleted_at);
        if (log.action === 'UPDATE' && newIsDeleted && !oldIsDeleted) {
          log.action = 'DELETE';
        }

        // If entity_name still equals raw UUID or empty fallback string, clear it so no raw ID displays
        if (log.entity_name && uuidPattern.test(log.entity_name)) {
          log.entity_name = '';
        }
      });
    }

    return successDataResponse('Audit logs retrieved successfully', {
      logs: logs || [],
      count: count || 0,
      page,
      limit,
    });
  },
);
