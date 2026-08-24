import { z } from 'zod';

export const SUBSCRIPTION_PERMISSION = {
  moduleKey: 'subscription',
  view: 'view',
  manage: 'manage',
  billing: 'billing',
} as const;

export const planKeySchema = z.enum([
  'free_forever',
  'launch',
  'growth',
  'scale',
]);

export const subscriptionModuleKeySchema = z.enum(['sales', 'service_cloud']);

export const billingCycleSchema = z.enum(['monthly', 'yearly']);

export const paymentProviderSchema = z.enum(['stripe', 'razorpay', 'manual']);

export const subscriptionStatusSchema = z.enum([
  'free',
  'trial_active',
  'trial_expired',
  'active',
  'past_due',
  'cancelled',
  'suspended',
  'expired',
  'payment_failed',
]);

export const moduleSubscriptionStatusSchema = z.enum([
  'active',
  'cancelled',
  'trial',
  'suspended',
]);

export const subscriptionChangeTypeSchema = z.enum([
  'plan_upgrade',
  'plan_downgrade',
  'module_cancel',
  'module_add',
  'subscription_cancel',
]);

export const subscriptionChangeStatusSchema = z.enum([
  'pending',
  'applied',
  'cancelled',
]);

export const entitlementLimitTypeSchema = z.enum([
  'boolean',
  'numeric',
  'enum',
]);

const uuidSchema = z.string().uuid();
const timestampSchema = z.string().datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();
const currencySchema = z.string().regex(/^[A-Z]{3}$/);
const amountSchema = z.number().finite().nonnegative();

export const apiErrorCodeSchema = z.enum([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'TRIAL_ALREADY_USED',
  'ENTITLEMENT_CONTEXT_MISSING',
  'ENTITLEMENT_CONFIGURATION_ERROR',
  'FEATURE_NOT_INCLUDED',
  'FEATURE_LIMIT_EXCEEDED',
  'PAYMENT_REQUIRED',
  'PROVIDER_ERROR',
  'INTERNAL_ERROR',
]);

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  statusCode: z.number().int().min(400).max(599),
  message: z.string().min(1),
  code: apiErrorCodeSchema,
  data: z.record(z.string(), z.unknown()).nullable().default(null),
});

export const createApiSuccessResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
) =>
  z.object({
    success: z.literal(true),
    statusCode: z.number().int().min(200).max(299),
    message: z.string().nullable().default(null),
    data: dataSchema,
  });

const planSummarySchema = z.object({
  planKey: planKeySchema,
  planName: z.string().min(1),
  description: z.string().nullable(),
  displayOrder: z.number().int().nonnegative(),
  isPaid: z.boolean(),
  isTrialEligible: z.boolean(),
});

const modulePriceSchema = z.object({
  moduleKey: subscriptionModuleKeySchema,
  planKey: planKeySchema,
  monthlyPrice: amountSchema.nullable(),
  yearlyPrice: amountSchema.nullable(),
  currency: currencySchema,
  billingUnit: z.enum(['per_user_per_month', 'per_user_per_year', 'free']),
});

const pricingModuleSchema = z.object({
  moduleKey: subscriptionModuleKeySchema,
  moduleName: z.string().min(1),
  description: z.string().nullable(),
  featureHighlights: z.array(z.string()),
  prices: z.array(modulePriceSchema),
});

const bundlePriceSchema = z.object({
  bundleKey: z.string().min(1),
  bundleName: z.string().min(1),
  planKey: planKeySchema,
  moduleKeys: z.array(subscriptionModuleKeySchema).min(2),
  monthlyPrice: amountSchema,
  yearlyPrice: amountSchema,
  currency: currencySchema,
});

export const pricingResponseDataSchema = z.object({
  modules: z.array(pricingModuleSchema),
  plans: z.array(planSummarySchema),
  bundles: z.array(bundlePriceSchema),
  yearlyDiscountPercent: z.number().min(0).max(100),
});

export const workspacePlansQuerySchema = z.object({
  workspaceId: uuidSchema,
});

const workspaceModulePlanSchema = z.object({
  moduleKey: subscriptionModuleKeySchema,
  moduleName: z.string().min(1),
  planKey: planKeySchema,
  planName: z.string().min(1),
  status: moduleSubscriptionStatusSchema,
  billingCycle: billingCycleSchema,
  monthlyAmount: amountSchema.nullable(),
  yearlyAmount: amountSchema.nullable(),
  bundleKey: z.string().nullable(),
  userCount: z.number().int().nonnegative(),
  currentPeriodStart: nullableTimestampSchema,
  currentPeriodEnd: nullableTimestampSchema,
});

const pendingSubscriptionChangeSchema = z.object({
  id: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
  changeType: subscriptionChangeTypeSchema,
  fromPlanKey: planKeySchema.nullable(),
  toPlanKey: planKeySchema.nullable(),
  effectiveAt: timestampSchema,
  status: subscriptionChangeStatusSchema,
});

export const workspacePlansResponseDataSchema = z.object({
  workspaceId: uuidSchema,
  subscriptionStatus: subscriptionStatusSchema,
  billingCycle: billingCycleSchema,
  trialStartDate: nullableTimestampSchema,
  trialEndDate: nullableTimestampSchema,
  trialDaysRemaining: z.number().int().nonnegative().nullable(),
  modules: z.array(workspaceModulePlanSchema),
  pendingChanges: z.array(pendingSubscriptionChangeSchema),
});

export const startTrialRequestSchema = z.object({
  workspaceId: uuidSchema,
  selectedModules: z
    .array(subscriptionModuleKeySchema)
    .min(1)
    .refine((modules) => new Set(modules).size === modules.length, {
      message: 'selectedModules must not contain duplicates',
    }),
});

