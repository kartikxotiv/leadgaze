import { NextRequest, NextResponse } from 'next/server';
import { validateCompanyTaxId } from '~/lib/tax-validation';
import { catchAsync, successDataResponse } from '../../../../utils/response-handler';

const validateTax = catchAsync(async ({ request }: { request: NextRequest }) => {
  const body = await request.json();
  const { country_iso, tin } = body;

  if (!country_iso || !tin) {
    return NextResponse.json(
      { success: false, message: 'Missing country_iso or tin' },
      { status: 400 }
    );
  }

  const result = await validateCompanyTaxId({ countryIso: country_iso, tin });

  return successDataResponse('Tax ID validation completed', result);
});

export async function POST(request: NextRequest) {
  return validateTax({ request });
}
