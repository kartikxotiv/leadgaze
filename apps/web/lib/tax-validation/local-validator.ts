export interface LocalValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Validates the tax ID format locally based on country code.
 */
export function validateTaxIdLocally(countryIso: string, tin: string): LocalValidationResult {
  const normalizedTin = tin.trim().toUpperCase().replace(/[-\s]/g, '');

  if (!normalizedTin) {
    return {
      isValid: false,
      message: 'Tax ID / TIN cannot be empty.',
    };
  }

  const country = countryIso.toUpperCase();

  switch (country) {
    case 'SG': {
      // Singapore UEN (Unique Entity Number) or Tax ID:
      // Typically 9 or 10 characters.
      // Standard formats:
      // 1. Business: nnnnnnnnnX (9 digits + 1 letter, e.g. 196700197W)
      // 2. Local Company: yyyynnnnnX (10 chars: 4-digit year + 5 digits + 1 letter)
      // 3. Others (LLP, Society etc): TyyPQnnnnX (e.g. T08LL1234A)
      // Let's validate that it is 9 or 10 alphanumeric characters.
      const sgRegex = /^[0-9A-Z]{9,10}$/;
      if (!sgRegex.test(normalizedTin)) {
        return {
          isValid: false,
          message: 'Singapore UEN/Tax ID must be 9 or 10 alphanumeric characters.',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'US': {
      // US EIN (Employer Identification Number): 9 digits (formatted as XX-XXXXXXX or 9 digits)
      const cleanTin = tin.trim().replace(/[-\s]/g, '');
      const usRegex = /^[0-9]{9}$/;
      if (!usRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'US Employer Identification Number (EIN) must be exactly 9 digits.',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'IN': {
      // India:
      // 1. PAN: 10 characters (5 letters, 4 digits, 1 letter)
      // 2. GSTIN: 15 characters (2 digits, 10 PAN chars, 1 alphanumeric, 1 Z, 1 digit/letter)
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;

      if (normalizedTin.length === 10) {
        if (!panRegex.test(normalizedTin)) {
          return {
            isValid: false,
            message: 'Indian PAN must be 10 characters (e.g., ABCDE1234F).',
          };
        }
      } else if (normalizedTin.length === 15) {
        if (!gstinRegex.test(normalizedTin)) {
          return {
            isValid: false,
            message: 'Indian GSTIN must be 15 characters (e.g., 22AAAAA1111A1Z1).',
          };
        }
      } else {
        return {
          isValid: false,
          message: 'Indian Tax ID must be a 10-character PAN or a 15-character GSTIN.',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'AE': {
      // UAE TRN (Tax Registration Number): 15 digits
      const aeRegex = /^[0-9]{15}$/;
      if (!aeRegex.test(normalizedTin)) {
        return {
          isValid: false,
          message: 'UAE Tax Registration Number (TRN) must be exactly 15 digits.',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'SA': {
      // Saudi Arabia TRN: 15 digits starting with 3
      const saRegex = /^3[0-9]{14}$/;
      if (!saRegex.test(normalizedTin)) {
        return {
          isValid: false,
          message: 'Saudi Arabia Tax Registration Number (TRN) must be 15 digits starting with 3.',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'QA': {
      // Qatar TIN (Tax Identification Number): 10 digits
      const qaRegex = /^[0-9]{10}$/;
      if (!qaRegex.test(normalizedTin)) {
        return {
          isValid: false,
          message: 'Qatar Tax Identification Number (TIN) must be exactly 10 digits.',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'BH': {
      // Bahrain TRN: 15 digits
      const bhRegex = /^[0-9]{15}$/;
      if (!bhRegex.test(normalizedTin)) {
        return {
          isValid: false,
          message: 'Bahrain Tax Registration Number (TRN) must be exactly 15 digits.',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'DE': {
      // Germany VAT (USt-IdNr): 9 digits (optionally prefixed by DE)
      const cleanTin = normalizedTin.startsWith('DE') ? normalizedTin.slice(2) : normalizedTin;
      const deRegex = /^[0-9]{9}$/;
      if (!deRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'German VAT Number must be exactly 9 digits (optionally starting with "DE").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'GB': {
      // United Kingdom VAT: 9 digits (optionally prefixed by GB)
      const cleanTin = normalizedTin.startsWith('GB') ? normalizedTin.slice(2) : normalizedTin;
      const gbRegex = /^[0-9]{9}$/;
      if (!gbRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'UK VAT Number must be exactly 9 digits (optionally starting with "GB").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'FR': {
      // France VAT: 2 alphanumeric characters + 9 digits (optionally prefixed by FR)
      const cleanTin = normalizedTin.startsWith('FR') ? normalizedTin.slice(2) : normalizedTin;
      const frRegex = /^[0-9A-Z]{2}[0-9]{9}$/;
      if (!frRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'French VAT Number must be 2 alphanumeric characters followed by 9 digits (optionally starting with "FR").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'IT': {
      // Italy VAT: 11 digits (optionally prefixed by IT)
      const cleanTin = normalizedTin.startsWith('IT') ? normalizedTin.slice(2) : normalizedTin;
      const itRegex = /^[0-9]{11}$/;
      if (!itRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'Italian VAT Number must be exactly 11 digits (optionally starting with "IT").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'ES': {
      // Spain VAT: 9 alphanumeric characters (optionally prefixed by ES)
      const cleanTin = normalizedTin.startsWith('ES') ? normalizedTin.slice(2) : normalizedTin;
      const esRegex = /^[0-9A-Z]{9}$/;
      if (!esRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'Spanish VAT Number must be exactly 9 alphanumeric characters (optionally starting with "ES").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'AT': {
      // Austria VAT: ATU + 8 digits (optionally prefixed by AT)
      const cleanTin = normalizedTin.startsWith('AT') ? normalizedTin.slice(2) : normalizedTin;
      const cleanTinNoU = cleanTin.startsWith('U') ? cleanTin.slice(1) : cleanTin;
      const atRegex = /^[0-9]{8}$/;
      if (!atRegex.test(cleanTinNoU)) {
        return {
          isValid: false,
          message: 'Austrian VAT Number must be "U" followed by 8 digits (optionally starting with "AT").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'BE': {
      // Belgium VAT: 10 digits (optionally prefixed by BE)
      const cleanTin = normalizedTin.startsWith('BE') ? normalizedTin.slice(2) : normalizedTin;
      const beRegex = /^[0-9]{10}$/;
      if (!beRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'Belgian VAT Number must be exactly 10 digits (optionally starting with "BE").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'NL': {
      // Netherlands VAT: 9 digits + 'B' + 2 digits (optionally prefixed by NL)
      const cleanTin = normalizedTin.startsWith('NL') ? normalizedTin.slice(2) : normalizedTin;
      const nlRegex = /^[0-9]{9}B[0-9]{2}$/;
      if (!nlRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'Dutch VAT Number must be 9 digits, "B", and 2 digits (optionally starting with "NL").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'PL': {
      // Poland VAT: 10 digits (optionally prefixed by PL)
      const cleanTin = normalizedTin.startsWith('PL') ? normalizedTin.slice(2) : normalizedTin;
      const plRegex = /^[0-9]{10}$/;
      if (!plRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'Polish VAT Number must be exactly 10 digits (optionally starting with "PL").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'IE': {
      // Ireland VAT: 8 or 9 characters (optionally prefixed by IE)
      const cleanTin = normalizedTin.startsWith('IE') ? normalizedTin.slice(2) : normalizedTin;
      const ieRegex = /^[0-9A-Z]{8,9}$/;
      if (!ieRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'Irish VAT Number must be 8 or 9 alphanumeric characters (optionally starting with "IE").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'PT': {
      // Portugal VAT: 9 digits (optionally prefixed by PT)
      const cleanTin = normalizedTin.startsWith('PT') ? normalizedTin.slice(2) : normalizedTin;
      const ptRegex = /^[0-9]{9}$/;
      if (!ptRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'Portuguese VAT Number must be exactly 9 digits (optionally starting with "PT").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'SE': {
      // Sweden VAT: 12 digits (optionally prefixed by SE)
      const cleanTin = normalizedTin.startsWith('SE') ? normalizedTin.slice(2) : normalizedTin;
      const seRegex = /^[0-9]{12}$/;
      if (!seRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'Swedish VAT Number must be exactly 12 digits (optionally starting with "SE").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'FI': {
      // Finland VAT: 8 digits (optionally prefixed by FI)
      const cleanTin = normalizedTin.startsWith('FI') ? normalizedTin.slice(2) : normalizedTin;
      const fiRegex = /^[0-9]{8}$/;
      if (!fiRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'Finnish VAT Number must be exactly 8 digits (optionally starting with "FI").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    case 'DK': {
      // Denmark VAT: 8 digits (optionally prefixed by DK)
      const cleanTin = normalizedTin.startsWith('DK') ? normalizedTin.slice(2) : normalizedTin;
      const dkRegex = /^[0-9]{8}$/;
      if (!dkRegex.test(cleanTin)) {
        return {
          isValid: false,
          message: 'Danish VAT Number must be exactly 8 digits (optionally starting with "DK").',
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }

    default: {
      // Generic validation for other countries: between 5 and 25 alphanumeric characters
      const genericRegex = /^[0-9A-Z]{5,25}$/;
      if (!genericRegex.test(normalizedTin)) {
        return {
          isValid: false,
          message: `Tax ID for ${country} must be between 5 and 25 alphanumeric characters.`,
        };
      }
      return { isValid: true, message: 'Tax ID format is valid' };
    }
  }
}
