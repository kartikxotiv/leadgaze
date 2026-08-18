import type { Json } from '@kit/supabase/database';

export type EntitlementModuleKey = 'sales' | 'service_cloud';
export type EntitlementPlanKey = 'free_forever' | 'launch' | 'growth' | 'scale';

export type EntitlementFeature = {
  isEnabled: boolean;
  limitValue: number | null;
  limitType: 'boolean' | 'numeric' | 'enum';
  enumValue: string | null;
  currentUsage: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
  resolvedFromPlanKey: string | null;
};

export type EntitlementContext = {
  workspaceId: string;
  moduleKey: EntitlementModuleKey;
  plan: {
    planKey: EntitlementPlanKey;
    planName: string;
    subscriptionStatus: string;
    moduleStatus: string;
  };
  features: Record<string, EntitlementFeature>;
};

export type FeatureDefinition = {
  id: string;
  moduleId: string;
  featureKey: string;
  featureName: string;
  dataType: string;
};

export type EntitlementConsumption = {
  allowed: boolean;
  reason: string | null;
  currentUsage: number;
  limit: number | null;
  remaining: number | null;
};

export type UpgradeRecommendation = {
  planKey: EntitlementPlanKey;
  planName: string;
  limitValue: number | null;
} | null;

export type UsageEventType =
  | 'created'
  | 'deleted'
  | 'imported'
  | 'bulk_deleted';

export type UsageEventInput = {
  workspaceId: string;
  feature: FeatureDefinition;
  eventType: UsageEventType;
  quantity: number;
  resourceId?: string | null;
  resourceType?: string | null;
  metadata?: Json;
};
