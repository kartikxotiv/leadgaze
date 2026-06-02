import { NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import type { Database } from '~/lib/database.types';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

type OrganizationInsert =
  Database['public']['Tables']['organizations']['Insert'];

type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeRoleInsert =
  Database['public']['Tables']['employee_roles']['Insert'];

const createOrganizationController = catchAsync(async ({ request }) => {
  const supabase = getSupabaseServerClient();
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  const body = await request.json();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const payload: OrganizationInsert = {
    name: body.name,
    display_name: body.display_name ?? undefined,
    contact_email: body.contact_email ?? undefined,
    contact_phone: body.contact_phone ?? undefined,
    address: body.address ?? undefined,
    cin: body.cin ?? undefined,
    gstin: body.gstin ?? undefined,
    pan_number: body.pan_number ?? undefined,
    tan_number: body.tan_number ?? undefined,
    logo_url: body.logo_url ?? undefined,
    plan: body.plan ?? undefined,
    fiscal_year_start: body.fiscal_year_start ?? undefined,
    created_by: user.id,
    updated_by: user.id,
    owner_id: user.id,
  };

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .insert(payload)
    .select('*')
    .single();

  if (organizationError) {
    return NextResponse.json(
      {
        success: false,
        message: organizationError.message,
      },
      { status: 400 },
    );
  }

  // Create employee profile for the creator (director)
  const userFirstName =
    user.user_metadata?.first_name ||
    user.user_metadata?.name?.split(' ')[0] ||
    'Organization';
  const userLastName =
    user.user_metadata?.last_name ||
    user.user_metadata?.name?.split(' ').slice(1).join(' ') ||
    'Admin';

  const generateEmployeeCodePrefix = (orgName: string) => {
    const words = orgName.split(/\s+/).filter(Boolean);
    let prefix = words
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase();

    if (prefix.length < 4) {
      const remainingChars = 4 - prefix.length;
      const nameWithoutSpaces = orgName.replace(/\s+/g, '');
      let charsToAdd = '';
      let currentNameIndex = 0;

      while (
        charsToAdd.length < remainingChars &&
        currentNameIndex < nameWithoutSpaces.length
      ) {
        const char = nameWithoutSpaces.charAt(currentNameIndex);
        if (!prefix.includes(char)) {
          // Only add if not already part of initials
          charsToAdd += char;
        }
        currentNameIndex++;
      }
      prefix += charsToAdd;
    }
    return prefix.substring(0, 4);
  };

  const orgCodePrefix = generateEmployeeCodePrefix(organization.name);
  const employeeCode = `${orgCodePrefix}001`; // Starting with 001 for the first employee

  const employeePayload: EmployeeInsert = {
    organization_id: organization.id,
    account_id: user.id,
    first_name: userFirstName,
    last_name: userLastName,
    work_email: user.email!,
    employee_code: employeeCode,
    joining_date: new Date().toISOString().split('T')[0], // Current date
    employment_type: 'full_time',
    status: 'active',
    designation: 'Director',
    created_by: user.id,
    updated_by: user.id,
  };

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from('employees')
    .insert(employeePayload)
    .select('id')
    .single();

  if (employeeError) {
    return NextResponse.json(
      {
        success: false,
        message: employeeError.message,
      },
      { status: 500 },
    );
  }

  // Assign admin role to the newly created employee
  // Explicitly create the 'admin' role for the new organization if it doesn't exist
  const { data: createdAdminRole, error: createAdminRoleError } =
    await supabaseAdmin
      .from('roles')
      .upsert(
        {
          organization_id: organization.id,
          role_key: 'admin',
          role_name: 'Admin',
          description: 'Administrator role with full access',
          is_system: true,
          hierarchy_level: 100,
        },
        { onConflict: 'organization_id,role_key' },
      )
      .select('id')
      .single();

  if (createAdminRoleError) {
    return NextResponse.json(
      {
        success: false,
        message: createAdminRoleError.message,
      },
      { status: 500 },
    );
  }

  const adminRoleId = createdAdminRole.id;

  // Assign admin role to the newly created employee in employee_roles
  const employeeRolePayload: EmployeeRoleInsert = {
    organization_id: organization.id,
    employee_id: employee.id,
    role_id: adminRoleId,
    created_by: user.id,
    updated_by: user.id,
  };

  const { error: employeeRoleError } = await supabaseAdmin
    .from('employee_roles')
    .insert(employeeRolePayload);

  if (employeeRoleError) {
    return NextResponse.json(
      {
        success: false,
        message: employeeRoleError.message,
      },
      { status: 500 },
    );
  }

  return successDataResponse('Organization created successfully', organization);
});

export { createOrganizationController };
