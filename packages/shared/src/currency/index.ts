/**
 * @kit/shared/currency
 *
 * Currency utilities for the Leadgaze platform.
 * Provides conversion, formatting, and service functions
 * for workspace-aware multi-currency support.
 */

// Conversion utilities
export {
  convertToUSD,
  convertFromUSD,
  convertCrossCurrency,
  isValidExchangeRate,
} from './currency.converter';

// Formatting utilities (server-safe, no React dependency)
export {
  formatWorkspaceCurrency,
  formatReportCurrency,
} from './currency.formatter';

// Service utilities
export {
  isCurrencyEnabledForWorkspace,
  getDefaultWorkspaceCurrency,
  findLatestRateToUsd,
  findHistoricalRate,
  computeBaseAmountUsd,
  buildOpportunityCurrencyFields,
} from './currency.service';

export type {
  ExchangeRateRecord,
  WorkspaceCurrencyInfo,
} from './currency.service';
