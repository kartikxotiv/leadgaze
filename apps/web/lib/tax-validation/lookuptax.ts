import axios from 'axios';

export interface TaxValidationResult {
  isValid: boolean;
  message: string;
  referenceId?: string;
  countryIso?: string;
  tin?: string;
}

export async function validateTaxIdWithLookupTax(
  countryIso: string,
  tin: string
): Promise<TaxValidationResult> {
  const apiKey = process.env.LOOKUPTAX_API_KEY;
  if (!apiKey) {
    console.warn('LOOKUPTAX_API_KEY is not defined.');
    return {
      isValid: false,
      message: 'LookupTax API key not configured.',
    };
  }

  try {
    const response = await axios.get('https://api.lookuptax.com/validate', {
      params: {
        country_iso: countryIso,
        tin: tin,
      },
      headers: {
        'X-API-Key': apiKey,
      },
    });

    const data = response.data;
    
    // Check validation status from LookupTax response
    const isValid = data?.validation?.overall?.isValid ?? false;
    const message = data?.validation?.overall?.message ?? 'Tax ID is invalid';

    return {
      isValid,
      message,
      referenceId: data?.referenceId,
      countryIso: data?.countryIso,
      tin: data?.tin,
    };
  } catch (error: any) {
    console.error('Error validating tax ID with LookupTax:', error?.response?.data || error?.message);
    const errMsg = error?.response?.data?.message || error?.message || 'Failed to validate Tax ID';
    
    return {
      isValid: false,
      message: errMsg,
    };
  }
}
