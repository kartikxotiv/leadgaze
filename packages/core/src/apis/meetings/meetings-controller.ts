/**
 * Core Meetings Controller
 * Handles CRUD operations for meetings with full platform support
 */
import { NextResponse } from 'next/server';

import { catchAsync, successDataResponse } from '../../utils/response-handler';
import { assertCoreWorkspaceAccess } from '../_shared/workspace-access';

// =============================================================================
// MEETING CONTROLLERS
// =============================================================================

// Map UI sales entity types to database convention (sales_*)
function toDbEntityType(type: string): string {
  const salesTypes = ['lead', 'contact', 'account', 'opportunity'];
  if (salesTypes.includes(type)) {
    return `sales_${type}`;
  }
  return type;
}

// Map database convention (sales_*) back to UI types
function toUiEntityType(type: string | null): string | null {
  if (!type) return null;
  if (type.startsWith('sales_')) {
    return type.substring(6);
  }
  return type;
}

// Get entity name based on entity type and ID
async function getEntityName(
  supabase: any,
  entityType: string,
  entityId: string,
): Promise<string | null> {
  try {
    switch (entityType) {
      case 'lead': {
        const { data } = await supabase
          .from('crm_leads')
          .select('first_name, last_name')
          .eq('id', entityId)
          .single();
        if (data) {
          return `${data.first_name || ''} ${data.last_name || ''}`.trim() || null;
        }
        break;
      }
      case 'account': {
        const { data } = await supabase
          .from('crm_accounts')
          .select('account_name')
          .eq('id', entityId)
          .single();
        return data?.account_name || null;
      }
      case 'contact': {
        const { data } = await supabase
          .from('crm_contacts')
          .select('first_name, last_name')
          .eq('id', entityId)
          .single();
        if (data) {
          return `${data.first_name || ''} ${data.last_name || ''}`.trim() || null;
        }
        break;
      }
      case 'opportunity': {
        const { data } = await supabase
          .from('crm_opportunities')
          .select('opportunity_name')
          .eq('id', entityId)
          .single();
        return data?.opportunity_name || null;
      }
    }
  } catch (error) {
    console.error(`Error fetching entity name for ${entityType}:${entityId}`, error);
  }
  return null;
}

/**
 * GET /api/core/meetings
 * Fetch meetings with optional filters
 */
