import { NextResponse } from 'next/server';

import { requirePermission } from '~/lib/server/rbac';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  buildPayslipText,
  getPayslipDetail,
  getSelfServiceContext,
} from './controller.shared';

const getSelfServicePayslipController = catchAsync(async ({ params, user }) => {
  const context = await getSelfServiceContext(user?.id);
  const payslipId = params?.id;

  if (!payslipId) {
    throw new ApiError('Payslip id is required', 400);
  }

  const detail = await getPayslipDetail({
    organizationId: context.organizationId,
    payslipId,
  });

  await requirePermission({
    accountId: user!.id,
    organizationId: context.organizationId,
    moduleKey: 'self_service',
    featureKey: 'view',
    minAccessLevel: 'own',
    targetEmployeeId: detail.payslip.employee_id,
  });

  return successDataResponse('Payslip fetched successfully', {
    components: detail.components,
    payslip: {
      deductions: detail.payslip.deductions,
      employee_code: detail.payslip.employee_code,
      employee_name: detail.payslip.employee_name,
      employer_contributions: detail.payslip.employer_contributions,
      generated_at: detail.payslip.generated_at,
      gross_salary: detail.payslip.gross_salary,
      id: detail.payslip.id,
      net_salary: detail.payslip.net_salary,
      payroll_run: detail.payslip.payroll_run,
      published_at: detail.payslip.published_at,
      status: detail.payslip.status,
    },
  });
});

const downloadSelfServicePayslipController = catchAsync(
  async ({ params, user }) => {
    const context = await getSelfServiceContext(user?.id);
    const payslipId = params?.id;

    if (!payslipId) {
      throw new ApiError('Payslip id is required', 400);
    }

    const detail = await getPayslipDetail({
      organizationId: context.organizationId,
      payslipId,
    });

    if (!context.canDownloadPayslip) {
      throw new ApiError(
        'You do not have permission to download payslips',
        403,
      );
    }

    await requirePermission({
      accountId: user!.id,
      organizationId: context.organizationId,
      moduleKey: 'self_service',
      featureKey: 'download_payslip',
      minAccessLevel: 'own',
      targetEmployeeId: detail.payslip.employee_id,
    });

    const fileLabel =
      detail.payslip.payroll_run?.name ??
      `${detail.payslip.generated_at.slice(0, 10)}-payslip`;
    const sanitizedLabel = fileLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return new NextResponse(buildPayslipText(detail), {
      headers: {
        'Content-Disposition': `attachment; filename="${sanitizedLabel || 'payslip'}.txt"`,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      status: 200,
    });
  },
);

export {
  downloadSelfServicePayslipController,
  getSelfServicePayslipController,
};
