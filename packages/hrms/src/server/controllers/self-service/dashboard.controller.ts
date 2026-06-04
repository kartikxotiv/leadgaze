/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import { getEmployeeProfile, getSelfServiceContext } from './controller.shared';

const getSelfServiceDashboardController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const context = await getSelfServiceContext(user?.id);

  const [employee, payslipsResult, requestsResult, announcementsResult] =
    await Promise.all([
      getEmployeeProfile({
        organizationId: context.organizationId,
        employeeId: context.employeeId,
      }),
      (supabaseAdmin as any)
        .from('payslips')
        .select(
          `
          id,
          status,
          gross_salary,
          deductions,
          employer_contributions,
          net_salary,
          generated_at,
          published_at,
          payroll_run:payroll_runs(
            id,
            name,
            period_start,
            period_end,
            payment_date
          )
        `,
        )
        .eq('organization_id', context.organizationId)
        .eq('employee_id', context.employeeId)
        .order('generated_at', { ascending: false })
        .limit(8),
      (supabaseAdmin as any)
        .from('hr_requests')
        .select(
          `
          id,
          category,
          subject,
          description,
          priority,
          status,
          response_message,
          created_at,
          updated_at,
          resolved_at
        `,
        )
        .eq('organization_id', context.organizationId)
        .eq('employee_id', context.employeeId)
        .order('created_at', { ascending: false })
        .limit(10),
      (supabaseAdmin as any)
        .from('company_announcements')
        .select(
          `
          id,
          title,
          summary,
          body,
          category,
          is_pinned,
          published_at,
          expires_at,
          cta_label,
          cta_url
        `,
        )
        .eq('organization_id', context.organizationId)
        .eq('status', 'published')
        .lte('published_at', new Date().toISOString())
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(10),
    ]);

  if (payslipsResult.error) {
    throw new ApiError(payslipsResult.error.message, 400);
  }

  if (requestsResult.error) {
    throw new ApiError(requestsResult.error.message, 400);
  }

  if (announcementsResult.error) {
    throw new ApiError(announcementsResult.error.message, 400);
  }

  const nowIso = new Date().toISOString();
  const announcements = (announcementsResult.data ?? []).filter(
    (announcement: any) =>
      !announcement.expires_at || announcement.expires_at >= nowIso,
  );
  const payslips = payslipsResult.data ?? [];
  const requests = requestsResult.data ?? [];
  const profileFields = [
    employee.first_name,
    employee.last_name,
    employee.phone,
    employee.personal_email,
    employee.address,
    employee.emergency_contact_name,
    employee.emergency_contact_phone,
  ];
  const completedFields = profileFields.filter(Boolean).length;
  const profileCompletion = Math.round(
    (completedFields / profileFields.length) * 100,
  );

  return successDataResponse('Self service dashboard fetched successfully', {
    announcements,
    employee,
    metrics: {
      activeAnnouncements: announcements.length,
      latestNetPay: payslips[0]?.net_salary ?? null,
      openRequests: requests.filter((request: any) =>
        ['open', 'in_progress'].includes(request.status),
      ).length,
      profileCompletion,
    },
    payslips,
    permissions: {
      accessLevel: context.accessLevel,
      canCreateRequest: context.canCreateRequest,
      canDownloadPayslip: context.canDownloadPayslip,
      canUpdateProfile: context.canUpdateProfile,
      canView: true,
      employeeId: context.employeeId,
    },
    requests,
  });
});

export { getSelfServiceDashboardController };
