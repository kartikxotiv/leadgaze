import type { Json } from '@kit/supabase/database';

import type { EntitlementRepository } from './repository';
import type {
  EntitlementContext,
  EntitlementFeature,
  EntitlementModuleKey,
  EntitlementPlanKey,
  FeatureDefinition,
  UpgradeRecommendation,
  UsageEventType,
} from './types';

const PLAN_KEYS: EntitlementPlanKey[] = [
  'free_forever',
  'launch',
  'growth',
  'scale',
];

type EntitlementErrorCode =
  | 'ENTITLEMENT_CONTEXT_MISSING'
  | 'FEATURE_NOT_INCLUDED'
  | 'FEATURE_LIMIT_EXCEEDED'
  | 'ENTITLEMENT_CONFIGURATION_ERROR'
  | 'PAYMENT_REQUIRED';

export class EntitlementError extends Error {
  readonly statusCode: number;

  constructor(
    message: string,
    readonly code: EntitlementErrorCode,
    readonly data: Record<string, unknown>,
    statusCode = 402,
  ) {
    super(message);
    this.name = 'EntitlementError';
    this.statusCode = statusCode;
  }
}

type ReserveUsageInput = {
  workspaceId: string;
  moduleKey: EntitlementModuleKey;
  featureKey: string;
  quantity?: number;
  resourceType: string;
  eventType?: Extract<UsageEventType, 'created' | 'imported'>;
  metadata?: Json;
};

type CommitUsageInput = {
  resourceId?: string | null;
  metadata?: Json;
};

export type EntitlementReservation = {
  commit(input?: CommitUsageInput): Promise<void>;
  rollback(): Promise<void>;
};

export type EntitlementRepositoryContract = Pick<
  EntitlementRepository,
  | 'loadContext'
  | 'findFeature'
  | 'tryConsume'
  | 'release'
  | 'recordUsageEvent'
  | 'listActivePlans'
  | 'getEffectivePlanEntitlement'
>;

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

function numberOrZero(value: Json | undefined) {
  return typeof value === 'number' ? value : 0;
}

function nullableNumber(value: Json | undefined) {
  return typeof value === 'number' ? value : null;
}

function parseFeature(value: Json | undefined): EntitlementFeature {
  const feature = asRecord(value);
  const rawLimitType = feature.limit_type;
  const limitType =
    rawLimitType === 'numeric' ||
    rawLimitType === 'boolean' ||
    rawLimitType === 'enum'
      ? rawLimitType
      : 'boolean';

  return {
    isEnabled: feature.is_enabled === true,
    limitValue: nullableNumber(feature.limit_value),
    limitType,
    enumValue:
      typeof feature.enum_value === 'string' ? feature.enum_value : null,
    currentUsage: numberOrZero(feature.current_usage),
    isNearLimit: feature.is_near_limit === true,
    isAtLimit: feature.is_at_limit === true,
    resolvedFromPlanKey:
      typeof feature.resolved_from_plan_key === 'string'
        ? feature.resolved_from_plan_key
        : null,
  };
}

function parseContext(
  raw: Json,
  workspaceId: string,
  moduleKey: EntitlementModuleKey,
): EntitlementContext | null {
  const context = asRecord(raw);
  const plan = asRecord(context.plan);
  const rawFeatures = asRecord(context.features);
  const planKey = plan.plan_key;

  if (!PLAN_KEYS.includes(planKey as EntitlementPlanKey)) return null;

  return {
    workspaceId,
    moduleKey,
    plan: {
      planKey: planKey as EntitlementPlanKey,
      planName:
        typeof plan.plan_name === 'string' ? plan.plan_name : String(planKey),
      subscriptionStatus:
        typeof plan.subscription_status === 'string'
          ? plan.subscription_status
          : 'unknown',
      moduleStatus:
        typeof plan.module_status === 'string' ? plan.module_status : 'unknown',
    },
    features: Object.fromEntries(
      Object.entries(rawFeatures).map(([key, value]) => [
        key,
        parseFeature(value),
      ]),
    ),
  };
}

