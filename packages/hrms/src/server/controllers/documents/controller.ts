import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import {
  type SupabaseAdminClient,
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
} from '../employees/controller.helpers';

type DocumentWriteBody = {
  employeeId?: string | null;
  name?: string | null;
  uploadFile?: string | null;
};

type DocumentRow = {
  created_at: string;
  employee_id: string | null;
  expiry_at: string | null;
  file_url: string;
  id: string;
  name: string;
  status: string;
  updated_at: string;
  uploaded_at: string;
  workspace_id: string;
};

type EmployeeSummary = {
  employee_code: string;
  first_name: string;
  id: string;
  last_name: string | null;
  work_email: string;
};

const documentModuleKey = 'hrms_documents';
const documentSelect = `
  id,
  workspace_id,
  employee_id,
  name,
  file_url,
  uploaded_at,
  expiry_at,
  status,
  created_at,
  updated_at
`;

const createDocumentController = catchAsync(async ({ body, request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const userId = getRouteUserId(user);
  const workspaceId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });
  const documentBody = body as DocumentWriteBody;

  await requireEmployeePermission({
    featureKey: 'create',
    minAccessLevel: 'team',
    moduleKey: documentModuleKey,
    supabaseAdmin,
    userId,
    workspaceId,
  });

  const employeeId = normalizeRequired(documentBody.employeeId);
  const fileUrl = normalizeRequired(documentBody.uploadFile);

  await validateDocumentEmployee({
    employeeId,
    supabaseAdmin,
    workspaceId,
  });

  const { data, error } = await hrms
    .from('employee_documents')
    .insert({
      created_by: userId,
      employee_id: employeeId,
      file_url: fileUrl,
      name: documentBody.name?.trim() ?? '',
      updated_by: userId,
      workspace_id: workspaceId,
    })
    .select(documentSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const [document] = await enrichDocuments({
    documents: data ? [data as DocumentRow] : [],
    supabaseAdmin,
    workspaceId,
  });

  return successDataResponse('Document created successfully', document);
});

const listDocumentsController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const userId = getRouteUserId(user);
  const workspaceId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });

  await requireEmployeePermission({
    featureKey: 'view',
    moduleKey: documentModuleKey,
    supabaseAdmin,
    userId,
    workspaceId,
  });

  const { data, error } = await hrms
    .from('employee_documents')
    .select(documentSelect)
    .eq('workspace_id', workspaceId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const documents = await enrichDocuments({
    documents: (data ?? []) as DocumentRow[],
    supabaseAdmin,
    workspaceId,
  });

  return successDataResponse('Documents fetched successfully', documents);
});

const updateDocumentController = catchAsync(
  async ({ body, params = {}, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);
    const userId = getRouteUserId(user);
    const workspaceId = await getRequiredWorkspaceId({
      request,
      supabaseAdmin,
      userId,
    });
    const documentId = getDocumentId(params);
    const documentBody = body as Partial<DocumentWriteBody>;

    await requireEmployeePermission({
      featureKey: 'edit',
      minAccessLevel: 'team',
      moduleKey: documentModuleKey,
      supabaseAdmin,
      userId,
      workspaceId,
    });

    if (documentBody.employeeId) {
      await validateDocumentEmployee({
        employeeId: documentBody.employeeId,
        supabaseAdmin,
        workspaceId,
      });
    }

    const payload = {
      employee_id: documentBody.employeeId?.trim(),
      file_url: documentBody.uploadFile?.trim(),
      name: documentBody.name?.trim(),
      updated_by: userId,
    };

    const { data, error } = await hrms
      .from('employee_documents')
      .update(payload)
      .eq('id', documentId)
      .eq('workspace_id', workspaceId)
      .select(documentSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    const [document] = await enrichDocuments({
      documents: data ? [data as DocumentRow] : [],
      supabaseAdmin,
      workspaceId,
    });

    return successDataResponse('Document updated successfully', document);
  },
);

const deleteDocumentController = catchAsync(
  async ({ params = {}, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);
    const userId = getRouteUserId(user);
    const workspaceId = await getRequiredWorkspaceId({
      request,
      supabaseAdmin,
      userId,
    });
    const documentId = getDocumentId(params);

    await requireEmployeePermission({
      featureKey: 'delete',
      minAccessLevel: 'team',
      moduleKey: documentModuleKey,
      supabaseAdmin,
      userId,
      workspaceId,
    });

    const { error } = await hrms
      .from('employee_documents')
      .delete()
      .eq('id', documentId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Document deleted successfully', null);
  },
);

async function validateDocumentEmployee(params: {
  employeeId: string;
  supabaseAdmin: SupabaseAdminClient;
  workspaceId: string;
}) {
  const hrms = getHrmsClient(params.supabaseAdmin);
  const { data, error } = await hrms
    .from('employees')
    .select('id')
    .eq('id', params.employeeId)
    .eq('workspace_id', params.workspaceId)
    .eq('is_deleted', false)
    .neq('status', 'exited')
    .maybeSingle();

  if (error || !data) {
    throw new ApiError('Employee is invalid', 400);
  }
}

async function enrichDocuments(params: {
  documents: DocumentRow[];
  supabaseAdmin: SupabaseAdminClient;
  workspaceId: string;
}) {
  const employeeIds = uniqueIds(
    params.documents.map((document) => document.employee_id),
  );
  const hrms = getHrmsClient(params.supabaseAdmin);

  const { data: employees, error } =
    employeeIds.length > 0
      ? await hrms
          .from('employees')
          .select('id, employee_code, first_name, last_name, work_email')
          .eq('workspace_id', params.workspaceId)
          .in('id', employeeIds)
      : { data: [], error: null };

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const employeesById = new Map(
    ((employees ?? []) as EmployeeSummary[]).map((employee) => [
      employee.id,
      employee,
    ]),
  );

  return params.documents.map((document) => ({
    ...document,
    organization_id: document.workspace_id,
    employee: document.employee_id
      ? (employeesById.get(document.employee_id) ?? null)
      : null,
  }));
}

function getDocumentId(params?: Record<string, string>) {
  const documentId = params?.id;

  if (!documentId) {
    throw new ApiError('Document id is required', 400);
  }

  return documentId;
}

function normalizeRequired(value: string | null | undefined) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new ApiError('Document payload is invalid', 400);
  }

  return normalizedValue;
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

export {
  createDocumentController,
  deleteDocumentController,
  listDocumentsController,
  updateDocumentController,
};
