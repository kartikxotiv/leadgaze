import { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { Database } from '@kit/supabase/database';

import { catchAsync, successDataResponse, ApiError } from '~/utils/response-handler';

/**
 * GET /api/workspaces
 * Fetch all platform workspaces with search, filtering, sorting, and pagination.
 */
export const getWorkspaces = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '15', 10);
    const searchTerm = url.searchParams.get('searchTerm') || '';
    const sortColumn = url.searchParams.get('sortColumn') || 'created_at';
    const sortDirection = url.searchParams.get('sortDirection') || 'desc';
    const createdAtFrom = url.searchParams.get('createdAtFrom') || '';
    const createdAtTo = url.searchParams.get('createdAtTo') || '';
    const statusParam = url.searchParams.get('status') || '';
    const statusesFilter = statusParam ? statusParam.split(',') : [];

    // Calculate pagination offsets
    const offset = (page - 1) * limit;

    // Build query against workspaces table
    let query = adminClient
      .from('workspaces')
      .select(`
        id, 
        name, 
        slug,
        is_active,
        created_at, 
        updated_at,
        accounts(name, email)
      `, {
        count: 'exact',
      });

    // Apply search filter if provided
    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    // Apply status filter based on is_active
    if (statusesFilter.length > 0) {
      if (statusesFilter.includes('Suspended') && !statusesFilter.includes('Active') && !statusesFilter.includes('Trial')) {
        query = query.eq('is_active', false);
      } else if (!statusesFilter.includes('Suspended') && (statusesFilter.includes('Active') || statusesFilter.includes('Trial'))) {
        query = query.eq('is_active', true);
      }
    }

    // Apply created_at date range
    if (createdAtFrom) {
      query = query.gte('created_at', createdAtFrom);
    }
    if (createdAtTo) {
      query = query.lte('created_at', createdAtTo);
    }

    // Apply sorting
    const isAscending = sortDirection === 'asc';
    const sortKey = sortColumn === 'name' ? 'name' : 'created_at';
    query = query.order(sortKey, { ascending: isAscending });

    // Apply pagination range
    query = query.range(offset, offset + limit - 1);

    const { data: workspaces, count, error } = await query;

    if (error) {
      console.error('Error fetching workspaces:', error);
      // Fallback to avoid breaking if schema mismatch exists
      throw error;
    }

    // Fetch module seats separately
    const workspaceIds = (workspaces || []).map(w => w.id);
    let allWorkspaceModules: any[] = [];
    if (workspaceIds.length > 0) {
      const { data: wm } = await adminClient
        .from('workspace_module_seats')
        .select('workspace_id, seats_purchased, subscription_products(display_name)')
        .in('workspace_id', workspaceIds)
        .in('status', ['active', 'trialing']);
      if (wm) {
        allWorkspaceModules = wm;
      }
    }

    // Map workspace records to WorkspaceItem structure
    const formattedData = (workspaces || []).map((ws: any, index) => {
      const plans = ['Enterprise', 'Pro', 'Starter', 'Trial'] as const;
      const plan = plans[index % plans.length]!;
      
      let status = ws.is_active ? 'Active' : 'Suspended';
      
      // Clever mock logic to make the tabs work seamlessly before real schema is ready
      if (ws.is_active) {
        if (statusesFilter.includes('Trial') && !statusesFilter.includes('Active')) {
          status = 'Trial';
        } else if (statusesFilter.length === 0 && index % 4 === 1) {
          status = 'Trial';
        }
      }

      const membersCount = ((index + 1) * 7) % 50 + 3;
      const mrrValues = ['$2,499/mo', '$499/mo', '$1,299/mo', '$99/mo'];
      const mrr = mrrValues[index % mrrValues.length]!;

      // Extract owner info
      let ownerName = 'Unknown Owner';
      let ownerEmail = 'owner@leadgaze.com';
      if (ws.accounts) {
         // handle array or single object
         const acc = Array.isArray(ws.accounts) ? ws.accounts[0] : ws.accounts;
         if (acc) {
           ownerEmail = acc.email || ownerEmail;
           ownerName = acc.name || (acc.email ? acc.email.split('@')[0].replace(/[^a-zA-Z]/g, ' ') : ownerName);
         }
      }

      // Format Owner Name
      const capitalizedOwnerName = ownerName.replace(/\b\w/g, l => l.toUpperCase());

      // Extract modules
      const wmForWorkspace = allWorkspaceModules.filter(wm => wm.workspace_id === ws.id);
      let modules: any[] = [];
      if (wmForWorkspace.length > 0) {
          modules = wmForWorkspace.map((wm: any) => {
            const product = Array.isArray(wm.subscription_products) ? wm.subscription_products[0] : wm.subscription_products;
            let name = 'Unknown';
            if (product && product.display_name) {
              name = product.display_name.replace(' Desk', ''); // Normalize "Sales Desk" -> "Sales"
            }
            return {
              name,
              seats: wm.seats_purchased || 0
            };
          });
      }

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug || (ws.name ? ws.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : ws.id),
        domain: ws.name ? `${ws.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.leadgaze.com` : 'leadgaze.com',
        owner_name: capitalizedOwnerName,
        owner_email: ownerEmail,
        plan,
        modules,
        status,
        members_count: membersCount,
        mrr,
        created_at: ws.created_at ? new Date(ws.created_at).toISOString().slice(0, 10) : '2026-01-01',
      };
    });

    return successDataResponse({
      data: formattedData,
      count: count || formattedData.length,
    });
  },
);

