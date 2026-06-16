import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import {
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
} from '../employees/controller.helpers';

const bucketName = 'hrms_employee_documents';

const uploadController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const userId = getRouteUserId(user);
  const workspaceId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });

  await requireEmployeePermission({
    featureKey: 'upload',
    minAccessLevel: 'team',
    moduleKey: 'hrms_documents',
    supabaseAdmin,
    userId,
    workspaceId,
  });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    throw new ApiError('No file provided', 400);
  }

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new ApiError('Invalid file type. Allowed: PDF, Word, Images.', 400);
  }

  const fileExt = file.name.split('.').pop() || '';
  const fileName = `${workspaceId}/${userId ?? 'system'}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(fileName, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new ApiError(uploadError.message, 400);
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName);

  return successDataResponse('File uploaded successfully', {
    name: file.name,
    type: file.type,
    url: publicUrl,
  });
});

export { uploadController };
