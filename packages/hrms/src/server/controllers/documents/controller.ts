import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
    ApiError,
    catchAsync,
    successDataResponse,
} from '~/utils/response-handler';

type DocumentInsert = Database['public']['Tables']['employee_documents']['Insert'];
type DocumentWriteBody = {
    employeeId: string;
    organizationId: string;
    uploadFile: string;
    name?: string | null;
};

const documentSelect = `
  id,
  organization_id,
  employee_id,
  name,
  file_url,
  uploaded_at,
  created_at,
  updated_at,
  employee:employees (
    first_name,
    last_name
  )
`;

const createDocumentController = catchAsync(async ({ body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<Database>();
    const organizationId = await getCurrentUserOrganizationId(user?.id);
    const documentBody = body as DocumentWriteBody;

    if (!organizationId) {
        throw new ApiError('Organization not found for user', 404);
    }

    const payload: DocumentInsert = {
        name: documentBody.name?.trim() ?? '',
        file_url: documentBody.uploadFile?.trim() ?? '',
        employee_id: documentBody.employeeId?.trim() ?? '',
        organization_id: organizationId,
        created_by: user?.id,
        updated_by: user?.id,
    };

    const { data, error } = await supabaseAdmin
        .from('employee_documents')
        .insert(payload)
        .select(documentSelect)
        .single();

    if (error) {
        throw new ApiError(error.message, 400);
    }

    return successDataResponse('Document created successfully', data);
});

const listDocumentsController = catchAsync(async ({ user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<Database>();
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
        throw new ApiError('Organization not found for user', 404);
    }

    const { data, error } = await supabaseAdmin
        .from('employee_documents')
        .select(documentSelect)
        .eq('organization_id', organizationId)
        .order('name', { ascending: true });

    if (error) {
        throw new ApiError(error.message, 400);
    }

    return successDataResponse('Documents fetched successfully', data ?? []);
});

const updateDocumentController = catchAsync(async ({ body, user, params = {} }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<Database>();
    const organizationId = await getCurrentUserOrganizationId(user?.id);
    const documentId = params.id as string;
    const documentBody = body as Partial<DocumentWriteBody>;

    if (!organizationId) {
        throw new ApiError('Organization not found for user', 404);
    }

    const payload: Partial<DocumentInsert> = {
        name: documentBody.name?.trim(),
        file_url: documentBody.uploadFile?.trim(),
        employee_id: documentBody.employeeId?.trim(),
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
        .from('employee_documents')
        .update(payload)
        .eq('id', documentId)
        .eq('organization_id', organizationId)
        .select(documentSelect)
        .single();

    if (error) {
        throw new ApiError(error.message, 400);
    }

    return successDataResponse('Document updated successfully', data);
});

const deleteDocumentController = catchAsync(async ({ user, params = {} }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<Database>();
    const organizationId = await getCurrentUserOrganizationId(user?.id);
    const documentId = params.id as string;

    if (!organizationId) {
        throw new ApiError('Organization not found for user', 404);
    }

    const { error } = await supabaseAdmin
        .from('employee_documents')
        .delete()
        .eq('id', documentId)
        .eq('organization_id', organizationId);

    if (error) {
        throw new ApiError(error.message, 400);
    }

    return successDataResponse('Document deleted successfully', null);
});

export {
    createDocumentController,
    deleteDocumentController,
    listDocumentsController,
    updateDocumentController,
};
