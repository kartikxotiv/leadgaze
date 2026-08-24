import { NextRequest, NextResponse } from 'next/server';

import { enhanceRouteHandler } from '@kit/next/routes';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createEntitlementService } from '~/lib/entitlements';

import { catchAsync } from '../../../../../utils/response-handler';

const importTickets = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const payload = await request.json();
    const { workspaceId, data } = payload;

    if (!workspaceId || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const entitlements = createEntitlementService();

    // 1. Pre-fetch dictionaries for mapping
    const [
      { data: statusesData },
      { data: prioritiesData },
      { data: categoriesData },
      { data: customersData },
      { data: organizationsData },
    ] = await Promise.all([
      supabase
        .schema('service_cloud')
        .from('ticket_statuses')
        .select('id, name, is_default')
        .eq('workspace_id', workspaceId),
      supabase
        .schema('service_cloud')
        .from('ticket_priorities')
        .select('id, name, is_default')
        .eq('workspace_id', workspaceId),
      supabase
        .schema('service_cloud')
        .from('ticket_categories')
        .select('id, name')
        .eq('workspace_id', workspaceId),
      supabase
        .schema('service_cloud')
        .from('customers')
        .select('id, name, email')
        .eq('workspace_id', workspaceId),
      supabase
        .schema('service_cloud')
        .from('organizations')
        .select('id, name')
        .eq('workspace_id', workspaceId),
    ]);

    const statuses = statusesData || [];
    const priorities = prioritiesData || [];
    const categories = categoriesData || [];
    const customers = customersData || [];
    const organizations = organizationsData || [];

    const defaultStatus = statuses.find((s) => s.is_default) || statuses[0];
    const defaultPriority =
      priorities.find((p) => p.is_default) || priorities[0];

    const insertPayloads: any[] = [];

    for (const row of data) {
      const cleanedRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (value !== '') {
          cleanedRow[key] = value;
        }
      }

      // 2. Status Mapping
      if (cleanedRow.status_id) {
        const match = statuses.find(
          (s) => s.name.toLowerCase() === cleanedRow.status_id.toLowerCase(),
        );
        cleanedRow.status_id = match ? match.id : defaultStatus?.id;
      } else {
        cleanedRow.status_id = defaultStatus?.id;
      }

      // 3. Priority Mapping
      if (cleanedRow.priority_id) {
        const match = priorities.find(
          (p) => p.name.toLowerCase() === cleanedRow.priority_id.toLowerCase(),
        );
        cleanedRow.priority_id = match ? match.id : defaultPriority?.id;
      } else {
        cleanedRow.priority_id = defaultPriority?.id;
      }

      // 4. Category Mapping
      if (cleanedRow.category_id) {
        const match = categories.find(
          (c) => c.name.toLowerCase() === cleanedRow.category_id.toLowerCase(),
        );
        if (match) {
          cleanedRow.category_id = match.id;
        } else {
          delete cleanedRow.category_id;
        }
      }

      // 5. Customer Mapping
      if (cleanedRow.customer_email) {
        const emailSearch = cleanedRow.customer_email.toLowerCase();
        let match = customers.find(
          (c) => c.email?.toLowerCase() === emailSearch,
        );

        if (!match && cleanedRow.customer_name) {
          const newCustomer = await entitlements.withUsageReservation(
            {
              workspaceId,
              moduleKey: 'service_cloud',
              featureKey: 'service.customers',
              resourceType: 'customer',
              eventType: 'imported',
            },
            async () => {
              const { data: created, error: customerError } = await supabase
                .schema('service_cloud')
                .from('customers')
                .insert({
                  workspace_id: workspaceId,
                  name: cleanedRow.customer_name,
                  email: cleanedRow.customer_email,
                  created_by: user.id,
                })
                .select('id, name, email')
                .single();

              if (customerError) throw customerError;
              return created;
            },
            (created) => ({ resourceId: created.id }),
          );

          match = newCustomer;
          customers.push(newCustomer); // Avoid creating the same customer twice.
        }

        if (match) {
          cleanedRow.customer_id = match.id;
        }

        delete cleanedRow.customer_email;
        delete cleanedRow.customer_name;
      } else {
        delete cleanedRow.customer_email;
        delete cleanedRow.customer_name;
      }

      // 6. Organization Mapping
      if (cleanedRow.organization_id) {
        const match = organizations.find(
          (o) =>
            o.name?.toLowerCase() === cleanedRow.organization_id.toLowerCase(),
        );
        if (match) {
          cleanedRow.organization_id = match.id;
        } else {
          delete cleanedRow.organization_id;
        }
      }

      // 7. Assigned Agent ID Mapping (Frontend maps it as owner_id)
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (cleanedRow.owner_id) {
        if (!uuidRegex.test(cleanedRow.owner_id)) {
          cleanedRow.assigned_agent_id = user.id;
        } else {
          cleanedRow.assigned_agent_id = cleanedRow.owner_id;
        }
        delete cleanedRow.owner_id;
      }

      insertPayloads.push({
        workspace_id: workspaceId,
        created_by: user.id,
        assigned_agent_id: cleanedRow.assigned_agent_id || user.id,
        ...cleanedRow,
      });
    }

    const result = await entitlements.withUsageReservation(
      {
        workspaceId,
        moduleKey: 'service_cloud',
        featureKey: 'service.tickets',
        quantity: insertPayloads.length,
        resourceType: 'ticket',
        eventType: 'imported',
      },
      async () => {
        const { data: imported, error } = await supabase
          .schema('service_cloud')
          .from('tickets')
          .insert(insertPayloads)
          .select('id');

        if (error) {
          console.error('Import tickets error:', error);
          throw error;
        }
        return imported;
      },
      (imported) => ({
        metadata: { resourceIds: imported.map(({ id }) => id) },
      }),
    );

    return NextResponse.json({
      message: 'Tickets imported successfully',
      count: result?.length || 0,
    });
  },
);

export const POST = enhanceRouteHandler(importTickets, {
  auth: false,
});
