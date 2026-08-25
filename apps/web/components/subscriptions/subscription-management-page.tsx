'use client';

import { useEffect, useMemo, useState } from 'react';

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
import { Input } from '@kit/ui/input';

import {
  ModuleUsers,
  UsageSummary,
} from '~/components/subscriptions/subscription-management-details';
import { useEntitlements } from '~/lib/entitlements/entitlement-provider';
import type { EntitlementModuleKey } from '~/lib/entitlements/types';
import type { EntitlementPlanKey } from '~/lib/entitlements/types';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import type { PricingResponseData } from '~/lib/subscriptions/contracts';
import {
  addModuleService,
  createBundleCheckoutService,
  createPricingCheckoutService,
  downgradePlanService,
  getBillingInvoicesService,
  getPublicPricingService,
  getSubscriptionNotificationsService,
  getWorkspacePlansService,
  removeModuleService,
  startTrialService,
  updateBundleSeatsService,
  updateModuleSeatsService,
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
  bundleKey: string | null;
  seatId: string | null;
  seatsPurchased: number;
  seatsUsed: number;
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'success') return;
    toast.success(
      'Payment completed. Your subscription will update after secure webhook confirmation.',
    );
    params.delete('payment');
    for (const key of [...params.keys()]) {
      if (key.startsWith('razorpay_')) params.delete(key);
    }
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`,
    );
  }, []);

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
  const invoicesQuery = useQuery({
    queryKey: ['subscription-invoices', workspaceId],
    queryFn: () => getBillingInvoicesService(workspaceId),
    enabled: Boolean(workspaceId && canView),
  });
  const pricingQuery = useQuery({
    queryKey: ['public-pricing'],
    queryFn: () => getPublicPricingService() as Promise<PricingResponseData>,
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
        const result = await upgradePlanService({
          workspaceId,
          moduleKey: input.module.moduleKey,
          newPlanKey: input.targetPlan,
          billingCycle,
        });
        if (result?.paymentRequired && result.url) {
          window.location.assign(result.url);
        }
        return result;
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
      const result = await addModuleService({
        workspaceId,
        moduleKey: input.moduleKey,
        planKey: input.planKey,
        billingCycle,
      });
      if (result?.paymentRequired && result.url) {
        window.location.assign(result.url);
      }
      return result;
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

  const seatChange = useMutation({
    mutationFn: async (input: {
      module?: ModulePlan;
      bundleKey?: string;
      newQuantity: number;
    }) => {
      const result = input.bundleKey
        ? await updateBundleSeatsService({
            workspaceId,
            bundleKey: input.bundleKey,
            newQuantity: input.newQuantity,
          })
        : await updateModuleSeatsService({
            seatId: input.module!.seatId!,
            newQuantity: input.newQuantity,
          });
      if (result?.paymentRequired && result.url) {
        window.location.assign(result.url);
      }
      return result;
    },
    onSuccess: async (result) => {
      toast.success(
        result?.paymentRequired
          ? 'Invoice created. Seats activate after payment.'
          : result?.changeStatus === 'pending'
            ? 'Seat reduction scheduled for period end.'
            : 'Seat count updated.',
      );
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const bundleCheckout = useMutation({
    mutationFn: async (input: { bundleKey: string; seats: number }) => {
      const result = await createBundleCheckoutService({
        workspaceId,
        bundleKey: input.bundleKey,
        billingCycle,
        seats: input.seats,
        returnUrl: '/org/subscription',
      });
      if (result.paymentRequired && result.url) {
        window.location.assign(result.url);
      }
      return result;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKeys = useMemo(
    () => new Set(plansQuery.data?.modules.map((item) => item.moduleKey) ?? []),
    [plansQuery.data?.modules],
  );
  const activeBundle = useMemo(() => {
    const modules = plansQuery.data?.modules ?? [];
    const salesAndService = modules.filter((module) =>
      ['sales', 'service_cloud'].includes(module.moduleKey),
    );
    const bundleKey = salesAndService[0]?.bundleKey;
    return bundleKey &&
      salesAndService.length === 2 &&
      salesAndService.every((module) => module.bundleKey === bundleKey)
      ? {
          key: bundleKey,
          seats: salesAndService[0]!.seatsPurchased,
          planKey: salesAndService[0]!.planKey,
        }
      : null;
  }, [plansQuery.data?.modules]);

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
        {activeBundle && (
          <Card className="border-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Sales + Service bundle</p>
                <p className="text-muted-foreground text-sm">
                  One shared seat quantity and one invoice cover both modules.
                </p>
              </div>
              <SeatChangeControl
                currentQuantity={activeBundle.seats}
                minimumQuantity={Math.max(
                  1,
                  ...(data?.modules.map((module) => module.seatsUsed) ?? [1]),
                )}
                disabled={!canBill || seatChange.isPending}
                onSave={(newQuantity) =>
                  seatChange.mutate({
                    bundleKey: activeBundle.key,
                    newQuantity,
                  })
                }
              />
            </CardContent>
          </Card>
        )}
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
                {!activeBundle && module.seatId && (
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-sm font-medium">Module seats</p>
                    <SeatChangeControl
                      currentQuantity={module.seatsPurchased}
                      minimumQuantity={Math.max(
                        1,
                        module.seatsUsed,
                        module.userCount,
                      )}
                      disabled={!canBill || seatChange.isPending}
                      onSave={(newQuantity) =>
                        seatChange.mutate({ module, newQuantity })
                      }
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {PLAN_ORDER.filter((plan) => plan !== module.planKey).map(
                    (plan) => (
                      <Button
                        key={plan}
                        size="sm"
                        variant="outline"
                        disabled={
                          !canBill ||
                          planChange.isPending ||
                          Boolean(activeBundle)
                        }
                        onClick={() =>
                          !activeBundle &&
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
                    disabled={
                      !canBill ||
                      removeModule.isPending ||
                      Boolean(activeBundle)
                    }
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

      {pricingQuery.data?.bundles.length ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">Sales + Service bundles</h2>
            <p className="text-muted-foreground text-sm">
              Use one plan, one shared seat count, and one invoice for both
              modules.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {pricingQuery.data.bundles.map((bundle) => (
              <BundlePurchaseCard
                key={bundle.bundleKey}
                bundle={bundle}
                billingCycle={billingCycle}
                current={activeBundle?.key === bundle.bundleKey}
                defaultSeats={activeBundle?.seats ?? 1}
                disabled={
                  !canBill ||
                  bundleCheckout.isPending ||
                  Boolean(
                    activeBundle &&
                      PLAN_ORDER.indexOf(bundle.planKey) <
                        PLAN_ORDER.indexOf(activeBundle.planKey),
                  )
                }
                onPurchase={(seats) =>
                  bundleCheckout.mutate({
                    bundleKey: bundle.bundleKey,
                    seats,
                  })
                }
              />
            ))}
          </div>
        </section>
      ) : null}

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
              <CreditCard className="h-5 w-5" /> Invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(invoicesQuery.data ?? []).slice(0, 6).map((invoice) => (
              <div key={invoice.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{invoice.invoice_number}</p>
                    <p className="text-muted-foreground text-xs">
                      {(invoice.total_amount_minor / 100).toLocaleString(
                        undefined,
                        {
                          style: 'currency',
                          currency: invoice.currency,
                        },
                      )}{' '}
                      · {titleCase(invoice.status)}
                    </p>
                  </div>
                  {invoice.status === 'issued' && invoice.payment_url && (
                    <Button asChild size="sm">
                      <a
                        href={invoice.payment_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Pay
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!invoicesQuery.data?.length && (
              <p className="text-muted-foreground text-sm">No invoices yet.</p>
            )}
          </CardContent>
        </Card>

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
        <CreditCard className="h-4 w-4" /> Paid upgrades apply after payment is
        confirmed. Downgrades and removals apply at the next billing boundary.
        Server-side entitlement checks remain authoritative.
      </p>
    </div>
  );
}

function SeatChangeControl({
  currentQuantity,
  minimumQuantity,
  disabled,
  onSave,
}: {
  currentQuantity: number;
  minimumQuantity: number;
  disabled: boolean;
  onSave: (quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(currentQuantity);
  const valid = Number.isInteger(quantity) && quantity >= minimumQuantity;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="w-24"
        type="number"
        min={minimumQuantity}
        value={quantity}
        disabled={disabled}
        aria-label="Seat quantity"
        onChange={(event) => setQuantity(Number(event.target.value))}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={disabled || !valid || quantity === currentQuantity}
        onClick={() => onSave(quantity)}
      >
        Save seats
      </Button>
      <span className="text-muted-foreground text-xs">
        Current: {currentQuantity}
        {minimumQuantity > 1 ? ` · minimum ${minimumQuantity} assigned` : ''}
      </span>
    </div>
  );
}

function BundlePurchaseCard({
  bundle,
  billingCycle,
  current,
  defaultSeats,
  disabled,
  onPurchase,
}: {
  bundle: PricingResponseData['bundles'][number];
  billingCycle: 'monthly' | 'yearly';
  current: boolean;
  defaultSeats: number;
  disabled: boolean;
  onPurchase: (seats: number) => void;
}) {
  const [seats, setSeats] = useState(defaultSeats);
  const amount =
    billingCycle === 'yearly' ? bundle.yearlyPrice : bundle.monthlyPrice;
  return (
    <Card className={current ? 'border-blue-500 ring-1 ring-blue-500' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{bundle.bundleName}</CardTitle>
          {current && <Badge>Current</Badge>}
        </div>
        <CardDescription>
          ${amount}/{billingCycle === 'yearly' ? 'year' : 'month'} per bundled
          user
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            className="w-24"
            type="number"
            min={1}
            value={seats}
            disabled={disabled || current}
            aria-label={`${bundle.bundleName} seats`}
            onChange={(event) => setSeats(Number(event.target.value))}
          />
          <span className="text-muted-foreground text-sm">shared seats</span>
        </div>
        <Button
          className="w-full"
          disabled={
            disabled || current || !Number.isInteger(seats) || seats < 1
          }
          onClick={() => onPurchase(seats)}
        >
          {current ? 'Current bundle' : 'Choose bundle'}
        </Button>
      </CardContent>
    </Card>
  );
}