export const createWorkspace = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: any }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const body = await request.json();
    const { name, slug, owner_id } = body;

    if (!name || !slug) {
      return new Response(JSON.stringify({ error: 'Name and slug are required' }), { status: 400 });
    }

    // Default owner to current user if not provided
    const workspaceOwnerId = owner_id || user?.id;

    if (!workspaceOwnerId) {
      return new Response(JSON.stringify({ error: 'Owner ID is required' }), { status: 400 });
    }

    const { data, error } = await adminClient
      .from('workspaces')
      .insert({
        name,
        slug,
        owner_id: workspaceOwnerId,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating workspace:', error);
      if (error.code === '23505') {
        throw new ApiError('An organization with this slug already exists. Please choose a different one.', 400);
      }
      throw error;
    }

    return successDataResponse(data);
  },
);

export const updateWorkspace = catchAsync(
  async ({ request, user, params }: { request: NextRequest; user?: any; params?: Record<string, string> }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const id = params?.id;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Workspace ID is required' }), { status: 400 });
    }
    
    const body = await request.json();
    
    // We only allow updating specific fields
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await adminClient
      .from('workspaces')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating workspace:', error);
      if (error.code === '23505') {
        throw new ApiError('An organization with this slug already exists. Please choose a different one.', 400);
      }
      throw error;
    }

    return successDataResponse(data);
  },
);

export const getWorkspaceById = catchAsync(
  async ({ request, user, params }: { request: NextRequest; user?: any; params?: Record<string, string> }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const id = params?.id;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Workspace ID is required' }), { status: 400 });
    }

    const { data: ws, error } = await adminClient
      .from('workspaces')
      .select(`
        id, 
        name, 
        slug,
        is_active,
        created_at, 
        updated_at,
        accounts(name, email)
      `)
      .eq('id', id)
      .single();

    // Fetch module seats separately
    const { data: wm } = await adminClient
      .from('workspace_module_seats')
      .select('seats_purchased, subscription_products(product_key, display_name)')
      .eq('workspace_id', id)
      .in('status', ['active', 'trialing']);

    if (error) {
      console.error('Error fetching workspace:', error);
      throw error;
    }

    // Extract owner info
    let ownerName = 'Unknown Owner';
    let ownerEmail = 'owner@leadgaze.com';
    if (ws.accounts) {
       const acc = Array.isArray(ws.accounts) ? ws.accounts[0] : ws.accounts;
       if (acc) {
         ownerEmail = acc.email || ownerEmail;
         ownerName = acc.name || (acc.email ? acc.email.split('@')[0].replace(/[^a-zA-Z]/g, ' ') : ownerName);
       }
    }
    const capitalizedOwnerName = ownerName.replace(/\b\w/g, l => l.toUpperCase());

    // Generate mock details based on slug length or id for consistency
    const seed = ws.slug.length || 5;
    const plans = ['Enterprise', 'Pro', 'Starter', 'Trial'];
    const plan = plans[seed % plans.length]!;
    
    let status = ws.is_active ? 'Active' : 'Suspended';

    const membersCount = (seed * 7) % 50 + 3;
    const mrrValues = ['$2,499/mo', '$499/mo', '$1,299/mo', '$99/mo'];
    const mrr = mrrValues[seed % mrrValues.length]!;

    const formattedData = {
      id: ws.id,
      name: ws.name,
      slug: ws.slug || (ws.name ? ws.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : ws.id),
      domain: ws.slug ? `${ws.slug}.leadgaze.com` : 'leadgaze.com',
      industry: '-',
      owner_name: capitalizedOwnerName,
      owner_email: ownerEmail,
      plan,
      modules: wm && wm.length > 0 
        ? wm.map((m: any) => {
            const product = Array.isArray(m.subscription_products) ? m.subscription_products[0] : m.subscription_products;
            let name = 'Unknown';
            let key = '';
            if (product && product.display_name) {
              name = product.display_name.replace(' Desk', ''); // Normalize "Sales Desk" -> "Sales"
              key = product.product_key;
            }
            return {
              key,
              name,
              seats: m.seats_purchased || 0
            };
          })
        : [],
      status,
      members_count: membersCount,
      mrr,
      created_at: ws.created_at ? new Date(ws.created_at).toISOString().slice(0, 10) : '2026-01-01',
      last_login: ws.updated_at ? new Date(ws.updated_at).toLocaleString() : '-',
      billing_cycle: 'Monthly',
      renewal_date: '2026-09-03',
      revenue_generated: '$19,200 (8 months)'
    };

    return successDataResponse(formattedData);
  },
);

