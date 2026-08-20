'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Progress } from '@kit/ui/progress';

import { UsageLimitBanner } from '~/components/entitlements/usage-limit-banner';
import { useEntitlements } from '~/lib/entitlements/entitlement-provider';
import type { EntitlementModuleKey } from '~/lib/entitlements/types';
import type { EntitlementPlanKey } from '~/lib/entitlements/types';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  addModuleService,
  assignModuleUserService,
  createPricingCheckoutService,
  downgradePlanService,
  getModuleUsersService,
  getSubscriptionNotificationsService,
  getWorkspacePlansService,
  removeModuleService,
  removeModuleUserService,
  startTrialService,
  upgradePlanService,
} from '~/services/pricing-subscription.service';

const PLAN_ORDER: EntitlementPlanKey[] = [
  'free_forever',
  'launch',
  'growth',
  'scale',
];

type ModulePlan = {
  moduleKey: EntitlementModuleKey;
  moduleName: string;
  planKey: EntitlementPlanKey;
  planName: string;
  status: string;
  monthlyAmount: number | null;
  yearlyAmount: number | null;
  userCount: number;
};

type WorkspacePlans = {
  subscriptionStatus: string;
  billingCycle: 'monthly' | 'yearly';
  trialDaysRemaining: number | null;
  modules: ModulePlan[];
  pendingChanges: Array<{
    id: string;
    moduleKey: EntitlementModuleKey;
    changeType: string;
    toPlanKey: EntitlementPlanKey | null;
    effectiveAt: string;
  }>;
};

