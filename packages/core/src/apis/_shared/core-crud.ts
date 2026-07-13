import { NextResponse } from 'next/server';

import { catchAsync, successDataResponse } from '../../utils/response-handler';
import { assertCoreWorkspaceAccess } from './workspace-access';

type CoreResourceConfig = {
  table: string;
  label: string;
  requiredCreateFields: string[];
  createPayload: (body: Record<string, any>, userId: string) => Record<string, any>;
  updatePayload: (body: Record<string, any>, userId: string) => Record<string, any>;
  defaultOrder?: { column: string; ascending: boolean };
  softDelete?: boolean;
  relation?: {
    table: string;
    foreignKey: string;
  };
};

function cleanUndefined(payload: Record<string, any>) {
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
  return payload;
}

function entityFilters(url: URL) {
  return {
    workspaceId: url.searchParams.get('workspaceId'),
    entityType: url.searchParams.get('entityType'),
    entityId: url.searchParams.get('entityId'),
    id: url.searchParams.get('id'),
    threadId: url.searchParams.get('threadId'),
  };
}

function relationInputs(body: Record<string, any>) {
  const rawRelations = Array.isArray(body.relations) ? body.relations : [];
  const relations = rawRelations
    .map((relation: Record<string, any>) => ({
      entity_type: relation.entity_type ?? relation.entityType,
      entity_id: relation.entity_id ?? relation.entityId,
    }))
    .filter((relation) => relation.entity_type && relation.entity_id);

  const entityType = body.entity_type ?? body.entityType;
  const entityId = body.entity_id ?? body.entityId;
  if (entityType && entityId) {
    relations.unshift({ entity_type: entityType, entity_id: entityId });
  }

  const unique = new Map<string, { entity_type: string; entity_id: string }>();
  relations.forEach((relation) => {
    unique.set(`${relation.entity_type}:${relation.entity_id}`, relation);
  });

  return Array.from(unique.values());
}

async function fetchRelations(
  supabase: any,
  config: CoreResourceConfig,
  workspaceId: string,
  recordIds: string[],
) {
  if (!config.relation || recordIds.length === 0) return [];

  const { data, error } = await supabase
    .schema('core')
    .from(config.relation.table)
    .select('*')
    .eq('workspace_id', workspaceId)
    .in(config.relation.foreignKey, recordIds);

  if (error) throw error;
  return data ?? [];
}

function attachRelations(data: any, relations: any[], foreignKey: string) {
  const attach = (record: any) => {
    const recordRelations = relations.filter((relation) => relation[foreignKey] === record.id);
    const firstRelation = recordRelations[0];

    return {
      ...record,
      relations: recordRelations,
      entity_type: record.entity_type ?? firstRelation?.entity_type ?? null,
      entity_id: record.entity_id ?? firstRelation?.entity_id ?? null,
    };
  };

  return Array.isArray(data) ? data.map(attach) : data ? attach(data) : data;
}

async function relationFilteredIds(
  supabase: any,
  config: CoreResourceConfig,
  workspaceId: string,
  entityType?: string | null,
  entityId?: string | null,
) {
  if (!config.relation || (!entityType && !entityId)) return null;

  let query = supabase
    .schema('core')
    .from(config.relation.table)
    .select(config.relation.foreignKey)
    .eq('workspace_id', workspaceId);

  if (entityType) query = query.eq('entity_type', entityType);
  if (entityId) query = query.eq('entity_id', entityId);

  const { data, error } = await query;
  if (error) throw error;

  return Array.from(new Set((data ?? []).map((row: any) => row[config.relation!.foreignKey])));
}