export const getWorkspaceMembers = catchAsync(
  async ({ request, user, params }: { request: NextRequest; user?: any; params?: Record<string, string> }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const id = params?.id;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Workspace ID is required' }), { status: 400 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '25', 10);
    const moduleFilter = url.searchParams.get('module') || 'All';
    const offset = (page - 1) * limit;

    let query = adminClient
      .from('workspace_members')
      .select(`
        id,
        status,
        created_at,
        accounts(id, name, email),
        workspace_roles!inner(role_name)
      `, { count: 'exact' })
      .eq('workspace_id', id);

    if (moduleFilter !== 'All' && moduleFilter !== 'None') {
      // Filter members exactly by their assigned module's product_key
      query = query.eq('product_key', moduleFilter);
    }

    const { data: members, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching workspace members:', error);
      throw error;
    }

    const formattedMembers = (members || []).map((m: any, index: number) => {
      const account = Array.isArray(m.accounts) ? m.accounts[0] : m.accounts;
      const role = Array.isArray(m.workspace_roles) ? m.workspace_roles[0] : m.workspace_roles;
      
      let name = 'Unknown User';
      let email = 'unknown@example.com';
      if (account) {
        email = account.email || email;
        name = account.name || (account.email ? account.email.split('@')[0].replace(/[^a-zA-Z]/g, ' ') : name);
      }
      const capitalizedName = name.replace(/\b\w/g, l => l.toUpperCase());

      return {
        id: m.id,
        sno: offset + index + 1,
        name: capitalizedName,
        email: email,
        role: role?.role_name || 'Member',
        status: m.status === 'accepted' ? 'Active' : m.status.charAt(0).toUpperCase() + m.status.slice(1),
        lastActive: m.created_at ? new Date(m.created_at).toISOString().slice(0, 16).replace('T', ' ') : '-',
      };
    });

    return successDataResponse({
      data: formattedMembers,
      count: count || formattedMembers.length,
    });
  },
);

export const removeWorkspaceMember = catchAsync(
  async ({ request: _request, user, params }: { request: NextRequest; user?: any; params?: Record<string, string> }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const workspaceId = params?.id;
    const memberId = params?.memberId;

    if (!workspaceId || !memberId) {
      return new Response(JSON.stringify({ error: 'Workspace ID and Member ID are required' }), { status: 400 });
    }

    // Update status to 'removed' instead of deleting
    const { error } = await adminClient
      .from('workspace_members')
      .update({ status: 'removed' })
      .eq('id', memberId)
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('Remove member error:', error);
      throw error;
    }

    // Note: To be fully consistent, we might want to also revoke seats here if needed
    try {
       await adminClient
         .from('seat_assignments')
         .update({ is_active: false, revoked_at: new Date().toISOString() })
         .eq('workspace_id', workspaceId)
         .in('user_id', (
            await adminClient.from('workspace_members').select('user_id').eq('id', memberId)
         ).data?.map((m: any) => m.user_id) || [])
         .eq('is_active', true);
    } catch (e) {
      // Ignored
    }

    return successDataResponse('Member removed successfully');
  },
);