export const startTrialResponseDataSchema = z.object({
  workspaceId: uuidSchema,
  status: z.literal('trial_active'),
  planKey: z.literal('growth'),
  selectedModules: z.array(subscriptionModuleKeySchema),
  trialStartDate: timestampSchema,
  trialEndDate: timestampSchema,
});

export const usageQuerySchema = z.object({
  workspaceId: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
});

const featureUsageSchema = z.object({
  featureKey: z.string().min(1),
  featureName: z.string().min(1),
  limitType: entitlementLimitTypeSchema,
  currentUsage: z.number().int().nonnegative(),
  limitValue: z.number().int().nonnegative().nullable(),
  percentageUsed: z.number().nonnegative().nullable(),
  isNearLimit: z.boolean(),
  isAtLimit: z.boolean(),
});

export const usageResponseDataSchema = z.object({
  workspaceId: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
  planKey: planKeySchema,
  features: z.array(featureUsageSchema),
});

export const upgradeSubscriptionRequestSchema = z.object({
  workspaceId: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
  newPlanKey: planKeySchema,
  billingCycle: billingCycleSchema,
});

export const downgradeSubscriptionRequestSchema = z.object({
  workspaceId: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
  newPlanKey: planKeySchema,
});

export const addModuleRequestSchema = z.object({
  workspaceId: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
  planKey: planKeySchema,
  billingCycle: billingCycleSchema,
});

export const removeModuleRequestSchema = z.object({
  workspaceId: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
});

export const pricingCheckoutRequestSchema = addModuleRequestSchema.extend({
  returnUrl: z.string().startsWith('/').optional(),
});

export const providerSyncRequestSchema = z.object({
  workspaceId: uuidSchema,
  provider: z.literal('stripe').default('stripe'),
});

export const checkoutResponseDataSchema = z.object({
  url: z.string().url(),
  sessionId: z.string().min(1),
});

export const moduleChangeResponseDataSchema = z.object({
  workspaceId: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
  planKey: planKeySchema,
  effectiveAt: timestampSchema,
  changeStatus: z.enum(['applied', 'pending']),
});

export const providerSyncResponseDataSchema = z.object({
  workspaceId: uuidSchema,
  provider: z.literal('stripe'),
  providerSubscriptionId: z.string().min(1),
  providerStatus: z.string().min(1),
  synchronizedAt: timestampSchema,
});

export const planChangeResponseDataSchema = z.object({
  workspaceId: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
  fromPlanKey: planKeySchema,
  toPlanKey: planKeySchema,
  effectiveAt: timestampSchema,
  changeStatus: z.enum(['applied', 'pending']),
});

export const moduleUsersQuerySchema = z.object({
  workspaceId: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
});

export const assignModuleUserRequestSchema = moduleUsersQuerySchema.extend({
  userId: uuidSchema,
});

export const removeModuleUserQuerySchema = assignModuleUserRequestSchema;

const moduleUserSchema = z.object({
  userId: uuidSchema,
  name: z.string().nullable(),
  email: z.string().email(),
  pictureUrl: z.string().url().nullable(),
  status: z.enum(['active', 'removed']),
  assignedAt: timestampSchema,
  removedAt: nullableTimestampSchema,
});

export const moduleUsersResponseDataSchema = z.object({
  workspaceId: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
  users: z.array(moduleUserSchema),
});

export const moduleUserMutationResponseDataSchema = z.object({
  workspaceId: uuidSchema,
  moduleKey: subscriptionModuleKeySchema,
  userId: uuidSchema,
  status: z.enum(['active', 'removed']),
});

export type PlanKey = z.infer<typeof planKeySchema>;
export type SubscriptionModuleKey = z.infer<typeof subscriptionModuleKeySchema>;
export type BillingCycle = z.infer<typeof billingCycleSchema>;
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type PricingResponseData = z.infer<typeof pricingResponseDataSchema>;
export type WorkspacePlansQuery = z.infer<typeof workspacePlansQuerySchema>;
export type WorkspacePlansResponseData = z.infer<
  typeof workspacePlansResponseDataSchema
>;
export type StartTrialRequest = z.infer<typeof startTrialRequestSchema>;
export type StartTrialResponseData = z.infer<
  typeof startTrialResponseDataSchema
>;
export type UsageQuery = z.infer<typeof usageQuerySchema>;
export type UsageResponseData = z.infer<typeof usageResponseDataSchema>;
export type UpgradeSubscriptionRequest = z.infer<
  typeof upgradeSubscriptionRequestSchema
>;
export type DowngradeSubscriptionRequest = z.infer<
  typeof downgradeSubscriptionRequestSchema
>;
export type AddModuleRequest = z.infer<typeof addModuleRequestSchema>;
export type RemoveModuleRequest = z.infer<typeof removeModuleRequestSchema>;
export type PricingCheckoutRequest = z.infer<
  typeof pricingCheckoutRequestSchema
>;
export type ProviderSyncRequest = z.infer<typeof providerSyncRequestSchema>;
export type PlanChangeResponseData = z.infer<
  typeof planChangeResponseDataSchema
>;
export type ModuleUsersQuery = z.infer<typeof moduleUsersQuerySchema>;
export type AssignModuleUserRequest = z.infer<
  typeof assignModuleUserRequestSchema
>;
export type RemoveModuleUserQuery = z.infer<typeof removeModuleUserQuerySchema>;
export type ModuleUsersResponseData = z.infer<
  typeof moduleUsersResponseDataSchema
>;
export type ModuleUserMutationResponseData = z.infer<
  typeof moduleUserMutationResponseDataSchema
>;

export interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string | null;
  data: T;
}
