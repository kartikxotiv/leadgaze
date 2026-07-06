import { validateTaxIdLocally } from './local-validator';
import { validateTaxIdWithLookupTax } from './lookuptax';

export interface TaxValidationParams {
  countryIso: string;
  tin: string;
}

export interface TaxValidationResponse {
  isValid: boolean;
  message: string;
}

/**
 * Validates a company's Tax ID (TIN) based on the country code.
 * Currently uses local format validation, but can be switched to validateTaxIdWithLookupTax
 * if LookupTax verification is enabled.
 */
export async function validateCompanyTaxId({
  countryIso,
  tin,
}: TaxValidationParams): Promise<TaxValidationResponse> {
  // Use local validator as requested
  const localResult = validateTaxIdLocally(countryIso, tin);
  return {
    isValid: localResult.isValid,
    message: localResult.message,
  };

  // To switch to Lookuptax in the future, uncomment this and comment the above:
  // return validateTaxIdWithLookupTax(countryIso, tin);
}