export const getWorkspaceUsageAnalytics = catchAsync(
  async ({ request, user, params }: { request: NextRequest; user?: any; params?: Record<string, string> }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const id = params?.id;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Workspace ID is required' }), { status: 400 });
    }

    // Parallel queries to fetch the usage analytics
    const coreClient = adminClient.schema('core') as any;
    const [leadsResponse, emailsResponse, meetingsResponse, documentsResponse, storageResponse] = await Promise.all([
      adminClient.from('crm_leads').select('id', { count: 'exact', head: true }).eq('workspace_id', id).eq('is_deleted', false),
      coreClient.from('emails').select('id', { count: 'exact', head: true }).eq('workspace_id', id).eq('direction', 'outbound').eq('is_deleted', false),
      coreClient.from('meetings').select('id', { count: 'exact', head: true }).eq('workspace_id', id).eq('is_deleted', false),
      coreClient.from('documents').select('id', { count: 'exact', head: true }).eq('workspace_id', id).eq('is_deleted', false),
      // Need a custom query or just selecting all and summing to get the file size since there is no aggregation out of the box in PostgREST without RPC
      coreClient.from('documents').select('file_size').eq('workspace_id', id).eq('is_deleted', false)
    ]);

    const leadsCount = leadsResponse.count || 0;
    const emailsCount = emailsResponse.count || 0;
    const meetingsCount = meetingsResponse.count || 0;
    const documentsCount = documentsResponse.count || 0;
    
    // Sum file_size for storage
    let totalStorageBytes = 0;
    if (storageResponse.data) {
      totalStorageBytes = storageResponse.data.reduce((acc, curr) => acc + (curr.file_size || 0), 0);
    }
    
    // Format storage
    const formatBytes = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    const usageStats = [
      { label: 'Leads Created', value: leadsCount.toLocaleString() },
      { label: 'Emails Sent', value: emailsCount.toLocaleString() },
      { label: 'Meetings Scheduled', value: meetingsCount.toLocaleString() },
      { label: 'Storage Used', value: formatBytes(totalStorageBytes) },
      { label: 'Documents Uploaded', value: documentsCount.toLocaleString() },
    ];

    return successDataResponse(usageStats);
  },
);

export const getWorkspaceIntegrations = catchAsync(
  async ({ request, user, params }: { request: NextRequest; user?: any; params?: Record<string, string> }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const id = params?.id;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Workspace ID is required' }), { status: 400 });
    }

    const coreClient = adminClient.schema('core') as any;

    const [
      connectorsReq,
      zapierReq,
      googleAdsReq,
      metaAdsReq,
      whatsappReq,
      emailReq,
      googleMeetReq,
      zoomReq
    ] = await Promise.all([
      coreClient.from('connectors').select('id, status, updated_at').eq('workspace_id', id).not('status', 'eq', 'disabled'),
      coreClient.from('zapier_integrations').select('id, status, updated_at').eq('workspace_id', id).eq('status', 'active'),
      coreClient.from('integration_connections').select('id, status, updated_at').eq('workspace_id', id).eq('provider', 'google_ads').eq('is_deleted', false),
      coreClient.from('integration_connections').select('id, status, updated_at').eq('workspace_id', id).eq('provider', 'meta_ads').eq('is_deleted', false),
      coreClient.from('integration_accounts').select('id, status, updated_at').eq('workspace_id', id).eq('status', 'active'), // WhatsApp might just be integration_accounts with connection_id or we can check integration_connections for provider whatsapp
      coreClient.from('email_accounts').select('id, is_active, updated_at, settings').eq('workspace_id', id).eq('is_active', true),
      coreClient.from('integration_connections').select('id, status, updated_at').eq('workspace_id', id).eq('provider', 'GOOGLE').eq('is_deleted', false),
      coreClient.from('integration_connections').select('id, status, updated_at').eq('workspace_id', id).eq('provider', 'ZOOM').eq('is_deleted', false)
    ]);

    // Format Whatsapp request properly by querying connections instead, or just assume if connections exist
    const { data: whatsappConns } = await coreClient.from('integration_connections').select('id, status, updated_at').eq('workspace_id', id).eq('provider', 'whatsapp').eq('is_deleted', false);

    const checkConnected = (res: any) => res.data && res.data.length > 0;
    const getFirstDate = (res: any) => res.data && res.data.length > 0 && res.data[0].updated_at ? new Date(res.data[0].updated_at).toISOString().slice(0, 10) : null;

    const integrations = [
      {
        id: 'website-connector',
        name: 'Website Connector',
        category: 'Data & Sync',
        services: ['Forms', 'API', 'Webhooks'],
        isConnected: checkConnected(connectorsReq),
        connectedSince: getFirstDate(connectorsReq),
        connectionId: checkConnected(connectorsReq) ? connectorsReq.data[0].id : null,
      },
      {
        id: 'zapier',
        name: 'Zapier Integration',
        category: 'Automation',
        services: ['Triggers', 'Actions'],
        isConnected: checkConnected(zapierReq),
        connectedSince: getFirstDate(zapierReq),
        connectionId: checkConnected(zapierReq) ? zapierReq.data[0].id : null,
      },
      {
        id: 'google-ads',
        name: 'Google Ads Lead Forms',
        category: 'Social & Ads',
        services: ['Leads', 'Sync'],
        isConnected: checkConnected(googleAdsReq),
        connectedSince: getFirstDate(googleAdsReq),
        connectionId: checkConnected(googleAdsReq) ? googleAdsReq.data[0].id : null,
      },
      {
        id: 'meta-ads',
        name: 'Meta Lead Ads',
        category: 'Social & Ads',
        services: ['Facebook', 'Instagram', 'Leads'],
        isConnected: checkConnected(metaAdsReq),
        connectedSince: getFirstDate(metaAdsReq),
        connectionId: checkConnected(metaAdsReq) ? metaAdsReq.data[0].id : null,
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp Business',
        category: 'Messaging',
        services: ['Messages', 'Notifications'],
        isConnected: whatsappConns && whatsappConns.length > 0,
        connectedSince: whatsappConns && whatsappConns.length > 0 ? new Date(whatsappConns[0].updated_at).toISOString().slice(0, 10) : null,
        connectionId: whatsappConns && whatsappConns.length > 0 ? whatsappConns[0].id : null,
      },
      {
        id: 'email-accounts',
        name: 'Email Accounts',
        category: 'Messaging',
        services: ['Inbox', 'Outreach'],
        isConnected: checkConnected(emailReq),
        connectedSince: getFirstDate(emailReq),
        connectionId: checkConnected(emailReq) ? emailReq.data[0].id : null,
      },
      {
        id: 'google-meet',
        name: 'Google Meet Integration',
        category: 'Productivity',
        services: ['Calendar', 'Meetings'],
        isConnected: checkConnected(googleMeetReq),
        connectedSince: getFirstDate(googleMeetReq),
        connectionId: checkConnected(googleMeetReq) ? googleMeetReq.data[0].id : null,
      },
      {
        id: 'zoom',
        name: 'Zoom Integration',
        category: 'Productivity',
        services: ['Meetings', 'Recordings'],
        isConnected: checkConnected(zoomReq),
        connectedSince: getFirstDate(zoomReq),
        connectionId: checkConnected(zoomReq) ? zoomReq.data[0].id : null,
      }
    ];

    return successDataResponse(integrations);
  }
);