const titleCase = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function SubscriptionManagementPage() {
  const { currentWorkspace, canAccess } = useRBAC();
  const { refresh } = useEntitlements();
  const workspaceId = currentWorkspace?.id ?? '';
  const canView = canAccess('subscription', 'view');
  const canManage = canAccess('subscription', 'manage');
  const canBill = canAccess('subscription', 'billing');
  const queryClient = useQueryClient();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly',
  );

  const plansQuery = useQuery({
    queryKey: ['pricing-workspace-plans', workspaceId],
    queryFn: () =>
      getWorkspacePlansService(workspaceId) as Promise<WorkspacePlans>,
    enabled: Boolean(workspaceId && canView),
  });
  const notificationsQuery = useQuery({
    queryKey: ['subscription-notifications', workspaceId],
    queryFn: () => getSubscriptionNotificationsService(workspaceId),
    enabled: Boolean(workspaceId && canView),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['pricing-workspace-plans', workspaceId],
      }),
      queryClient.invalidateQueries({
        queryKey: ['entitlement-contexts', workspaceId],
      }),
    ]);
    await refresh();
  };

  const trial = useMutation({
    mutationFn: () =>
      startTrialService({
        workspaceId,
        selectedModules: ['sales', 'service_cloud'],
      }),
    onSuccess: async () => {
      toast.success('Growth trial started');
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const planChange = useMutation({
    mutationFn: async (input: {
      module: ModulePlan;
      targetPlan: EntitlementPlanKey;
    }) => {
      const currentIndex = PLAN_ORDER.indexOf(input.module.planKey);
      const targetIndex = PLAN_ORDER.indexOf(input.targetPlan);
      if (targetIndex > currentIndex) {
        if (
          input.targetPlan !== 'free_forever' &&
          ['free', 'trial_active', 'trial_expired'].includes(
            plansQuery.data?.subscriptionStatus ?? '',
          )
        ) {
          const checkout = await createPricingCheckoutService({
            workspaceId,
            moduleKey: input.module.moduleKey,
            planKey: input.targetPlan,
            billingCycle,
            returnUrl: '/org/subscription',
          });
          window.location.assign(checkout.url);
          return checkout;
        }
        return upgradePlanService({
          workspaceId,
          moduleKey: input.module.moduleKey,
          newPlanKey: input.targetPlan,
          billingCycle,
        });
      }
      return downgradePlanService({
        workspaceId,
        moduleKey: input.module.moduleKey,
        newPlanKey: input.targetPlan,
      });
    },
    onSuccess: async () => {
      toast.success('Subscription change saved');
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addModule = useMutation({
    mutationFn: async (input: {
      moduleKey: EntitlementModuleKey;
      planKey: EntitlementPlanKey;
    }) => {
      if (
        input.planKey !== 'free_forever' &&
        plansQuery.data?.subscriptionStatus === 'free'
      ) {
        const checkout = await createPricingCheckoutService({
          workspaceId,
          moduleKey: input.moduleKey,
          planKey: input.planKey,
          billingCycle,
          returnUrl: '/org/subscription',
        });
        window.location.assign(checkout.url);
        return checkout;
      }
      return addModuleService({
        workspaceId,
        moduleKey: input.moduleKey,
        planKey: input.planKey,
        billingCycle,
      });
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const removeModule = useMutation({
    mutationFn: (moduleKey: EntitlementModuleKey) =>
      removeModuleService({ workspaceId, moduleKey }),
    onSuccess: async () => {
      toast.success('Module removal scheduled');
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKeys = useMemo(
    () => new Set(plansQuery.data?.modules.map((item) => item.moduleKey) ?? []),
    [plansQuery.data?.modules],
  );

  if (!canView) {
    return (
      <div className="p-8">
        You do not have permission to view subscription details.
      </div>
    );
  }
  if (plansQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  const data = plansQuery.data;
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Subscription and usage</h1>
          <p className="text-muted-foreground mt-1">
            Manage plans, module access, users, and scheduled changes.
          </p>
        </div>
        <div className="flex rounded-lg border p-1">
          {(['monthly', 'yearly'] as const).map((cycle) => (
            <Button
              key={cycle}
              size="sm"
              variant={billingCycle === cycle ? 'default' : 'ghost'}
              onClick={() => setBillingCycle(cycle)}
            >
              {cycle === 'monthly' ? 'Monthly' : 'Annual · save 20%'}
            </Button>
          ))}
        </div>
      </div>

      {data?.subscriptionStatus === 'trial_active' && (
        <Card className="border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40">
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            <Clock3 className="h-6 w-6 text-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Growth trial active</p>
              <p className="text-muted-foreground text-sm">
                {data.trialDaysRemaining ?? 0} days remaining. Modules move to
                Free Forever if no paid plan is selected.
              </p>
            </div>
            {canBill && (
              <Button
                onClick={() =>
                  document
                    .getElementById('active-modules')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Choose a plan
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {data?.subscriptionStatus === 'free' && canBill && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Free Forever</p>
              <p className="text-muted-foreground text-sm">
                Try Growth for 14 days across Sales and Service.
              </p>
            </div>
            <Button disabled={trial.isPending} onClick={() => trial.mutate()}>
              Start 14-day trial
            </Button>
          </CardContent>
        </Card>
      )}

      <section id="active-modules" className="scroll-mt-6 space-y-3">
        <h2 className="text-xl font-semibold">Active modules</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {data?.modules.map((module) => (
            <Card key={module.moduleKey}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{module.moduleName}</CardTitle>
                    <CardDescription>
                      {billingCycle === 'yearly'
                        ? (module.yearlyAmount ?? 'Contact sales')
                        : (module.monthlyAmount ?? 'Contact sales')}{' '}
                      {module.monthlyAmount !== null ? 'USD' : ''}
                    </CardDescription>
                  </div>
                  <Badge>{module.planName}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <UsageSummary moduleKey={module.moduleKey} />
                <div className="flex flex-wrap gap-2">
                  {PLAN_ORDER.filter((plan) => plan !== module.planKey).map(
                    (plan) => (
                      <Button
                        key={plan}
                        size="sm"
                        variant="outline"
                        disabled={!canBill || planChange.isPending}
                        onClick={() =>
                          planChange.mutate({ module, targetPlan: plan })
                        }
                      >
                        {PLAN_ORDER.indexOf(plan) >
                        PLAN_ORDER.indexOf(module.planKey)
                          ? 'Upgrade'
                          : 'Downgrade'}{' '}
                        to {titleCase(plan)}
                      </Button>
                    ),
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!canBill || removeModule.isPending}
                    onClick={() => removeModule.mutate(module.moduleKey)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Remove
                  </Button>
                </div>
                <ModuleUsers
                  workspaceId={workspaceId}
                  moduleKey={module.moduleKey}
                  canManage={canManage}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {(['sales', 'service_cloud'] as EntitlementModuleKey[]).some(
        (key) => !activeKeys.has(key),
      ) && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Add a module</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(['sales', 'service_cloud'] as EntitlementModuleKey[])
              .filter((key) => !activeKeys.has(key))
              .map((key) => (
                <Card key={key}>
                  <CardContent className="flex items-center gap-4 p-5">
                    <Plus className="h-6 w-6 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-semibold">{titleCase(key)}</p>
                      <p className="text-muted-foreground text-sm">
                        Add on Free Forever or choose a paid plan.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={!canBill}
                      onClick={() =>
                        addModule.mutate({
                          moduleKey: key,
                          planKey: 'free_forever',
                        })
                      }
                    >
                      Add free
                    </Button>
                    <Button
                      disabled={!canBill}
                      onClick={() =>
                        addModule.mutate({ moduleKey: key, planKey: 'growth' })
                      }
                    >
                      Add Growth
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" /> Pending changes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.pendingChanges.length ? (
              data.pendingChanges.map((change) => (
                <div key={change.id} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">
                    {titleCase(change.changeType)} ·{' '}
                    {titleCase(change.moduleKey)}
                  </p>
                  <p className="text-muted-foreground">
                    Effective{' '}
                    {new Date(change.effectiveAt).toLocaleDateString()}
                    {change.toPlanKey
                      ? ` · ${titleCase(change.toPlanKey)}`
                      : ''}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">
                No pending changes.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Recent subscription activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(notificationsQuery.data ?? [])
              .slice(0, 6)
              .map(
                (notification: {
                  id: string;
                  title: string;
                  message: string;
                  created_at: string;
                }) => (
                  <div
                    key={notification.id}
                    className="border-b pb-3 last:border-0"
                  >
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {notification.message}
                    </p>
                  </div>
                ),
              )}
            {!notificationsQuery.data?.length && (
              <p className="text-muted-foreground text-sm">
                No recent activity.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <CreditCard className="h-4 w-4" /> Upgrades apply immediately.
        Downgrades and removals apply at the next billing boundary. Server-side
        entitlement checks remain authoritative.
      </p>
    </div>
  );
}

function UsageSummary({ moduleKey }: { moduleKey: EntitlementModuleKey }) {
  const { contexts } = useEntitlements();
  const features = Object.entries(contexts[moduleKey]?.features ?? {}).filter(
    ([, feature]) => feature.limitType === 'numeric',
  );
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Usage</p>
      {features
        .filter(([, feature]) => feature.isNearLimit)
        .map(([key]) => (
          <UsageLimitBanner
            key={key}
            moduleKey={moduleKey}
            featureKey={key}
            label={titleCase(key.split('.').at(-1) ?? key)}
          />
        ))}
      {features.slice(0, 5).map(([key, feature]) => {
        const percentage =
          feature.limitValue === null
            ? 0
            : Math.min(
                100,
                (feature.currentUsage / Math.max(1, feature.limitValue)) * 100,
              );
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{titleCase(key.split('.').at(-1) ?? key)}</span>
              <span>
                {feature.currentUsage} / {feature.limitValue ?? 'Unlimited'}
              </span>
            </div>
            <Progress value={percentage} />
          </div>
        );
      })}
    </div>
  );
}

function ModuleUsers({
  workspaceId,
  moduleKey,
  canManage,
}: {
  workspaceId: string;
  moduleKey: EntitlementModuleKey;
  canManage: boolean;
}) {
  const { teamMembers } = useRBAC();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['module-users', workspaceId, moduleKey],
    queryFn: () => getModuleUsersService(workspaceId, moduleKey),
  });
  const assignedIds = new Set(
    (query.data?.users ?? [])
      .filter((user: { status: string }) => user.status === 'active')
      .map((user: { userId: string }) => user.userId),
  );
  const available = (teamMembers ?? []).filter(
    (member) => !assignedIds.has(String(member.user_id ?? member.id)),
  );
  const mutate = useMutation({
    mutationFn: (input: { userId: string; remove?: boolean }) =>
      input.remove
        ? removeModuleUserService({
            workspaceId,
            moduleKey,
            userId: input.userId,
          })
        : assignModuleUserService({
            workspaceId,
            moduleKey,
            userId: input.userId,
          }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['module-users', workspaceId, moduleKey],
      }),
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        <p className="text-sm font-medium">Module users</p>
      </div>
      {(query.data?.users ?? [])
        .filter((user: { status: string }) => user.status === 'active')
        .map((user: { userId: string; name: string | null; email: string }) => (
          <div key={user.userId} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">
              {user.name ?? user.email}
            </span>
            {canManage && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  mutate.mutate({ userId: user.userId, remove: true })
                }
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      {canManage && available.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const member = available[0];
            if (member) {
              mutate.mutate({ userId: String(member.user_id ?? member.id) });
            }
          }}
        >
          <UserPlus className="mr-1 h-4 w-4" /> Assign{' '}
          {available[0]?.name ?? 'user'}
        </Button>
      )}
    </div>
  );
}