export const getMeetingsController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const entityType = url.searchParams.get('entityType');
  const entityId = url.searchParams.get('entityId');
  const meetingType = url.searchParams.get('meetingType');
  const provider = url.searchParams.get('provider');
  const status = url.searchParams.get('status');
  const hostUserId = url.searchParams.get('hostUserId');
  const id = url.searchParams.get('id');
  const includeParticipantMeetings = url.searchParams.get(
    'includeParticipantMeetings',
  );
  const participantUserId = url.searchParams.get('participantUserId');
  const view = url.searchParams.get('view') || 'my';
  const createdAtFrom = url.searchParams.get('createdAtFrom');
  const createdAtTo = url.searchParams.get('createdAtTo');
  const updatedAtFrom = url.searchParams.get('updatedAtFrom');
  const updatedAtTo = url.searchParams.get('updatedAtTo');
  const createdByIds = url.searchParams.get('createdByIds');
  const statuses = url.searchParams.get('statuses');
  const timeframe = url.searchParams.get('timeframe');
  const searchTerm = url.searchParams.get('searchTerm');

  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: 'workspaceId query parameter is required' },
      { status: 400 },
    );
  }

  const { supabase, user, error } =
    await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  // Determine the user ID to filter by for participant meetings
  // Use participantUserId if provided, otherwise fall back to current user
  const userIdForParticipant = participantUserId || user.id;

  try {
    // Check if user is the workspace owner
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    const isWorkspaceOwner = workspace?.owner_id === user.id;

    // Check if user is an admin
    const { data: members } = await supabase
      .from('workspace_members')
      .select(`
        product_key,
        role:workspace_roles!workspace_members_role_id_fkey(
          role_key,
          hierarchy_level
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const member = members?.find((m: any) => m.product_key === 'sales')
      || members?.find((m: any) => m.product_key === null)
      || members?.[0];

    const roleData = Array.isArray(member?.role) ? member.role[0] : member?.role;
    const userLevel = roleData?.hierarchy_level ?? 0;
    const isAdmin = roleData?.role_key === 'admin' || userLevel >= 100;

    const shouldShowAll = (isWorkspaceOwner || isAdmin) && view === 'team';

    // Get all meeting IDs the user is associated with (as creator, host, or participant)
    let meetingIds: string[] | null = null;

    if (!shouldShowAll) {
      const userAssociatedMeetingIds = new Set<string>();

      // 1. Participant meetings (matches user ID or user email)
      let participantQuery = (supabase as any)
        .schema('core')
        .from('meeting_participants')
        .select('meeting_id')
        .eq('workspace_id', workspaceId);

      if (user.email) {
        participantQuery = participantQuery.or(`internal_user_id.eq.${userIdForParticipant},external_email.eq.${user.email}`);
      } else {
        participantQuery = participantQuery.eq('internal_user_id', userIdForParticipant);
      }

      const { data: participantData } = await participantQuery;

      if (participantData) {
        participantData.forEach((p: { meeting_id: string }) =>
          userAssociatedMeetingIds.add(p.meeting_id),
        );
      }

      // 2. Host meetings
      const { data: hostMeetingData } = await (supabase as any)
        .schema('core')
        .from('meetings')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('host_user_id', userIdForParticipant)
        .eq('is_deleted', false);

      if (hostMeetingData) {
        hostMeetingData.forEach((m: { id: string }) =>
          userAssociatedMeetingIds.add(m.id),
        );
      }

      // 3. Creator meetings
      const { data: createdMeetingData } = await (supabase as any)
        .schema('core')
        .from('meetings')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('created_by', userIdForParticipant)
        .eq('is_deleted', false);

      if (createdMeetingData) {
        createdMeetingData.forEach((m: { id: string }) =>
          userAssociatedMeetingIds.add(m.id),
        );
      }

      const associatedIds = Array.from(userAssociatedMeetingIds);

      // If filtering by entity, we intersect entity meetings with user associated meetings
      if (entityType || entityId) {
        let relQuery = (supabase as any)
          .schema('core')
          .from('meeting_relations')
          .select('meeting_id')
          .eq('workspace_id', workspaceId);

        if (entityType) relQuery = relQuery.eq('entity_type', toDbEntityType(entityType));
        if (entityId) relQuery = relQuery.eq('entity_id', entityId);

        const { data: relData, error: relError } = await relQuery;
        if (relError) throw relError;

        const matchedIds = (relData ?? []).map(
          (r: { meeting_id: string }) => r.meeting_id,
        ) as string[];

        meetingIds = matchedIds.filter((mid) => userAssociatedMeetingIds.has(mid));
      } else {
        meetingIds = associatedIds;
      }

      // If associated meeting list is empty, return empty results immediately
      if (!meetingIds || meetingIds.length === 0) {
        return successDataResponse('Meetings retrieved', id ? null : []);
      }
    } else {
      // For workspace owner / admin viewing all meetings, only filter by entity if requested
      if (entityType || entityId) {
        let relQuery = (supabase as any)
          .schema('core')
          .from('meeting_relations')
          .select('meeting_id')
          .eq('workspace_id', workspaceId);

        if (entityType) relQuery = relQuery.eq('entity_type', toDbEntityType(entityType));
        if (entityId) relQuery = relQuery.eq('entity_id', entityId);

        const { data: relData, error: relError } = await relQuery;
        if (relError) throw relError;

        meetingIds = Array.from(new Set((relData ?? []).map((r: { meeting_id: string }) => r.meeting_id))) as string[];
        if (meetingIds.length === 0) {
          return successDataResponse('Meetings retrieved', id ? null : []);
        }
      }
    }

    // Build main query
    let query = (supabase as any)
      .schema('core')
      .from('meetings')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false);

    if (id) query = query.eq('id', id).maybeSingle();
    if (meetingIds) query = query.in('id', meetingIds);
    if (meetingType) query = query.eq('meeting_type', meetingType);
    if (provider) query = query.eq('provider', provider);
    if (status) query = query.eq('status', status);
    if (hostUserId) query = query.eq('host_user_id', hostUserId);

    if (createdAtFrom) query = query.gte('created_at', (createdAtFrom.includes('T') ? createdAtFrom : `${createdAtFrom}T00:00:00.000Z`));
    if (createdAtTo) query = query.lte('created_at', (createdAtTo.includes('T') ? createdAtTo : `${createdAtTo}T23:59:59.999Z`));
    if (updatedAtFrom) query = query.gte('updated_at', (updatedAtFrom.includes('T') ? updatedAtFrom : `${updatedAtFrom}T00:00:00.000Z`));
    if (updatedAtTo) query = query.lte('updated_at', (updatedAtTo.includes('T') ? updatedAtTo : `${updatedAtTo}T23:59:59.999Z`));

    if (createdByIds && createdByIds !== 'all') {
      const ids = createdByIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (ids.length === 1) {
        query = query.eq('created_by', ids[0]);
      } else if (ids.length > 1) {
        query = query.in('created_by', ids);
      }
    }

    if (statuses) {
      const statusList = statuses.split(',').map((s) => s.trim()).filter(Boolean);
      if (statusList.length === 1) {
        query = query.eq('status', statusList[0]);
      } else if (statusList.length > 1) {
        query = query.in('status', statusList);
      }
    }
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    if (!id) {
      query = query.order('scheduled_start', {
        ascending: false,
        nullsFirst: false,
      });
    }

    const { data, error: fetchError } = await query;
    if (fetchError) {
      console.error('Fetch meetings error:', fetchError);
      return NextResponse.json(
        { success: false, message: 'Failed to retrieve meetings' },
        { status: 500 },
      );
    }

    if (!data) {
      return successDataResponse('Meetings retrieved', id ? null : []);
    }

    // Get relations and participants for each meeting
    let meetings = Array.isArray(data) ? data : [data];

    // Filter out old meetings (more than 1 day past end time)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    meetings = meetings.filter((meeting) => {
      const endTime = new Date(meeting.actual_end || meeting.scheduled_end || meeting.end_time);
      // Show if end time is in the future OR within last 1 day
      return endTime >= oneDayAgo;
    });

    if (timeframe) {
      const timeframeList = timeframe.split(',').map((t) => t.trim()).filter(Boolean);
      if (timeframeList.length > 0 && timeframeList.length < 2) {
        const checkTime = new Date();
        meetings = meetings.filter((meeting) => {
          const start = meeting.scheduled_start || meeting.actual_start || meeting.start_time;
          if (!start) return timeframeList.includes('upcoming');
          const meetingDate = new Date(start);
          const isUpcoming =
            meetingDate >= checkTime &&
            meeting.status !== 'completed' &&
            meeting.status !== 'cancelled';
          if (timeframeList.includes('upcoming')) return isUpcoming;
          if (timeframeList.includes('past')) return !isUpcoming;
          return true;
        });
      }
    }

    const meetingIdsToFetch = meetings.map((m: { id: string }) => m.id);

    if (meetingIdsToFetch.length > 0) {
      // Fetch relations
      const { data: relations } = await (supabase as any)
        .schema('core')
        .from('meeting_relations')
        .select('*')
        .in('meeting_id', meetingIdsToFetch);

      // Fetch participants
      const { data: participants } = await (supabase as any)
        .schema('core')
        .from('meeting_participants')
        .select('*')
        .in('meeting_id', meetingIdsToFetch);

      // Collect all user IDs that need account lookups (cross-schema)
      const userIds = new Set<string>();
      meetings.forEach((m: { host_user_id?: string | null }) => {
        if (m.host_user_id) userIds.add(m.host_user_id);
      });
      (participants ?? []).forEach(
        (p: { internal_user_id?: string | null }) => {
          if (p.internal_user_id) userIds.add(p.internal_user_id);
        },
      );

      // Fetch accounts from public schema (cross-schema join not supported by PostgREST)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let accountsMap: Record<string, any> = {};
      if (userIds.size > 0) {
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('id, name, email')
          .in('id', Array.from(userIds));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (accountsData ?? []).forEach((a: any) => {
          accountsMap[a.id] = a;
        });
      }

      // Enrich participants with internal_user data
      const enrichedParticipants = (participants ?? []).map((p: any) => ({
        ...p,
        internal_user: p.internal_user_id
          ? (accountsMap[p.internal_user_id] ?? null)
          : null,
      }));

      // Attach to meetings with entity name fetching
      const enrichedMeetings = await Promise.all(
        meetings.map(async (meeting: any) => {
          const rel = (relations ?? []).find(
            (r: { meeting_id: string }) => r.meeting_id === meeting.id,
          );
          const rawType = rel?.entity_type ?? null;
          const uiType = toUiEntityType(rawType);
          const entityIdVal = rel?.entity_id ?? null;
          const entityName = (uiType && entityIdVal)
            ? await getEntityName(supabase, uiType, entityIdVal)
            : null;

          return {
            ...meeting,
            host: meeting.host_user_id
              ? (accountsMap[meeting.host_user_id] ?? null)
              : null,
            relations: (relations ?? []).filter(
              (r: { meeting_id: string }) => r.meeting_id === meeting.id,
            ),
            participants: enrichedParticipants.filter(
              (p: { meeting_id: string }) => p.meeting_id === meeting.id,
            ),
            entity_type: uiType,
            entity_id: entityIdVal,
            entity_name: entityName,
          };
        })
      );

      return successDataResponse(
        'Meetings retrieved',
        Array.isArray(data) ? enrichedMeetings : (enrichedMeetings[0] ?? null),
      );
    }

    return successDataResponse('Meetings retrieved', data);
  } catch (fetchError) {
    console.error('Fetch meetings error:', fetchError);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve meetings' },
      { status: 500 },
    );
  }
});

/**
 * POST /api/core/meetings
 * Create a new meeting (logged or scheduled)
 */
export const createMeetingController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const workspaceId = body.workspace_id ?? body.workspaceId;
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, message: 'workspace_id is required' },
      { status: 400 },
    );
  }

  if (!body.title) {
    return NextResponse.json(
      { success: false, message: 'title is required' },
      { status: 400 },
    );
  }

  const { supabase, user, error } =
    await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  try {
    // Build meeting payload
    const meetingPayload: Record<string, unknown> = {
      workspace_id: workspaceId,
      meeting_type: body.meeting_type ?? body.meetingType ?? 'scheduled',
      provider: body.provider ?? 'MANUAL',
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? 'scheduled',
      scheduled_start:
        body.scheduled_start ?? body.scheduledStart ?? body.start_time ?? null,
      scheduled_end:
        body.scheduled_end ?? body.scheduledEnd ?? body.end_time ?? null,
      actual_start: body.actual_start ?? body.actualStart ?? null,
      actual_end: body.actual_end ?? body.actualEnd ?? null,
      timezone: body.timezone ?? 'UTC',
      meeting_url: body.meeting_url ?? body.meetingUrl ?? null,
      provider_event_id: body.provider_event_id ?? body.providerEventId ?? null,
      provider_meeting_id:
        body.provider_meeting_id ?? body.providerMeetingId ?? null,
      host_user_id: body.host_user_id ?? body.hostUserId ?? user.id,
      meeting_host_email_account_id:
        body.meeting_host_email_account_id ??
        body.meetingHostEmailAccountId ??
        null,
      location: body.location ?? null,
      created_by: user.id,
      updated_by: user.id,
    };

    // Insert meeting
    const { data: meeting, error: meetingError } = await (supabase as any)
      .schema('core')
      .from('meetings')
      .insert(meetingPayload)
      .select('*')
      .single();

    if (meetingError) {
      console.error('Create meeting error:', meetingError);
      return NextResponse.json(
        { success: false, message: 'Failed to create meeting' },
        { status: 500 },
      );
    }

    // Handle relations
    const relations: Array<{ entity_type: string; entity_id: string }> = [];
    if (body.entity_type && body.entity_id) {
      relations.push({
        entity_type: body.entity_type,
        entity_id: body.entity_id,
      });
    }
    if (Array.isArray(body.relations)) {
      relations.push(
        ...body.relations
          .map(
            (r: {
              entity_type?: string;
              entityType?: string;
              entity_id?: string;
              entityId?: string;
            }) => ({
              entity_type: r.entity_type ?? r.entityType,
              entity_id: r.entity_id ?? r.entityId,
            }),
          )
          .filter(
            (r: { entity_type: string; entity_id: string }) =>
              r.entity_type && r.entity_id,
          ),
      );
    }

    // Deduplicate relations
    const uniqueRelations = [
      ...new Map(
        relations.map((r) => [`${r.entity_type}:${r.entity_id}`, r]),
      ).values(),
    ];

    if (uniqueRelations.length > 0) {
      const relationRows = uniqueRelations.map((rel) => ({
        workspace_id: workspaceId,
        meeting_id: meeting.id,
        entity_type: toDbEntityType(rel.entity_type),
        entity_id: rel.entity_id,
      }));

      await (supabase as any)
        .schema('core')
        .from('meeting_relations')
        .insert(relationRows);
    }

    // Handle participants
    if (Array.isArray(body.participants) && body.participants.length > 0) {
      console.log(
        '[createMeeting] Inserting participants:',
        JSON.stringify(body.participants),
      );
      const participantRows = body.participants.map(
        (p: {
          participant_type?: string;
          internal_user_id?: string;
          external_email?: string;
          display_name?: string;
          is_host?: boolean;
          response_status?: string;
        }) => ({
          workspace_id: workspaceId,
          meeting_id: meeting.id,
          participant_type: p.participant_type ?? 'INTERNAL',
          internal_user_id: p.internal_user_id ?? null,
          external_email: p.external_email ?? null,
          display_name: p.display_name ?? null,
          is_host: p.is_host ?? false,
          response_status: 'ACCEPTED',
        }),
      );

      const { error: participantError } = await (supabase as any)
        .schema('core')
        .from('meeting_participants')
        .insert(participantRows);

      if (participantError) {
        console.error('Insert participants error:', participantError);
        // Don't fail the whole request, just log the error
      } else {
        console.log(
          '[createMeeting] Successfully inserted',
          participantRows.length,
          'participants',
        );
      }
    } else {
      console.log(
        '[createMeeting] No participants to insert. body.participants:',
        body.participants,
      );
    }

    // Handle reminders
    if (Array.isArray(body.reminders) && body.reminders.length > 0) {
      const meetingStartTime = meetingPayload.scheduled_start as string;
      if (meetingStartTime) {
        const reminderRows = body.reminders.map(
          (r: { offset_minutes: number; channel?: string }) => {
            const scheduledAt = new Date(
              new Date(meetingStartTime).getTime() -
                r.offset_minutes * 60 * 1000,
            );
            return {
              workspace_id: workspaceId,
              meeting_id: meeting.id,
              offset_minutes: r.offset_minutes,
              channel: r.channel ?? 'EMAIL',
              scheduled_at: scheduledAt.toISOString(),
              status: 'pending',
            };
          },
        );

        await (supabase as any)
          .schema('core')
          .from('meeting_reminders')
          .insert(reminderRows);
      }
    }

    // Fetch the complete meeting with relations
    const { data: completeMeeting } = await (supabase as any)
      .schema('core')
      .from('meetings')
      .select('*')
      .eq('id', meeting.id)
      .single();

    return NextResponse.json(
      {
        success: true,
        message: 'Meeting created successfully',
        data: completeMeeting ?? meeting,
      },
      { status: 201 },
    );
  } catch (createError) {
    console.error('Create meeting error:', createError);
    return NextResponse.json(
      { success: false, message: 'Failed to create meeting' },
      { status: 500 },
    );
  }
});

/**
 * PATCH /api/core/meetings
 * Update a meeting (also syncs with Google Calendar if linked)
 */
export const updateMeetingController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;

  if (!body?.id || !workspaceId) {
    return NextResponse.json(
      { success: false, message: 'id and workspace_id are required' },
      { status: 400 },
    );
  }

  const { supabase, user, error } =
    await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  try {
    // First, fetch the meeting to check if it's linked to Google Calendar
    const { data: existingMeeting } = await (supabase as any)
      .schema('core')
      .from('meetings')
      .select('provider_event_id, meeting_host_email_account_id, provider, scheduled_start, scheduled_end')
      .eq('workspace_id', workspaceId)
      .eq('id', body.id)
      .eq('is_deleted', false)
      .maybeSingle();

    // If meeting is linked to Google Calendar, update it there too
    if (
      existingMeeting?.provider_event_id &&
      existingMeeting?.meeting_host_email_account_id &&
      existingMeeting?.provider === 'GOOGLE'
    ) {
      try {
        // Get tokens for the account
        const { data: tokens } = await (supabase as any)
          .schema('core')
          .from('integration_tokens')
          .select('*')
          .eq('account_id', existingMeeting.meeting_host_email_account_id)
          .maybeSingle();

        if (tokens?.access_token && tokens?.refresh_token) {
          const { google } = await import('googleapis');
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
          );

          oauth2Client.setCredentials({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expires_at
              ? new Date(tokens.expires_at).getTime()
              : undefined,
          });

          // Refresh token if needed
          const expiryTime = tokens.expires_at
            ? new Date(tokens.expires_at).getTime()
            : 0;
          if (Date.now() >= expiryTime - 5 * 60 * 1000) {
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);
          }

          const calendar = google.calendar({
            version: 'v3',
            auth: oauth2Client,
          });

          // Build Google Calendar update payload
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const event: any = {};
          if (body.title !== undefined) event.summary = body.title;
          if (body.description !== undefined)
            event.description = body.description;
          if (body.scheduled_start || body.scheduledStart) {
            event.start = {
              dateTime: body.scheduled_start ?? body.scheduledStart,
              timeZone: body.timezone ?? 'UTC',
            };
          }
          if (body.scheduled_end || body.scheduledEnd) {
            event.end = {
              dateTime: body.scheduled_end ?? body.scheduledEnd,
              timeZone: body.timezone ?? 'UTC',
            };
          }

          // Update attendees if provided
          if (body.attendees && Array.isArray(body.attendees)) {
            event.attendees = body.attendees.map(
              (a: { email: string; display_name?: string }) => ({
                email: a.email,
                displayName: a.display_name,
              }),
            );
          }

          // Only update if there's something to update
          if (Object.keys(event).length > 0) {
            await calendar.events.patch({
              calendarId: 'primary',
              eventId: existingMeeting.provider_event_id,
              requestBody: event,
              sendUpdates: body.send_invites !== false ? 'all' : 'none',
            });
          }
        }
      } catch (googleError) {
        // Log error but continue with local update
        console.error('Failed to update Google Calendar event:', googleError);
      }
    }

    // If meeting is linked to Zoom, update it there too
    if (
      existingMeeting?.provider_event_id &&
      existingMeeting?.meeting_host_email_account_id &&
      existingMeeting?.provider === 'ZOOM'
    ) {
      try {
        console.log(
          '[Zoom Update] Fetching tokens for account:',
          existingMeeting.meeting_host_email_account_id,
        );
        const { data: tokens } = await (supabase as any)
          .schema('core')
          .from('integration_tokens')
          .select('*')
          .eq('account_id', existingMeeting.meeting_host_email_account_id)
          .maybeSingle();

        console.log('[Zoom Update] Found tokens:', tokens ? 'yes' : 'no');

        if (tokens?.access_token) {
          const axios = (await import('axios')).default;
          let accessToken = tokens.access_token;

          // Refresh token if needed
          const expiryTime = tokens.expires_at
            ? new Date(tokens.expires_at).getTime()
            : 0;
          if (
            Date.now() >= expiryTime - 5 * 60 * 1000 &&
            tokens.refresh_token
          ) {
            console.log('[Zoom Update] Refreshing token...');
            const { Buffer } = await import('node:buffer');
            const params = new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: tokens.refresh_token,
            });
            const tokenResp = await axios.post(
              'https://zoom.us/oauth/token',
              params.toString(),
              {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  Authorization: `Basic ${Buffer.from(
                    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
                  ).toString('base64')}`,
                },
              },
            );
            accessToken = tokenResp.data.access_token;

            // Save the refreshed token back to the database
            await (supabase as any)
              .schema('core')
              .from('integration_tokens')
              .update({
                access_token: accessToken,
                expires_at: new Date(
                  Date.now() + (tokenResp.data.expires_in ?? 3600) * 1000,
                ).toISOString(),
              })
              .eq('account_id', existingMeeting.meeting_host_email_account_id);
            console.log('[Zoom Update] Saved refreshed token');
          }

          // Build Zoom update payload
          const updatePayload: Record<string, unknown> = {};
          if (body.title !== undefined) updatePayload.topic = body.title;
          if (body.description !== undefined)
            updatePayload.agenda = body.description;

          // Resolve start/end times: prefer body values, fall back to existing DB values
          const resolvedStart = body.scheduled_start ?? body.scheduledStart ?? existingMeeting.scheduled_start;
          const resolvedEnd = body.scheduled_end ?? body.scheduledEnd ?? existingMeeting.scheduled_end;
          const resolvedTimezone = body.timezone ?? 'UTC';

          if (resolvedStart) {
            const startTime = new Date(resolvedStart);
            updatePayload.start_time = startTime
              .toISOString()
              .replace(/\.\d{3}Z$/, 'Z');
            updatePayload.timezone = resolvedTimezone;

            if (resolvedEnd) {
              const endTime = new Date(resolvedEnd);
              const durationMinutes = Math.ceil(
                (endTime.getTime() - startTime.getTime()) / (1000 * 60),
              );
              if (durationMinutes > 0) updatePayload.duration = durationMinutes;
            }
          } else if (body.timezone !== undefined) {
            // Timezone-only update: Zoom requires start_time to be resent alongside timezone
            updatePayload.timezone = resolvedTimezone;
          }

          let zoomWarning: string | undefined;
          if (Object.keys(updatePayload).length > 0) {
            console.log('[Zoom Update] Sending update to Zoom:', updatePayload);
            try {
              await axios.patch(
                `https://api.zoom.us/v2/meetings/${existingMeeting.provider_event_id}`,
                updatePayload,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                },
              );
              console.log('[Zoom Update] Successfully updated meeting in Zoom');
            } catch (zoomApiError: any) {
              const errMsg = zoomApiError?.response?.data?.message || zoomApiError?.message || 'Unknown Zoom error';
              console.error('[Zoom Update] Failed to update Zoom meeting:', errMsg);
              zoomWarning = `Meeting updated locally, but Zoom sync failed: ${errMsg}`;
            }
          }

          // Store warning to pass along in the success response
          if (zoomWarning) {
            // Will be attached to the response below after local DB update
            (body as any).__zoomWarning = zoomWarning;
          }
        }
      } catch (zoomError) {
        console.error(
          '[Zoom Update] Unexpected error during Zoom update:',
          zoomError,
        );
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_by: user.id,
    };

    // Only include fields that are provided
    if (body.title !== undefined) updatePayload.title = body.title;
    if (body.description !== undefined)
      updatePayload.description = body.description;
    if (body.status !== undefined) updatePayload.status = body.status;
    if (
      body.scheduled_start !== undefined ||
      body.scheduledStart !== undefined
    ) {
      updatePayload.scheduled_start =
        body.scheduled_start ?? body.scheduledStart;
    }
    if (body.scheduled_end !== undefined || body.scheduledEnd !== undefined) {
      updatePayload.scheduled_end = body.scheduled_end ?? body.scheduledEnd;
    }
    if (body.actual_start !== undefined || body.actualStart !== undefined) {
      updatePayload.actual_start = body.actual_start ?? body.actualStart;
    }
    if (body.actual_end !== undefined || body.actualEnd !== undefined) {
      updatePayload.actual_end = body.actual_end ?? body.actualEnd;
    }
    if (body.timezone !== undefined) updatePayload.timezone = body.timezone;
    if (body.meeting_url !== undefined || body.meetingUrl !== undefined) {
      updatePayload.meeting_url = body.meeting_url ?? body.meetingUrl;
    }
    if (body.host_user_id !== undefined || body.hostUserId !== undefined) {
      updatePayload.host_user_id = body.host_user_id ?? body.hostUserId;
    }
    if (
      body.meeting_host_email_account_id !== undefined ||
      body.meetingHostEmailAccountId !== undefined
    ) {
      updatePayload.meeting_host_email_account_id =
        body.meeting_host_email_account_id ?? body.meetingHostEmailAccountId;
    }
    if (body.location !== undefined) updatePayload.location = body.location;

    const { data: meeting, error: updateError } = await (supabase as any)
      .schema('core')
      .from('meetings')
      .update(updatePayload)
      .eq('workspace_id', workspaceId)
      .eq('id', body.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Update meeting error:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update meeting' },
        { status: 500 },
      );
    }

    // Handle participants update if provided
    if (Array.isArray(body.participants)) {
      // Delete existing participants
      await (supabase as any)
        .schema('core')
        .from('meeting_participants')
        .delete()
        .eq('meeting_id', body.id);

      // Insert new participants
      if (body.participants.length > 0) {
        const participantRows = body.participants.map(
          (p: {
            participant_type?: string;
            internal_user_id?: string;
            external_email?: string;
            display_name?: string;
            is_host?: boolean;
            response_status?: string;
          }) => ({
            workspace_id: workspaceId,
            meeting_id: body.id,
            participant_type: p.participant_type ?? 'INTERNAL',
            internal_user_id: p.internal_user_id ?? null,
            external_email: p.external_email ?? null,
            display_name: p.display_name ?? null,
            is_host: p.is_host ?? false,
            response_status: 'ACCEPTED',
          }),
        );

        await (supabase as any)
          .schema('core')
          .from('meeting_participants')
          .insert(participantRows);
      }
    }

    // Handle reminders update
    if (Array.isArray(body.reminders)) {
      // Delete existing reminders
      await (supabase as any)
        .schema('core')
        .from('meeting_reminders')
        .delete()
        .eq('meeting_id', body.id);

      // Insert new reminders with the resolved start time
      const resolvedStart = body.scheduled_start ?? body.scheduledStart ?? meeting.scheduled_start;
      if (resolvedStart && body.reminders.length > 0) {
        const reminderRows = body.reminders.map(
          (r: { offset_minutes: number; channel?: string }) => {
            const scheduledAt = new Date(
              new Date(resolvedStart).getTime() -
                r.offset_minutes * 60 * 1000,
            );
            return {
              workspace_id: workspaceId,
              meeting_id: body.id,
              offset_minutes: r.offset_minutes,
              channel: r.channel ?? 'EMAIL',
              scheduled_at: scheduledAt.toISOString(),
              status: 'pending',
            };
          },
        );

        await (supabase as any)
          .schema('core')
          .from('meeting_reminders')
          .insert(reminderRows);
      }
    } else if (
      body.scheduled_start !== undefined ||
      body.scheduledStart !== undefined
    ) {
      // If reminders list is not sent, but the scheduled start time changes,
      // recalculate the scheduled_at for all existing reminders.
      const resolvedStart = body.scheduled_start ?? body.scheduledStart;
      if (resolvedStart) {
        const { data: existingReminders } = await (supabase as any)
          .schema('core')
          .from('meeting_reminders')
          .select('id, offset_minutes')
          .eq('meeting_id', body.id);

        if (existingReminders && existingReminders.length > 0) {
          for (const rem of existingReminders) {
            const scheduledAt = new Date(
              new Date(resolvedStart).getTime() -
                rem.offset_minutes * 60 * 1000,
            );
            await (supabase as any)
              .schema('core')
              .from('meeting_reminders')
              .update({
                scheduled_at: scheduledAt.toISOString(),
                status: 'pending', // Reset status to pending so it will trigger
              })
              .eq('id', rem.id);
          }
        }
      }
    }

    const zoomWarning = (body as any).__zoomWarning;
    if (zoomWarning) {
      return NextResponse.json({
        success: true,
        message: zoomWarning,
        data: meeting,
        zoom_warning: true,
      });
    }

    return successDataResponse('Meeting updated successfully', meeting);
  } catch (updateError) {
    console.error('Update meeting error:', updateError);
    return NextResponse.json(
      { success: false, message: 'Failed to update meeting' },
      { status: 500 },
    );
  }
});

