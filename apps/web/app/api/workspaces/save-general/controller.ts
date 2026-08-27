import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

/**
 * POST /api/workspaces/save-general
 *
 * Consolidated "General Settings" save endpoint — replaces:
 *   - PATCH /api/companies/:id   (sequential)
 *   - PATCH /api/workspaces/:id  (sequential)
 *
 * Strategy:
 *  - If company already exists: run company UPDATE + workspace UPDATE in parallel.
 *  - If no company yet: create company first, then update workspace with the new company_id.
 */
export const saveWorkspaceGeneralSettings = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient() as any;

    const {
      workspaceId,
      workspaceName,
      companyId,
      company,
    }: {
      workspaceId: string;
      workspaceName: string;
      companyId: string | null;
      company: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
        postal_code?: string;
        country?: string;
        billing_country?: string;
        logo_url?: string | null;
        tax_id?: string | null;
        invoice_address?: string;
        invoice_city?: string;
        invoice_postal_code?: string;
        invoice_state?: string;
      };
    } = await request.json();

    if (!workspaceId || !workspaceName || !company?.name) {
      return NextResponse.json(
        { message: 'workspaceId, workspaceName, and company.name are required' },
        { status: 400 },
      );
    }

    let resolvedCompanyId = companyId;

    if (companyId) {
      // === Existing company — run both updates in parallel ===
      const [companyResult, workspaceResult] = await Promise.all([
        supabase
          .from('companies')
          .update(company)
          .eq('id', companyId)
          .select('id')
          .single(),
        supabase
          .from('workspaces')
          .update({ name: workspaceName })
          .eq('id', workspaceId)
          .select('id, name, slug')
          .single(),
      ]);

      if (companyResult.error) {
        console.error('[saveWorkspaceGeneralSettings] Company update error:', companyResult.error);
        return NextResponse.json(
          { message: 'Failed to update company details' },
          { status: 500 },
        );
      }

      if (workspaceResult.error) {
        console.error('[saveWorkspaceGeneralSettings] Workspace update error:', workspaceResult.error);
        return NextResponse.json(
          { message: 'Failed to update workspace details' },
          { status: 500 },
        );
      }

      return successDataResponse('Settings saved successfully', {
        workspace: workspaceResult.data,
        company: companyResult.data,
      });
    }

    // === No company yet — create company, then update workspace ===
    const { data: newCompany, error: createError } = await supabase
      .from('companies')
      .insert(company)
      .select('id')
      .single();

    if (createError || !newCompany) {
      console.error('[saveWorkspaceGeneralSettings] Company creation error:', createError);
      return NextResponse.json(
        { message: 'Failed to create company details' },
        { status: 500 },
      );
    }

    resolvedCompanyId = newCompany.id;

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .update({ name: workspaceName, company_id: resolvedCompanyId })
      .eq('id', workspaceId)
      .select('id, name, slug')
      .single();

    if (workspaceError) {
      console.error('[saveWorkspaceGeneralSettings] Workspace update error:', workspaceError);
      return NextResponse.json(
        { message: 'Failed to update workspace details' },
        { status: 500 },
      );
    }

    return successDataResponse('Settings saved successfully', {
      workspace,
      company: newCompany,
    });
  },
);