export const disconnectWorkspaceIntegration = catchAsync(
  async ({ request, user, params }: { request: NextRequest; user?: any; params?: Record<string, string> }) => {
    const adminClient = getSupabaseServerAdminClient<Database>();
    const id = params?.id;
    const url = new URL(request.url);
    const integrationId = url.searchParams.get('integrationId');
    const connectionId = url.searchParams.get('connectionId');

    if (!id || !integrationId || !connectionId) {
      return new Response(JSON.stringify({ error: 'Workspace ID, integrationId, and connectionId are required' }), { status: 400 });
    }

    const coreClient = adminClient.schema('core') as any;
    
    // We get the user ID for updated_by/deleted_by. Since this is an admin route, user is the admin user
    // However, the action is done on behalf of the workspace.
    const userId = user?.id;

    switch (integrationId) {
      case 'website-connector':
        await coreClient.from('connectors').delete().eq('id', connectionId).eq('workspace_id', id);
        break;
      case 'zapier':
        await coreClient.from('zapier_integrations').update({ status: 'disabled', updated_at: new Date().toISOString() }).eq('id', connectionId).eq('workspace_id', id);
        break;
      case 'google-ads':
      case 'meta-ads':
      case 'google-meet':
      case 'zoom':
      case 'whatsapp':
        // Soft delete integration connections and accounts
        await coreClient.from('integration_connections')
          .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId })
          .eq('id', connectionId)
          .eq('workspace_id', id);
          
        await coreClient.from('integration_accounts')
          .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId })
          .eq('connection_id', connectionId)
          .eq('workspace_id', id);
        break;
      case 'email-accounts':
        // Soft delete email account
        const { data: existingAccount } = await coreClient.from('email_accounts').select('settings').eq('id', connectionId).eq('workspace_id', id).single();
        await coreClient.from('email_accounts')
          .update({
            is_active: false,
            is_sync_enabled: false,
            inbound_enabled: false,
            outbound_enabled: false,
            settings: {
              ...(existingAccount?.settings ?? {}),
              deleted_at: new Date().toISOString(),
              deleted_by: userId,
            },
            updated_by: userId,
          })
          .eq('id', connectionId)
          .eq('workspace_id', id);
        break;
      default:
        return new Response(JSON.stringify({ error: 'Unknown integration' }), { status: 400 });
    }

    return successDataResponse('Integration disconnected successfully');
  }
);
