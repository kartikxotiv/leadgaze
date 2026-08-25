'use client';

import type { Dispatch, SetStateAction } from 'react';

import {
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  Plus,
  Trash2,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import {
  BundlePurchaseCard,
  SeatChangeControl,
} from '~/components/subscriptions/subscription-management-controls';
import {
  ModuleUsers,
  UsageSummary,
} from '~/components/subscriptions/subscription-management-details';
import {
  type ActiveBundle,
  type ModulePlan,
  PLAN_ORDER,
  type WorkspacePlans,
  titleCase,
} from '~/components/subscriptions/subscription-management-types';
import type { EntitlementModuleKey } from '~/lib/entitlements/types';
import type { EntitlementPlanKey } from '~/lib/entitlements/types';
import type { PricingResponseData } from '~/lib/subscriptions/contracts';

type Invoice = {
  id: string;
  invoice_number: string;
  total_amount_minor: number;
  currency: string;
  status: string;
  payment_url: string | null;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

type Props = {
  workspaceId: string;
  data: WorkspacePlans | undefined;
  pricing: PricingResponseData | undefined;
  invoices: Invoice[];
  notifications: Notification[];
  billingCycle: 'monthly' | 'yearly';
  setBillingCycle: Dispatch<SetStateAction<'monthly' | 'yearly'>>;
  canManage: boolean;
  canBill: boolean;
  activeBundle: ActiveBundle;
  activeKeys: Set<EntitlementModuleKey>;
  pending: {
    trial: boolean;
    planChange: boolean;
    removeModule: boolean;
    seatChange: boolean;
    bundleCheckout: boolean;
  };
  onStartTrial: () => void;
  onPlanChange: (module: ModulePlan, targetPlan: EntitlementPlanKey) => void;
  onRemoveModule: (moduleKey: EntitlementModuleKey) => void;
  onModuleSeatChange: (module: ModulePlan, quantity: number) => void;
  onBundleSeatChange: (bundleKey: string, quantity: number) => void;
  onBundlePurchase: (bundleKey: string, seats: number) => void;
  onAddModule: (
    moduleKey: EntitlementModuleKey,
    planKey: EntitlementPlanKey,
  ) => void;
};

export function SubscriptionManagementView(props: Props) {
  const { data, activeBundle } = props;
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
              variant={props.billingCycle === cycle ? 'default' : 'ghost'}
              onClick={() => props.setBillingCycle(cycle)}
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
            {props.canBill && (
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

      {data?.subscriptionStatus === 'free' && props.canBill && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-5">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Free Forever</p>
              <p className="text-muted-foreground text-sm">
                Try Growth for 14 days across Sales and Service.
              </p>
            </div>
            <Button disabled={props.pending.trial} onClick={props.onStartTrial}>
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
                disabled={!props.canBill || props.pending.seatChange}
                onSave={(quantity) =>
                  props.onBundleSeatChange(activeBundle.key, quantity)
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
                      {props.billingCycle === 'yearly'
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
                      disabled={!props.canBill || props.pending.seatChange}
                      onSave={(quantity) =>
                        props.onModuleSeatChange(module, quantity)
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
                          !props.canBill ||
                          props.pending.planChange ||
                          Boolean(activeBundle)
                        }
                        onClick={() => props.onPlanChange(module, plan)}
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
                      !props.canBill ||
                      props.pending.removeModule ||
                      Boolean(activeBundle)
                    }
                    onClick={() => props.onRemoveModule(module.moduleKey)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Remove
                  </Button>
                </div>
                <ModuleUsers
                  workspaceId={props.workspaceId}
                  moduleKey={module.moduleKey}
                  canManage={props.canManage}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {props.pricing?.bundles.length ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold">Sales + Service bundles</h2>
            <p className="text-muted-foreground text-sm">
              Use one plan, one shared seat count, and one invoice for both
              modules.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {props.pricing.bundles.map((bundle) => (
              <BundlePurchaseCard
                key={bundle.bundleKey}
                bundle={bundle}
                billingCycle={props.billingCycle}
                current={activeBundle?.key === bundle.bundleKey}
                defaultSeats={activeBundle?.seats ?? 1}
                disabled={
                  !props.canBill ||
                  props.pending.bundleCheckout ||
                  Boolean(
                    activeBundle &&
                      PLAN_ORDER.indexOf(bundle.planKey) <
                        PLAN_ORDER.indexOf(activeBundle.planKey),
                  )
                }
                onPurchase={(seats) =>
                  props.onBundlePurchase(bundle.bundleKey, seats)
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      <AddModuleSection {...props} />
      <SubscriptionActivity
        data={data}
        invoices={props.invoices}
        notifications={props.notifications}
      />
      <p className="text-muted-foreground flex items-center gap-2 text-xs">
        <CreditCard className="h-4 w-4" /> Paid upgrades apply after payment is
        confirmed. Downgrades and removals apply at the next billing boundary.
        Server-side entitlement checks remain authoritative.
      </p>
    </div>
  );
}

function AddModuleSection(props: Props) {
  const available = (
    ['sales', 'service_cloud'] as EntitlementModuleKey[]
  ).filter((key) => !props.activeKeys.has(key));
  if (!available.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Add a module</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {available.map((key) => (
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
                disabled={!props.canBill}
                onClick={() => props.onAddModule(key, 'free_forever')}
              >
                Add free
              </Button>
              <Button
                disabled={!props.canBill}
                onClick={() => props.onAddModule(key, 'growth')}
              >
                Add Growth
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function SubscriptionActivity({
  data,
  invoices,
  notifications,
}: {
  data: WorkspacePlans | undefined;
  invoices: Invoice[];
  notifications: Notification[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {invoices.slice(0, 6).map((invoice) => (
            <div key={invoice.id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{invoice.invoice_number}</p>
                  <p className="text-muted-foreground text-xs">
                    {(invoice.total_amount_minor / 100).toLocaleString(
                      undefined,
                      { style: 'currency', currency: invoice.currency },
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
          {!invoices.length && (
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
                  {titleCase(change.changeType)} · {titleCase(change.moduleKey)}
                </p>
                <p className="text-muted-foreground">
                  Effective {new Date(change.effectiveAt).toLocaleDateString()}
                  {change.toPlanKey ? ` · ${titleCase(change.toPlanKey)}` : ''}
                </p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No pending changes.</p>
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
          {notifications.slice(0, 6).map((notification) => (
            <div key={notification.id} className="border-b pb-3 last:border-0">
              <p className="text-sm font-medium">{notification.title}</p>
              <p className="text-muted-foreground text-xs">
                {notification.message}
              </p>
            </div>
          ))}
          {!notifications.length && (
            <p className="text-muted-foreground text-sm">No recent activity.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