/**
 * DELETE /api/core/meetings
 * Soft delete a meeting (also syncs with Google Calendar if linked)
 */
export const deleteMeetingController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const workspaceId = url.searchParams.get('workspaceId');

  if (!id || !workspaceId) {
    return NextResponse.json(
      { success: false, message: 'id and workspaceId are required' },
      { status: 400 },
    );
  }

  const { supabase, user, error } =
    await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  try {
    // First, fetch the meeting to check if it's linked to Google Calendar
    const { data: meeting } = await (supabase as any)
      .schema('core')
      .from('meetings')
      .select('provider_event_id, meeting_host_email_account_id, provider')
      .eq('workspace_id', workspaceId)
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();

    // If meeting is linked to Google Calendar, delete it there too
    if (
      meeting?.provider_event_id &&
      meeting?.meeting_host_email_account_id &&
      meeting?.provider === 'GOOGLE'
    ) {
      try {
        // Get tokens for the account
        const { data: tokens } = await (supabase as any)
          .schema('core')
          .from('integration_tokens')
          .select('*')
          .eq('account_id', meeting.meeting_host_email_account_id)
          .maybeSingle();

        if (tokens?.access_token && tokens?.refresh_token) {
          // Dynamically import google to avoid loading it for all requests
          const { google } = await import('googleapis');
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
          );

          oauth2Client.setCredentials({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expires_at
              ? new Date(tokens.expires_at).getTime()
              : undefined,
          });

          // Refresh token if needed
          const expiryTime = tokens.expires_at
            ? new Date(tokens.expires_at).getTime()
            : 0;
          if (Date.now() >= expiryTime - 5 * 60 * 1000) {
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);
          }

          const calendar = google.calendar({
            version: 'v3',
            auth: oauth2Client,
          });
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: meeting.provider_event_id,
            sendUpdates: 'all',
          });
        }
      } catch (googleError) {
        // Log error but continue with local deletion
        console.error('Failed to delete Google Calendar event:', googleError);
      }
    }

    // If meeting is linked to Zoom, delete it there too
    if (
      meeting?.provider_event_id &&
      meeting?.meeting_host_email_account_id &&
      meeting?.provider === 'ZOOM'
    ) {
      try {
        console.log(
          '[Zoom Delete] Fetching tokens for account:',
          meeting.meeting_host_email_account_id,
        );
        const { data: tokens } = await (supabase as any)
          .schema('core')
          .from('integration_tokens')
          .select('*')
          .eq('account_id', meeting.meeting_host_email_account_id)
          .maybeSingle();

        console.log(
          '[Zoom Delete] Found tokens:',
          tokens ? 'yes' : 'no',
          'has access_token:',
          !!tokens?.access_token,
        );

        if (tokens?.access_token) {
          const axios = (await import('axios')).default;
          let accessToken = tokens.access_token;

          // Refresh token if needed
          const expiryTime = tokens.expires_at
            ? new Date(tokens.expires_at).getTime()
            : 0;
          if (
            Date.now() >= expiryTime - 5 * 60 * 1000 &&
            tokens.refresh_token
          ) {
            console.log('[Zoom Delete] Refreshing token...');
            const { Buffer } = await import('node:buffer');
            const params = new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: tokens.refresh_token,
            });
            const tokenResp = await axios.post(
              'https://zoom.us/oauth/token',
              params.toString(),
              {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  Authorization: `Basic ${Buffer.from(
                    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
                  ).toString('base64')}`,
                },
              },
            );
            accessToken = tokenResp.data.access_token;
            console.log('[Zoom Delete] Got new access token');

            // Save the refreshed token back to the database
            await (supabase as any)
              .schema('core')
              .from('integration_tokens')
              .update({
                access_token: accessToken,
                expires_at: new Date(
                  Date.now() + (tokenResp.data.expires_in ?? 3600) * 1000,
                ).toISOString(),
              })
              .eq('account_id', meeting.meeting_host_email_account_id);
          }

          console.log(
            '[Zoom Delete] Calling Zoom API to delete meeting:',
            meeting.provider_event_id,
          );
          await axios.delete(
            `https://api.zoom.us/v2/meetings/${meeting.provider_event_id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          console.log('[Zoom Delete] Successfully deleted meeting from Zoom');
        }
      } catch (zoomError) {
        // Log error but continue with local deletion
        console.error(
          '[Zoom Delete] Failed to delete Zoom meeting:',
          zoomError,
        );
      }
    }

    // Soft delete from database
    const { error: deleteError } = await (supabase as any)
      .schema('core')
      .from('meetings')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
      })
      .eq('workspace_id', workspaceId)
      .eq('id', id);

    if (deleteError) {
      console.error('Delete meeting error:', deleteError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete meeting' },
        { status: 500 },
      );
    }

    return successDataResponse('Meeting deleted successfully', { id });
  } catch (deleteError) {
    console.error('Delete meeting error:', deleteError);
    return NextResponse.json(
      { success: false, message: 'Failed to delete meeting' },
      { status: 500 },
    );
  }
});

// =============================================================================
// PARTICIPANT CONTROLLERS
// =============================================================================

/**
 * GET /api/core/meeting-participants
 */
export const getMeetingParticipantsController = catchAsync(
  async ({ request }) => {
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const meetingId = url.searchParams.get('meetingId');

    if (!workspaceId || !meetingId) {
      return NextResponse.json(
        { success: false, message: 'workspaceId and meetingId are required' },
        { status: 400 },
      );
    }

    const { supabase, error } = await assertCoreWorkspaceAccess(workspaceId);
    if (error) return error;

    const { data, error: fetchError } = await (supabase as any)
      .schema('core')
      .from('meeting_participants')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('is_host', { ascending: false });

    if (fetchError) {
      console.error('Fetch participants error:', fetchError);
      return NextResponse.json(
        { success: false, message: 'Failed to retrieve participants' },
        { status: 500 },
      );
    }

    // Enrich participants with internal_user data from public.accounts
    const participants = (data ?? []) as Array<{
      internal_user_id?: string | null;
    }>;
    const internalUserIds = participants
      .map((p) => p.internal_user_id)
      .filter((id): id is string => !!id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let accountsById: Record<string, any> = {};
    if (internalUserIds.length > 0) {
      const { data: accts } = await supabase
        .from('accounts')
        .select('id, name, email')
        .in('id', internalUserIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (accts ?? []).forEach((a: any) => {
        accountsById[a.id] = a;
      });
    }

    const enriched = participants.map((p) => ({
      ...p,
      internal_user: p.internal_user_id
        ? (accountsById[p.internal_user_id] ?? null)
        : null,
    }));

    return successDataResponse('Participants retrieved', enriched);
  },
);

/**
 * POST /api/core/meeting-participants
 */
export const addMeetingParticipantController = catchAsync(
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const workspaceId = body?.workspace_id ?? body?.workspaceId;
    const meetingId = body?.meeting_id ?? body?.meetingId;

    if (!workspaceId || !meetingId) {
      return NextResponse.json(
        { success: false, message: 'workspace_id and meeting_id are required' },
        { status: 400 },
      );
    }

    const { supabase, error } = await assertCoreWorkspaceAccess(workspaceId);
    if (error) return error;

    const participantPayload = {
      workspace_id: workspaceId,
      meeting_id: meetingId,
      participant_type: body.participant_type ?? 'INTERNAL',
      internal_user_id: body.internal_user_id ?? null,
      external_email: body.external_email ?? null,
      display_name: body.display_name ?? null,
      is_host: body.is_host ?? false,
      response_status: 'ACCEPTED',
    };

    const { data, error: insertError } = await (supabase as any)
      .schema('core')
      .from('meeting_participants')
      .insert(participantPayload)
      .select('*')
      .single();

    if (insertError) {
      console.error('Add participant error:', insertError);
      return NextResponse.json(
        { success: false, message: 'Failed to add participant' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: 'Participant added', data },
      { status: 201 },
    );
  },
);

/**
 * PATCH /api/core/meeting-participants
 */
export const updateMeetingParticipantController = catchAsync(
  async ({ request }) => {
    const body = await request.json().catch(() => null);
    const workspaceId = body?.workspace_id ?? body?.workspaceId;

    if (!body?.id || !workspaceId) {
      return NextResponse.json(
        { success: false, message: 'id and workspace_id are required' },
        { status: 400 },
      );
    }

    const { supabase, error } = await assertCoreWorkspaceAccess(workspaceId);
    if (error) return error;

    const updatePayload: Record<string, unknown> = {};
    if (body.response_status !== undefined)
      updatePayload.response_status = body.response_status;
    if (body.display_name !== undefined)
      updatePayload.display_name = body.display_name;
    if (body.is_host !== undefined) updatePayload.is_host = body.is_host;

    const { data, error: updateError } = await (supabase as any)
      .schema('core')
      .from('meeting_participants')
      .update(updatePayload)
      .eq('id', body.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Update participant error:', updateError);
      return NextResponse.json(
        { success: false, message: 'Failed to update participant' },
        { status: 500 },
      );
    }

    return successDataResponse('Participant updated', data);
  },
);

// =============================================================================
// NOTE CONTROLLERS
// =============================================================================

/**
 * GET /api/core/meeting-notes
 */
export const getMeetingNotesController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const meetingId = url.searchParams.get('meetingId');

  if (!workspaceId || !meetingId) {
    return NextResponse.json(
      { success: false, message: 'workspaceId and meetingId are required' },
      { status: 400 },
    );
  }

  const { supabase, error } = await assertCoreWorkspaceAccess(workspaceId);
  if (error) return error;

  const { data, error: fetchError } = await (supabase as any)
    .schema('core')
    .from('meeting_notes')
    .select('*')
    .eq('meeting_id', meetingId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('Fetch notes error:', fetchError);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve notes' },
      { status: 500 },
    );
  }

  return successDataResponse('Notes retrieved', data ?? []);
});

/**
 * POST /api/core/meeting-notes
 */
export const createMeetingNoteController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;
  const meetingId = body?.meeting_id ?? body?.meetingId;

  if (!workspaceId || !meetingId || !body?.content) {
    return NextResponse.json(
      {
        success: false,
        message: 'workspace_id, meeting_id, and content are required',
      },
      { status: 400 },
    );
  }

  const { supabase, user, error } =
    await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const { data, error: insertError } = await (supabase as any)
    .schema('core')
    .from('meeting_notes')
    .insert({
      workspace_id: workspaceId,
      meeting_id: meetingId,
      content: body.content,
      note_type: body.note_type ?? 'note',
      created_by: user.id,
      updated_by: user.id,
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('Create note error:', insertError);
    return NextResponse.json(
      { success: false, message: 'Failed to create note' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, message: 'Note created', data },
    { status: 201 },
  );
});

/**
 * PATCH /api/core/meeting-notes
 */
export const updateMeetingNoteController = catchAsync(async ({ request }) => {
  const body = await request.json().catch(() => null);
  const workspaceId = body?.workspace_id ?? body?.workspaceId;

  if (!body?.id || !workspaceId) {
    return NextResponse.json(
      { success: false, message: 'id and workspace_id are required' },
      { status: 400 },
    );
  }

  const { supabase, user, error } =
    await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const { data, error: updateError } = await (supabase as any)
    .schema('core')
    .from('meeting_notes')
    .update({
      content: body.content,
      note_type: body.note_type,
      updated_by: user.id,
    })
    .eq('id', body.id)
    .select('*')
    .single();

  if (updateError) {
    console.error('Update note error:', updateError);
    return NextResponse.json(
      { success: false, message: 'Failed to update note' },
      { status: 500 },
    );
  }

  return successDataResponse('Note updated', data);
});

/**
 * DELETE /api/core/meeting-notes
 */
export const deleteMeetingNoteController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const workspaceId = url.searchParams.get('workspaceId');

  if (!id || !workspaceId) {
    return NextResponse.json(
      { success: false, message: 'id and workspaceId are required' },
      { status: 400 },
    );
  }

  const { supabase, user, error } =
    await assertCoreWorkspaceAccess(workspaceId);
  if (error || !user) return error!;

  const { error: deleteError } = await (supabase as any)
    .schema('core')
    .from('meeting_notes')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', id);

  if (deleteError) {
    console.error('Delete note error:', deleteError);
    return NextResponse.json(
      { success: false, message: 'Failed to delete note' },
      { status: 500 },
    );
  }

  return successDataResponse('Note deleted', { id });
});
// import { createCoreControllers } from '../_shared/core-crud';

// const meetings = createCoreControllers({
//   table: 'meetings',
//   relation: { table: 'meeting_relations', foreignKey: 'meeting_id' },
//   label: 'Meeting',
//   requiredCreateFields: ['workspace_id', 'entity_type', 'entity_id', 'title'],
//   defaultOrder: { column: 'start_time', ascending: false },
//   createPayload: (body, userId) => ({
//     workspace_id: body.workspace_id ?? body.workspaceId,
//     title: body.title,
//     description: body.description ?? null,
//     start_time: body.start_time ?? body.startTime ?? null,
//     end_time: body.end_time ?? body.endTime ?? null,
//     location: body.location ?? null,
//     status: body.status ?? 'scheduled',
//     created_by: userId,
//     updated_by: userId,
//   }),
//   updatePayload: (body, userId) => ({
//     title: body.title,
//     description: body.description,
//     start_time: body.start_time ?? body.startTime,
//     end_time: body.end_time ?? body.endTime,
//     location: body.location,
//     status: body.status,
//     updated_by: userId,
//   }),
// });

// export const getMeetingsController = meetings.get;
// export const createMeetingController = meetings.create;
// export const updateMeetingController = meetings.update;
// export const cancelMeetingController = meetings.update;
// export const deleteMeetingController = meetings.remove;
