import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync, successDataResponse } from '../../../utils/response-handler';

export const createCompany = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { name, billing_country, logo_url, created_by, tax_id } = body;

    if (!name || !billing_country) {
      return NextResponse.json(
        { message: 'Name and billing_country are required' },
        { status: 400 }
      );
    }

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        name,
        billing_country,
        logo_url,
        created_by,
        tax_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Company creation error:', error);
      return NextResponse.json(
        { message: 'Failed to create company' },
        { status: 500 }
      );
    }

    return successDataResponse('Company created successfully', company);
  }
);

export const updateCompany = catchAsync(
  async ({ request, params }: { request: NextRequest; params?: Record<string, string> }) => {
    const supabase = getSupabaseServerClient();
    const companyId = params?.id;
    const body = await request.json();
    
    if (!companyId) {
      return NextResponse.json({ message: 'Company ID is required' }, { status: 400 });
    }

    const { data: company, error } = await supabase
      .from('companies')
      .update(body)
      .eq('id', companyId)
      .select()
      .single();

    if (error) {
      console.error('Company update error:', error);
      return NextResponse.json(
        { message: 'Failed to update company' },
        { status: 500 }
      );
    }

    // Sync updated Tax ID to Stripe Customers if billing_country and tax_id are present
    if (company?.tax_id && company?.billing_country) {
      // Trigger Stripe sync in the background without awaiting it to avoid blocking the response
      updateTaxIdInStripe(supabase, companyId, company.billing_country, company.tax_id);
    }

    return successDataResponse('Company updated successfully', company);
  }
);

/**
 * Update the company Tax ID in Stripe customer records asynchronously.
 */
async function updateTaxIdInStripe(
  supabase: any,
  companyId: string,
  billingCountry: string,
  taxId: string
): Promise<void> {
  try {
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select(`
        id,
        workspace_module_seats (
          provider_customer_id
        )
      `)
      .eq('company_id', companyId);

    if (workspaces && workspaces.length > 0) {
      const stripeCustomerIds = workspaces
        .flatMap((w: any) => w.workspace_module_seats || [])
        .map((s: any) => s.provider_customer_id)
        .filter((id: string) => id && !id.includes('trial') && !id.includes('dummy'));

      if (stripeCustomerIds.length > 0) {
        const { mapCountryToStripeTaxType, syncTaxIdToStripe } = await import(
          '~/lib/stripe/stripe-client'
        );
        const taxType = mapCountryToStripeTaxType(billingCountry, taxId);

        if (taxType) {
          for (const customerId of stripeCustomerIds) {
            try {
              await syncTaxIdToStripe(customerId, billingCountry, taxId);
            } catch (err) {
              console.error(`Failed to sync Tax ID to customer ${customerId}:`, err);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to sync updated company Tax ID to Stripe:', err);
  }
}
