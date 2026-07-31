export interface ZapierIntegration {
  id: string;
  workspace_id: string;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface ZapierApiKey {
  id: string;
  workspace_id: string;
  api_key: string;
  masked_key: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ZapierLog {
  id: string;
  workspace_id: string;
  request_type: string;
  status: 'Success' | 'Failed' | 'Unauthorized' | 'Rate Limited';
  message: string;
  created_at: string;
}
