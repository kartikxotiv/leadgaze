/**
 * Client-side connector service functions for the Sales module.
 *
 * Types are sourced from @kit/integration-website to ensure a single
 * canonical definition across the entire monorepo.
 */
import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

// Re-export canonical types from the integration package
export type {
  Connector,
  ConnectorForm,
  FormField,
  ConnectorLog,
  NormalizedPayload,
  WebsiteSubmitInput,
  IngestionResult,
} from '@kit/integration-website';

export const getConnectorsService = asyncHandlerClient(
  async (workspaceId: string): Promise<import('@kit/integration-website').Connector[]> => {
    const response = await ApiClient.get(`/connectors?workspaceId=${workspaceId}`);
    return response.data?.data || [];
  }
);

export const createConnectorService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    name: string;
    destination_module: string;
    destination_entity: string;
    default_owner_id?: string | null;
    type?: string;
  }): Promise<import('@kit/integration-website').Connector> => {
    const response = await ApiClient.post('/connectors', payload);
    return response.data?.data;
  }
);

export const updateConnectorService = asyncHandlerClient(
  async (
    connectorId: string,
    payload: {
      status?: string;
      name?: string;
      default_owner_id?: string | null;
    }
  ): Promise<import('@kit/integration-website').Connector> => {
    const response = await ApiClient.patch(`/connectors/${connectorId}`, payload);
    return response.data?.data;
  }
);

export const deleteConnectorService = asyncHandlerClient(
  async (connectorId: string): Promise<void> => {
    await ApiClient.delete(`/connectors/${connectorId}`);
  }
);

export const updateConnectorFormService = asyncHandlerClient(
  async (
    connectorId: string,
    payload: {
      success_message: string;
      redirect_url: string;
      spam_protection_enabled: boolean;
      button_color?: string;
      heading?: string;
      subheading?: string;
      fields: Omit<import('@kit/integration-website').FormField, 'id'>[];
    }
  ): Promise<void> => {
    await ApiClient.patch(`/connectors/${connectorId}/forms`, payload);
  }
);

export const getConnectorLogsService = asyncHandlerClient(
  async (connectorId: string): Promise<import('@kit/integration-website').ConnectorLog[]> => {
    const response = await ApiClient.get(`/connectors/${connectorId}/logs`);
    return response.data?.data || [];
  }
);

export const runConnectorSandboxService = asyncHandlerClient(
  async (
    connectorId: string,
    payload: {
      workspace_id: string;
      payload: import('@kit/integration-website').WebsiteSubmitInput;
    }
  ): Promise<void> => {
    await ApiClient.post(`/connectors/${connectorId}/sandbox`, payload);
  }
);

export const rotateConnectorApiKeyService = asyncHandlerClient(
  async (connectorId: string): Promise<{ publicKey: string; secretKey: string; record: any }> => {
    const response = await ApiClient.post(`/connectors/${connectorId}/rotate-key`);
    return response.data?.data;
  }
);
