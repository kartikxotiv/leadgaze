import { NextRequest, NextResponse } from 'next/server';
import { validateCompanyTaxId } from '~/lib/tax-validation';
import { catchAsync, successDataResponse } from '../../../../utils/response-handler';
import { getCountryCodeByName } from '@kit/shared/countries';

const validateTax = catchAsync(async ({ request }: { request: NextRequest }) => {
  const body = await request.json();
  const { country_iso, tin } = body;

  if (!country_iso || !tin) {
    return NextResponse.json(
      { success: false, message: 'Missing country_iso or tin' },
      { status: 400 }
    );
  }

  // The frontend passes the full country name (e.g., "India"), so we need to map it to its ISO code ("IN")
  const isoCode = getCountryCodeByName(country_iso) || country_iso;

  const result = await validateCompanyTaxId({ countryIso: isoCode, tin });

  return successDataResponse('Tax ID validation completed', result);
});

export async function POST(request: NextRequest) {
  return validateTax({ request });
}
