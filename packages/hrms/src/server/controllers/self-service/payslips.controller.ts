import { NextResponse } from 'next/server';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import {
  buildPayslipText,
  getPayslipDetail,
  getSelfServiceContext,
  hasSelfServicePermission,
} from './controller.shared';

const getSelfServicePayslipController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getSelfServiceContext({ request, user });
    const payslipId = params?.id;

    if (!payslipId) {
      throw new ApiError('Payslip id is required', 400);
    }

    const detail = await getPayslipDetail({
      context,
      payslipId,
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
  },
);

const downloadSelfServicePayslipController = catchAsync(
  async ({ params, request, user }) => {
    const context = await getSelfServiceContext({ request, user });
    const payslipId = params?.id;

    if (!payslipId) {
      throw new ApiError('Payslip id is required', 400);
    }

    const detail = await getPayslipDetail({
      context,
      payslipId,
    });

    const canDownloadPayslip =
      context.canDownloadPayslip &&
      (await hasSelfServicePermission({
        featureKey: 'download_payslip',
        supabaseAdmin: context.supabaseAdmin,
        userId: context.userId,
        workspaceId: context.workspaceId,
      }));

    if (!canDownloadPayslip) {
      throw new ApiError(
        'You do not have permission to download payslips',
        403,
      );
    }

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