export function createCoreControllers(config: CoreResourceConfig) {
  const get = catchAsync(async ({ request }) => {
    const url = new URL(request.url);
    const { workspaceId, entityType, entityId, id, threadId } = entityFilters(url);
    const createdAtFrom = url.searchParams.get('createdAtFrom');
    const createdAtTo = url.searchParams.get('createdAtTo');
    const updatedAtFrom = url.searchParams.get('updatedAtFrom');
    const updatedAtTo = url.searchParams.get('updatedAtTo');

    if (!workspaceId) {
      return NextResponse.json({ success: false, message: 'workspaceId query parameter is required' }, { status: 400 });
    }

    const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    try {
      const filteredIds = await relationFilteredIds(supabase, config, workspaceId, entityType, entityId);
      if (filteredIds && filteredIds.length === 0) {
        return successDataResponse(`${config.label} retrieved successfully`, id ? null : []);
      }

      let query = (supabase as any).schema('core').from(config.table).select('*').eq('workspace_id', workspaceId);
      if (config.softDelete !== false) query = query.eq('is_deleted', false);
      const statusParam = url.searchParams.get('status');
      if (statusParam === 'closed' && config.table === 'notes') {
        query = query.eq('is_closed', true);
      } else if (statusParam === 'active' && config.table === 'notes') {
        query = query.eq('is_closed', false);
      }
      if (id) query = query.eq('id', id).maybeSingle();
      if (!config.relation && entityType) query = query.eq('entity_type', entityType);
      if (!config.relation && entityId) query = query.eq('entity_id', entityId);
      if (filteredIds) query = query.in('id', filteredIds);
      if (threadId && config.table === 'emails') query = query.eq('thread_id', threadId);

      if (createdAtFrom) query = query.gte('created_at', `${createdAtFrom}T00:00:00.000Z`);
      if (createdAtTo) query = query.lte('created_at', `${createdAtTo}T23:59:59.999Z`);
      if (updatedAtFrom) query = query.gte('updated_at', `${updatedAtFrom}T00:00:00.000Z`);
      if (updatedAtTo) query = query.lte('updated_at', `${updatedAtTo}T23:59:59.999Z`);
      if (!id) {
        const order = config.defaultOrder ?? { column: 'created_at', ascending: false };
        query = query.order(order.column, { ascending: order.ascending });
      }

      const { data, error: fetchError } = await query;
      if (fetchError) {
        console.error(`Fetch core ${config.table} error:`, fetchError);
        return NextResponse.json({ success: false, message: `Failed to retrieve ${config.label}` }, { status: 500 });
      }

      if (!config.relation || !data) {
        return successDataResponse(`${config.label} retrieved successfully`, data ?? (id ? null : []));
      }

      const records = Array.isArray(data) ? data : [data];
      const relations = await fetchRelations(supabase, config, workspaceId, records.map((record: any) => record.id));

      return successDataResponse(
        `${config.label} retrieved successfully`,
        attachRelations(data, relations, config.relation.foreignKey) ?? (id ? null : []),
      );
    } catch (fetchError) {
      console.error(`Fetch core ${config.table} relations error:`, fetchError);
      return NextResponse.json({ success: false, message: `Failed to retrieve ${config.label}` }, { status: 500 });
    }
  });

  const create = catchAsync(async ({ request }) => {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });

    const workspaceId = body.workspace_id ?? body.workspaceId;
    if (!workspaceId) return NextResponse.json({ success: false, message: 'workspace_id is required' }, { status: 400 });

    for (const field of config.requiredCreateFields) {
      if (body[field] == null && body[field.replace(/_([a-z])/g, (_, char) => char.toUpperCase())] == null) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const payload = config.createPayload(body, user.id);
    const { data, error: insertError } = await (supabase as any).schema('core').from(config.table).insert(payload).select('*').single();
    if (insertError) {
      console.error(`Create core ${config.table} error:`, insertError);
      return NextResponse.json({ success: false, message: `Failed to create ${config.label}` }, { status: 500 });
    }

    if (!config.relation) {
      return NextResponse.json({ success: true, message: `${config.label} created successfully`, data }, { status: 201 });
    }

    const relations = relationInputs(body);
    if (relations.length > 0) {
      const relationRows = relations.map((relation) => ({
        workspace_id: workspaceId,
        [config.relation!.foreignKey]: data.id,
        entity_type: relation.entity_type,
        entity_id: relation.entity_id,
      }));

      const { data: relationData, error: relationError } = await (supabase as any)
        .schema('core')
        .from(config.relation.table)
        .insert(relationRows)
        .select('*');

      if (relationError) {
        console.error(`Create core ${config.relation.table} error:`, relationError);
        await (supabase as any).schema('core').from(config.table).delete().eq('id', data.id);
        return NextResponse.json({ success: false, message: `Failed to create ${config.label} relation` }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `${config.label} created successfully`,
        data: attachRelations(data, relationData ?? [], config.relation.foreignKey),
      }, { status: 201 });
    }

    return NextResponse.json({
      success: true,
      message: `${config.label} created successfully`,
      data: attachRelations(data, [], config.relation.foreignKey),
    }, { status: 201 });
  });

  const update = catchAsync(async ({ request }) => {
    const body = await request.json().catch(() => null);
    const workspaceId = body?.workspace_id ?? body?.workspaceId;
    if (!body?.id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspace_id are required' }, { status: 400 });

    const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const payload = cleanUndefined(config.updatePayload(body, user.id));
    const { data, error: updateError } = await (supabase as any)
      .schema('core')
      .from(config.table)
      .update(payload)
      .eq('workspace_id', workspaceId)
      .eq('id', body.id)
      .select('*')
      .single();

    if (updateError) {
      console.error(`Update core ${config.table} error:`, updateError);
      return NextResponse.json({ success: false, message: `Failed to update ${config.label}` }, { status: 500 });
    }

    return successDataResponse(`${config.label} updated successfully`, data);
  });

  const remove = catchAsync(async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const workspaceId = url.searchParams.get('workspaceId');
    if (!id || !workspaceId) return NextResponse.json({ success: false, message: 'id and workspaceId are required' }, { status: 400 });

    const { supabase, user, error } = await assertCoreWorkspaceAccess(workspaceId);
    if (error || !user) return error!;

    const query = (supabase as any).schema('core').from(config.table);
    const { error: deleteError } =
      config.softDelete === false
        ? await query.delete().eq('workspace_id', workspaceId).eq('id', id)
        : await query.update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id }).eq('workspace_id', workspaceId).eq('id', id);

    if (deleteError) {
      console.error(`Delete core ${config.table} error:`, deleteError);
      return NextResponse.json({ success: false, message: `Failed to delete ${config.label}` }, { status: 500 });
    }

    return successDataResponse(`${config.label} deleted successfully`, { id });
  });

  return { get, create, update, remove };
}
