import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface WorkspaceCurrency {
  id: string;
  workspace_id: string;
  currency_code: string;
  currency_symbol: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  base_currency: string;
  target_currency: string;
  exchange_rate: number;
  provider: string;
  fetched_at: string;
  expires_at: string | null;
}

export interface AddCurrencyPayload {
  workspace_id: string;
  currency_code: string;
  currency_symbol: string;
  is_default?: boolean;
}

// =====================================================
// Currencies CRUD
// =====================================================

const getWorkspaceCurrenciesService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(
      `/workspaces/currencies?workspaceId=${workspaceId}`,
    );
    return (response.data?.data || []) as WorkspaceCurrency[];
  },
);

const addWorkspaceCurrencyService = asyncHandlerClient(
  async (payload: AddCurrencyPayload) => {
    const response = await ApiClient.post('/workspaces/currencies', payload);
    return (response.data?.data || null) as WorkspaceCurrency | null;
  },
);

const updateWorkspaceCurrencyService = asyncHandlerClient(
  async (
    currencyId: string,
    payload: { is_default?: boolean; is_active?: boolean; currency_symbol?: string },
  ) => {
    const response = await ApiClient.patch(
      `/workspaces/currencies/${currencyId}`,
      payload,
    );
    return (response.data?.data || null) as WorkspaceCurrency | null;
  },
);

const deleteWorkspaceCurrencyService = asyncHandlerClient(
  async (currencyId: string) => {
    const response = await ApiClient.delete(
      `/workspaces/currencies/${currencyId}`,
    );
    return response.data?.data || null;
  },
);

// =====================================================
// Exchange Rates
// =====================================================

const getExchangeRateService = asyncHandlerClient(
  async (base: string, target: string) => {
    const response = await ApiClient.get(
      `/workspaces/currencies/rates?base=${base}&target=${target}`,
    );
    return (response.data?.data || null) as ExchangeRate | null;
  },
);

const getAllExchangeRatesService = asyncHandlerClient(
  async (base: string) => {
    const response = await ApiClient.get(
      `/workspaces/currencies/rates?base=${base}`,
    );
    return (response.data?.data || []) as ExchangeRate[];
  },
);

export {
  getWorkspaceCurrenciesService,
  addWorkspaceCurrencyService,
  updateWorkspaceCurrencyService,
  deleteWorkspaceCurrencyService,
  getExchangeRateService,
  getAllExchangeRatesService,
};