export class EntitlementService {
  private readonly contextCache = new Map<
    string,
    Promise<EntitlementContext>
  >();
  private readonly featureCache = new Map<string, Promise<FeatureDefinition>>();

  constructor(private readonly repository: EntitlementRepositoryContract) {}

  /** A service instance is request-scoped; each module context is loaded once. */
  getContext(workspaceId: string, moduleKey: EntitlementModuleKey) {
    const cacheKey = `${workspaceId}:${moduleKey}`;
    const cached = this.contextCache.get(cacheKey);
    if (cached) return cached;

    const contextPromise = this.repository
      .loadContext(workspaceId, moduleKey)
      .then((raw) => {
        const context = parseContext(raw, workspaceId, moduleKey);
        if (!context) {
          throw new EntitlementError(
            `No explicit ${moduleKey} plan is configured for this workspace`,
            'ENTITLEMENT_CONTEXT_MISSING',
            { workspaceId, moduleKey },
            409,
          );
        }
        return context;
      });

    this.contextCache.set(cacheKey, contextPromise);
    return contextPromise;
  }

  async requireBooleanFeature(
    workspaceId: string,
    moduleKey: EntitlementModuleKey,
    featureKey: string,
  ) {
    const context = await this.getContext(workspaceId, moduleKey);
    this.requireWritableSubscription(context);
    const feature = context.features[featureKey];

    if (!feature || feature.limitType !== 'boolean' || !feature.isEnabled) {
      const recommendation = await this.recommendUpgrade({
        context,
        moduleKey,
        featureKey,
        requiredUsage: null,
      });
      throw new EntitlementError(
        `${featureKey} is not included in the current plan`,
        'FEATURE_NOT_INCLUDED',
        {
          workspaceId,
          moduleKey,
          featureKey,
          currentPlan: context.plan.planKey,
          recommendedUpgrade: recommendation,
        },
      );
    }

    return feature;
  }

  async reserveUsage(
    input: ReserveUsageInput,
  ): Promise<EntitlementReservation> {
    const quantity = input.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new TypeError('Entitlement quantity must be a positive integer');
    }

    const context = await this.getContext(input.workspaceId, input.moduleKey);
    this.requireWritableSubscription(context);
    const snapshot = context.features[input.featureKey];
    if (!snapshot || snapshot.limitType !== 'numeric' || !snapshot.isEnabled) {
      throw new EntitlementError(
        `${input.featureKey} is not configured as an enabled numeric feature`,
        'ENTITLEMENT_CONFIGURATION_ERROR',
        {
          workspaceId: input.workspaceId,
          moduleKey: input.moduleKey,
          featureKey: input.featureKey,
        },
        409,
      );
    }

    const feature = await this.getFeature(input.moduleKey, input.featureKey);
    const consumption = await this.repository.tryConsume(
      input.workspaceId,
      feature.id,
      quantity,
    );

    if (!consumption.allowed) {
      const recommendation = await this.recommendUpgrade({
        context,
        moduleKey: input.moduleKey,
        featureKey: input.featureKey,
        requiredUsage: consumption.currentUsage + quantity,
      });
      throw new EntitlementError(
        `${feature.featureName} limit reached`,
        'FEATURE_LIMIT_EXCEEDED',
        {
          workspaceId: input.workspaceId,
          moduleKey: input.moduleKey,
          featureKey: input.featureKey,
          currentPlan: context.plan.planKey,
          currentUsage: consumption.currentUsage,
          requestedQuantity: quantity,
          limit: consumption.limit,
          recommendedUpgrade: recommendation,
        },
      );
    }

