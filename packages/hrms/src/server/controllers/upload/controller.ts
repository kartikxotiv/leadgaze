import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
    ApiError,
    catchAsync,
    successDataResponse,
} from '~/utils/response-handler';
import type { Database } from '~/lib/database.types';

const uploadController = catchAsync(async ({ request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<Database>();
    const organizationId = await getCurrentUserOrganizationId(user?.id);

    if (!organizationId) {
        throw new ApiError('Organization not found for user', 404);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
        throw new ApiError('No file provided', 400);
    }

    // Validate file type
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
    const fileName = `${organizationId}/${user?.id}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const { error: uploadError } = await supabaseAdmin.storage
        .from('employee_documents')
        .upload(filePath, file, {
            contentType: file.type,
            upsert: true,
        });

    if (uploadError) {
        throw new ApiError(uploadError.message, 400);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
        .from('employee_documents')
        .getPublicUrl(filePath);

    return successDataResponse('File uploaded successfully', {
        url: publicUrl,
        name: file.name,
        type: file.type,
    });
});

export { uploadController };
