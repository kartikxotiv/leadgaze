/**
 * @kit/integration-website
 *
 * Website Connector integration package for Leadgaze.
 * Provides domain types, server-side ingestion logic, and UI pages for
 * processing website form submissions into CRM leads or service-cloud tickets.
 */

// Domain types
export type {
  Connector,
  ConnectorStatus,
  ConnectorDestinationModule,
  ConnectorAssignmentMode,
  ConnectorForm,
  FormField,
  ConnectorEvent,
  ConnectorLog,
  NormalizedPayload,
  WebsiteSubmitInput,
  IngestLeadInput,
  IngestTicketInput,
  IngestionResult,
} from './types';

// Provider functions (server-side only)
export {
  normalizePayload,
  createConnectorEvent,
  updateEventStatus,
  createConnectorLog,
  checkLeadDuplicate,
  resolveDefaultLeadStatusId,
  resolveCreatorId,
  resolveOrCreateLeadSource,
  resolveWorthliftScore,
  ingestLeadToCrm,
  ingestTicket,
  processWebsiteSubmission,
  name,
} from './website-connector-provider';

// UI pages
export type { WebsiteConnectorListPageProps } from './pages/website-connector-list-page';
export { WebsiteConnectorListPage } from './pages/website-connector-list-page';
export type { WebsiteConnectorDetailPageProps } from './pages/website-connector-detail-page';
export { WebsiteConnectorDetailPage } from './pages/website-connector-detail-page';

// API Controllers
export {
  handleFormOptions,
  handleSubmitOptions,
  handleGetForm,
  handleFormSubmit,
} from './api-controllers';