    let state: 'reserved' | 'committed' | 'rolled_back' = 'reserved';
    return {
      commit: async (commitInput = {}) => {
        if (state !== 'reserved') return;
        // The business record already exists when commit is called. Mark the
        // reservation committed before writing the audit event so an event
        // failure can never compensate a successful business write.
        state = 'committed';
        await this.repository.recordUsageEvent({
          workspaceId: input.workspaceId,
          feature,
          eventType: input.eventType ?? 'created',
          quantity,
          resourceId: commitInput.resourceId,
          resourceType: input.resourceType,
          metadata: commitInput.metadata ?? input.metadata,
        });
      },
      rollback: async () => {
        if (state !== 'reserved') return;
        await this.repository.release(input.workspaceId, feature.id, quantity);
        state = 'rolled_back';
      },
    };
  }

  async withUsageReservation<T>(
    input: ReserveUsageInput,
    write: () => Promise<T>,
    commitInput?: (result: T) => CommitUsageInput,
  ) {
    const reservation = await this.reserveUsage(input);
    let result: T;

    try {
      result = await write();
    } catch (error) {
      await reservation.rollback();
      throw error;
    }

    await reservation.commit(commitInput?.(result));
    return result;
  }

  async releaseUsage(input: {
    workspaceId: string;
    moduleKey: EntitlementModuleKey;
    featureKey: string;
    quantity?: number;
    resourceId?: string | null;
    resourceType: string;
    eventType?: Extract<UsageEventType, 'deleted' | 'bulk_deleted'>;
    metadata?: Json;
  }) {
    const quantity = input.quantity ?? 1;
    const feature = await this.getFeature(input.moduleKey, input.featureKey);
    await this.repository.release(input.workspaceId, feature.id, quantity);
    await this.repository.recordUsageEvent({
      workspaceId: input.workspaceId,
      feature,
      eventType: input.eventType ?? 'deleted',
      quantity: -quantity,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      metadata: input.metadata,
    });
  }

  private getFeature(moduleKey: EntitlementModuleKey, featureKey: string) {
    const cacheKey = `${moduleKey}:${featureKey}`;
    const cached = this.featureCache.get(cacheKey);
    if (cached) return cached;

    const featurePromise = this.repository
      .findFeature(moduleKey, featureKey)
      .then((feature) => {
        if (!feature) {
          throw new EntitlementError(
            `Unknown entitlement feature: ${featureKey}`,
            'ENTITLEMENT_CONFIGURATION_ERROR',
            { moduleKey, featureKey },
            500,
          );
        }
        return feature;
      });
    this.featureCache.set(cacheKey, featurePromise);
    return featurePromise;
  }

  private requireWritableSubscription(context: EntitlementContext) {
    const writableModuleStatuses = new Set(['active', 'trial']);
    const writableSubscriptionStatuses = new Set([
      'free',
      'trial_active',
      'active',
      'past_due',
    ]);

    if (
      !writableModuleStatuses.has(context.plan.moduleStatus) ||
      !writableSubscriptionStatuses.has(context.plan.subscriptionStatus)
    ) {
      throw new EntitlementError(
        'The module subscription is not active for new writes',
        'PAYMENT_REQUIRED',
        {
          workspaceId: context.workspaceId,
          moduleKey: context.moduleKey,
          currentPlan: context.plan.planKey,
          moduleStatus: context.plan.moduleStatus,
          subscriptionStatus: context.plan.subscriptionStatus,
        },
      );
    }
  }

  private async recommendUpgrade(input: {
    context: EntitlementContext;
    moduleKey: EntitlementModuleKey;
    featureKey: string;
    requiredUsage: number | null;
  }): Promise<UpgradeRecommendation> {
    const feature = await this.getFeature(input.moduleKey, input.featureKey);
    const plans = await this.repository.listActivePlans();
    const currentIndex = PLAN_KEYS.indexOf(input.context.plan.planKey);

    for (const plan of plans) {
      const candidateKey = plan.plan_key as EntitlementPlanKey;
      if (!PLAN_KEYS.includes(candidateKey)) continue;
      if (PLAN_KEYS.indexOf(candidateKey) <= currentIndex) continue;

      const entitlement = await this.repository.getEffectivePlanEntitlement(
        plan.id,
        feature.id,
      );
      if (!entitlement?.is_enabled) continue;
      if (
        input.requiredUsage !== null &&
        entitlement.limit_value !== null &&
        entitlement.limit_value < input.requiredUsage
      ) {
        continue;
      }

      return {
        planKey: candidateKey,
        planName: plan.plan_name,
        limitValue: entitlement.limit_value,
      };
    }

    return null;
  }
}
