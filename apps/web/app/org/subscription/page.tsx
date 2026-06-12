'use client';

import { useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  DollarSign,
  Headphones,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  type WorkspaceSubscriptionStatus,
  getWorkspaceSubscriptionService,
} from '@kit/core/services';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { cn } from '@kit/ui/utils';

import { AppLogo } from '~/components/app-logo';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  type SeatAssignment,
  type SubscriptionProduct,
  type WorkspaceSeat,
  cancelSubscriptionService,
  createMultiProductCheckoutService,
  getSeatAssignmentsService,
  getSubscriptionProductsService,
  getWorkspaceSeatsService,
  updateSeatsViaStripeService,
} from '~/services/subscription.service';

// ─── Constants ───────────────────────────────────────────────────

const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  sales: <ShoppingCart className="h-5 w-5" />,
  hrms: <Users className="h-5 w-5" />,
  inventory: <Package className="h-5 w-5" />,
  service_cloud: <Headphones className="h-5 w-5" />,
  funds: <DollarSign className="h-5 w-5" />,
};

const PRODUCT_STYLES: Record<
  string,
  {
    iconBg: string;
    iconColor: string;
    gradient: string;
    accent: string;
    features: string[];
  }
> = {
  sales: {
    iconBg: 'bg-blue-50 dark:bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-500/10 to-indigo-500/5',
    accent: 'bg-blue-600 hover:bg-blue-700',
    features: [
      'Lead & contact management',
      'Sales pipeline tracking',
      'Email campaigns & templates',
      'Activity timeline & notes',
    ],
  },
  hrms: {
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    gradient: 'from-violet-500/10 to-purple-500/5',
    accent: 'bg-violet-600 hover:bg-violet-700',
    features: [
      'Employee directory',
      'Attendance & leave tracking',
      'Payroll management',
      'Onboarding workflows',
    ],
  },
  inventory: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'from-emerald-500/10 to-green-500/5',
    accent: 'bg-emerald-600 hover:bg-emerald-700',
    features: [
      'Product catalog',
      'Stock management',
      'Purchase & sales orders',
      'Warehouse tracking',
    ],
  },
  service_cloud: {
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-500/10 to-orange-500/5',
    accent: 'bg-amber-600 hover:bg-amber-700',
    features: [
      'Ticket management',
      'Shared inbox',
      'SLA tracking',
      'Knowledge base',
    ],
  },
  funds: {
    iconBg: 'bg-teal-50 dark:bg-teal-500/10',
    iconColor: 'text-teal-600 dark:text-teal-400',
    gradient: 'from-teal-500/10 to-cyan-500/5',
    accent: 'bg-teal-600 hover:bg-teal-700',
    features: [
      'Investor CRM',
      'Deal pipeline',
      'Fundraise tracking',
      'Portfolio management',
    ],
  },
};

function getProductStyle(key: string) {
  return (
    PRODUCT_STYLES[key] ?? {
      iconBg: 'bg-slate-50 dark:bg-slate-500/10',
      iconColor: 'text-slate-600 dark:text-slate-400',
      gradient: 'from-slate-500/10 to-gray-500/5',
      accent: 'bg-slate-600 hover:bg-slate-700',
      features: [],
    }
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function OrgSubscriptionPage() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id ?? '';
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Local state for pending seat changes (before checkout/apply)
  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>(
    {},
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly',
  );

  // Track which available modules are selected for subscription (productKey -> seats)
  const [availableSelections, setAvailableSelections] = useState<
    Record<string, number>
  >({});

  // Cancel / remove confirmation state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [removeModuleDialog, setRemoveModuleDialog] = useState<{
    open: boolean;
    productKey: string;
    displayName: string;
  }>({ open: false, productKey: '', displayName: '' });

  // Seat update confirmation dialog state
  const [seatUpdateDialog, setSeatUpdateDialog] = useState<{
    open: boolean;
    seatId: string;
    displayName: string;
    currentSeats: number;
    newSeats: number;
  }>({
    open: false,
    seatId: '',
    displayName: '',
    currentSeats: 0,
    newSeats: 0,
  });

  // Handle checkout success/cancel query params from Stripe redirect
  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') {
      toast.success(
        'Payment successful! Your subscription is being activated.',
      );
      queryClient.invalidateQueries({
        queryKey: ['workspace-seats', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace-subscription', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['subscription-products'],
      });
      window.history.replaceState({}, '', '/org/subscription');
    } else if (checkout === 'cancel') {
      toast.error('Checkout was cancelled.');
      window.history.replaceState({}, '', '/org/subscription');
    }
  }, [searchParams, workspaceId, queryClient]);

  // Fetch workspace subscription status (trial info)
  const { data: subscriptionStatus } = useQuery<WorkspaceSubscriptionStatus>({
    queryKey: ['workspace-subscription', workspaceId],
    queryFn: () => getWorkspaceSubscriptionService(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['subscription-products'],
    queryFn: () => getSubscriptionProductsService(),
  });

  const { data: seatsData } = useQuery({
    queryKey: ['workspace-seats', workspaceId],
    queryFn: () => getWorkspaceSeatsService(workspaceId),
    enabled: !!workspaceId,
  });

  const products: SubscriptionProduct[] = productsData?.data ?? [];
  // Filter out cancelled seats — they should not appear in the active UI
  // Wrapped in useMemo to keep a stable reference for useEffect dependencies
  const seats: WorkspaceSeat[] = useMemo(
    () =>
      (seatsData?.data ?? []).filter(
        (s: WorkspaceSeat) => s.status !== 'cancelled',
      ),
    [seatsData],
  );

  const isTrial = seats.some(
    (s) =>
      s.status === 'trialing' ||
      s.provider_subscription_id?.startsWith('trial_sub_'),
  );
  const isPaid = seats.some(
    (s) =>
      s.status === 'active' &&
      s.provider_subscription_id &&
      !s.provider_subscription_id.startsWith('trial_sub_'),
  );

  const subscribedProductIds = useMemo(
    () => new Set(seats.map((s) => s.product_id)),
    [seats],
  );

  const availableProducts = products.filter(
    (p) => !subscribedProductIds.has(p.id),
  );

  // Initialize pending changes from current seats
  useEffect(() => {
    setPendingChanges((prev) => {
      const updated = { ...prev };
      for (const seat of seats) {
        if (!(seat.product_id in updated)) {
          updated[seat.product_id] = seat.seats_purchased;
        }
      }
      return updated;
    });
  }, [seats]);

  // Calculate totals from pending changes + available selections
  const { totalMonthly, totalSeats, changedItems, selectedNewItems } =
    useMemo(() => {
      let monthly = 0;
      let seatsTotal = 0;
      const changed: Array<{ productKey: string; seats: number }> = [];

      for (const seat of seats) {
        const pending = pendingChanges[seat.product_id] ?? seat.seats_purchased;
        const product = seat.subscription_products;
        if (product) {
          const price = product.monthly_price_per_seat ?? 0;
          monthly += price * pending;
          seatsTotal += pending;
          if (pending !== seat.seats_purchased) {
            changed.push({ productKey: product.product_key, seats: pending });
          }
        }
      }

      // Add totals from selected available modules
      const newItems: Array<{ productKey: string; seats: number }> = [];
      for (const [productKey, seatCount] of Object.entries(
        availableSelections,
      )) {
        const product = products.find((p) => p.product_key === productKey);
        if (product) {
          const price = product.monthly_price_per_seat ?? 0;
          monthly += price * seatCount;
          seatsTotal += seatCount;
          newItems.push({ productKey, seats: seatCount });
        }
      }

      return {
        totalMonthly: monthly,
        totalSeats: seatsTotal,
        changedItems: changed,
        selectedNewItems: newItems,
      };
    }, [seats, pendingChanges, availableSelections, products]);

  // Trial info
  const trialDaysRemaining = subscriptionStatus?.trial_days_remaining ?? null;
  const isTrialExpired = subscriptionStatus?.is_trial_expired ?? false;

  // Checkout mutation (for trial -> paid, new modules, or combined)
  const checkoutMutation = useMutation({
    mutationFn: () => {
      // Always include ALL existing modules with their pending seat counts
      // (not just the ones that changed — unchanged modules must also be
      //  included so they convert from trial to paid)
      const existingItems = seats.map((s) => ({
        productKey: s.subscription_products?.product_key ?? '',
        seats: pendingChanges[s.product_id] ?? s.seats_purchased,
      }));

      const allItems = [
        ...existingItems.filter((i) => i.productKey),
        ...selectedNewItems,
      ];

      return createMultiProductCheckoutService({
        workspaceId,
        items: allItems,
        billingCycle,
      });
    },
    onSuccess: (data: { data?: { url?: string } }) => {
      const url = data?.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.success(
          data?.data
            ? 'Subscription updated successfully!'
            : 'No checkout URL returned.',
        );
        queryClient.invalidateQueries({
          queryKey: ['workspace-seats', workspaceId],
        });
      }
    },
    onError: (err: unknown) => {
      toast.error((err as Error)?.message || 'Failed to create checkout');
    },
  });

  // Direct seat update (for paid subscriptions) — shows confirmation first
  const handleDirectUpdate = async (seatId: string, newQuantity: number) => {
    try {
      const result = await updateSeatsViaStripeService(seatId, newQuantity);
      toast.success(
        (result as { message?: string })?.message ?? 'Seat count updated',
      );
      queryClient.invalidateQueries({
        queryKey: ['workspace-seats', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace-subscription', workspaceId],
      });
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { requiresCheckout?: boolean; message?: string } };
        message?: string;
      };
      if (error?.response?.data?.requiresCheckout) {
        toast.error(
          'Please subscribe to a paid plan first to manage seat counts.',
        );
      } else {
        toast.error(error?.message || 'Failed to update seats');
      }
    }
  };

  // Show confirmation dialog before updating seats on paid subscription
  const requestSeatUpdate = (seat: WorkspaceSeat, newQuantity: number) => {
    setSeatUpdateDialog({
      open: true,
      seatId: seat.id,
      displayName: seat.subscription_products?.display_name ?? 'Module',
      currentSeats: seat.seats_purchased,
      newSeats: newQuantity,
    });
  };

  const updatePending = (productId: string, seats: number) => {
    setPendingChanges((prev) => ({ ...prev, [productId]: seats }));
  };

  const hasChanges = changedItems.length > 0 || selectedNewItems.length > 0;

  // Cancel subscription mutation (full cancellation)
  const cancelMutation = useMutation({
    mutationFn: () => cancelSubscriptionService({ workspaceId }),
    onSuccess: (data) => {
      toast.success(data?.message ?? 'Subscription cancelled.');
      setCancelDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: ['workspace-seats', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace-subscription', workspaceId],
      });
    },
    onError: (err: unknown) => {
      toast.error((err as Error)?.message || 'Failed to cancel subscription');
    },
  });

  // Remove single module mutation
  const removeModuleMutation = useMutation({
    mutationFn: (productKey: string) =>
      cancelSubscriptionService({ workspaceId, productKey }),
    onSuccess: (data) => {
      toast.success(data?.message ?? 'Module removed from subscription.');
      setRemoveModuleDialog({ open: false, productKey: '', displayName: '' });
      queryClient.invalidateQueries({
        queryKey: ['workspace-seats', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace-subscription', workspaceId],
      });
    },
    onError: (err: unknown) => {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to remove module',
      );
    },
  });

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <header className="border-border bg-card/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <AppLogo href={null} variant="marketing" className="w-[100px]"/>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">/</span>
              <span className="text-muted-foreground text-xs">
                Subscription
              </span>
            </div>
          </div>
          <a href="/org/home">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Home
            </Button>
          </a>
        </div>
      </header>

      {/* Page header */}
      <div className="border-border from-primary/[0.03] border-b bg-gradient-to-b to-transparent">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center gap-2">
            <CreditCard className="text-primary h-4 w-4" />
            <span className="secondary-text-small text-primary font-medium tracking-widest uppercase">
              Account &middot; Billing
            </span>
          </div>
          <h1 className="text-foreground mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Subscription & Modules
          </h1>
          <p className="primary-text-regular text-muted-foreground mt-2">
            Manage your active modules, seat allocations, and billing.
          </p>

          {/* Billing cycle toggle */}
          {(!isPaid || isTrial) && (
            <div className="mt-5 flex items-center gap-3">
              <span className="secondary-text-small text-muted-foreground">
                Billing:
              </span>
              <div className="border-border flex overflow-hidden rounded-lg border">
                {(['monthly', 'yearly'] as const).map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    className={cn(
                      'px-4 py-1.5 text-xs font-medium transition-colors',
                      billingCycle === cycle
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground hover:bg-muted',
                    )}
                    onClick={() => setBillingCycle(cycle)}
                  >
                    {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-6">
        {/* Trial Banner */}
        {(isTrial || isTrialExpired) && (
          <TrialBanner
            trialDaysRemaining={trialDaysRemaining}
            isExpired={isTrialExpired}
          />
        )}

        {/* Quick stats */}
        <div className="flex flex-wrap gap-3">
          <div className="border-border bg-card flex items-center gap-2 rounded-full border px-4 py-2">
            <Package className="text-primary h-4 w-4" />
            <span className="secondary-text-small text-muted-foreground">
              Active modules
            </span>
            <span className="primary-text-medium text-foreground font-bold">
              {seats.length}
            </span>
          </div>
          <div className="border-border bg-card flex items-center gap-2 rounded-full border px-4 py-2">
            <Users className="text-primary h-4 w-4" />
            <span className="secondary-text-small text-muted-foreground">
              Total seats
            </span>
            <span className="primary-text-medium text-foreground font-bold">
              {totalSeats}
            </span>
          </div>
          {isPaid && monthlyTotalDisplay(totalMonthly) && (
            <div className="border-border bg-card flex items-center gap-2 rounded-full border px-4 py-2">
              <DollarSign className="text-primary h-4 w-4" />
              <span className="secondary-text-small text-muted-foreground">
                Monthly total
              </span>
              <span className="primary-text-medium text-foreground font-bold">
                ${totalMonthly}/mo
              </span>
            </div>
          )}
        </div>

        {/* Active Subscriptions */}
        {seats.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="primary-heading text-foreground">Your Modules</h2>
              <Badge variant="secondary" className="text-xs">
                {seats.length} module{seats.length !== 1 ? 's' : ''}
                {isTrial && ' (Trial)'}
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {seats.map((seat) => (
                <ActiveModuleCard
                  key={seat.id}
                  seat={seat}
                  workspaceId={workspaceId}
                  isPaid={isPaid}
                  isTrial={isTrial}
                  pendingSeats={
                    pendingChanges[seat.product_id] ?? seat.seats_purchased
                  }
                  billingCycle={billingCycle}
                  onPendingChange={(count) =>
                    updatePending(seat.product_id, count)
                  }
                  onDirectUpdate={(count) => requestSeatUpdate(seat, count)}
                  onRemove={() =>
                    setRemoveModuleDialog({
                      open: true,
                      productKey: seat.subscription_products?.product_key ?? '',
                      displayName:
                        seat.subscription_products?.display_name ?? 'Module',
                    })
                  }
                />
              ))}
            </div>
          </section>
        )}

        {/* Available Products */}
        {availableProducts.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="primary-heading text-foreground">
                  Available Modules
                </h2>
                <p className="secondary-text-small text-muted-foreground mt-1">
                  Add modules to expand your workspace capabilities
                </p>
              </div>
              <Badge variant="info" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                {availableProducts.length} available
              </Badge>
            </div>
            {productsLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
                <p className="secondary-text-small text-muted-foreground mt-3">
                  Loading modules...
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableProducts.map((product) => (
                  <AvailableModuleCard
                    key={product.id}
                    product={product}
                    billingCycle={billingCycle}
                    isSelected={product.product_key in availableSelections}
                    selectedSeats={
                      availableSelections[product.product_key] ?? 1
                    }
                    onSelect={() => {
                      setAvailableSelections((prev) => ({
                        ...prev,
                        [product.product_key]: 1,
                      }));
                    }}
                    onDeselect={() => {
                      setAvailableSelections((prev) => {
                        const next = { ...prev };
                        delete next[product.product_key];
                        return next;
                      });
                    }}
                    onSeatsChange={(seats) => {
                      setAvailableSelections((prev) => ({
                        ...prev,
                        [product.product_key]: seats,
                      }));
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Checkout Bar (for trial/non-paid states or when new modules are selected) */}
      {(((!isPaid || isTrial) && seats.length > 0) ||
        selectedNewItems.length > 0) && (
        <CheckoutBar
          totalMonthly={totalMonthly}
          totalSeats={totalSeats}
          hasChanges={hasChanges}
          isTrial={isTrial}
          isTrialExpired={isTrialExpired}
          isPending={checkoutMutation.isPending}
          onCheckout={() => checkoutMutation.mutate()}
        />
      )}

      {/* Cancel Subscription Section (only for paid subscriptions) */}
      {isPaid && seats.length > 0 && (
        <div className="mx-auto max-w-6xl px-6 pb-8">
          <div className="border-destructive/20 rounded-xl border p-6">
            <div className="flex items-center gap-3">
              <div className="bg-destructive/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <AlertTriangle className="text-destructive h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="primary-heading text-destructive">
                  Cancel Subscription
                </h3>
                <p className="secondary-text-small text-muted-foreground mt-1">
                  Cancelling will revoke access to all modules at the end of
                  your current billing period. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={cancelMutation.isPending}
                onClick={() => setCancelDialogOpen(true)}
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                Cancel All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Seat Update Confirmation Dialog */}
      <Dialog
        open={seatUpdateDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setSeatUpdateDialog({
              open: false,
              seatId: '',
              displayName: '',
              currentSeats: 0,
              newSeats: 0,
            });
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-md">
          <DialogHeader className="border-b p-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Users className="text-primary h-5 w-5" />
              {seatUpdateDialog.newSeats > seatUpdateDialog.currentSeats
                ? 'Add Seat'
                : 'Remove Seat'}{' '}
              — {seatUpdateDialog.displayName}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p>
                  {seatUpdateDialog.newSeats > seatUpdateDialog.currentSeats
                    ? `You are about to increase ${seatUpdateDialog.displayName} from ${seatUpdateDialog.currentSeats} to ${seatUpdateDialog.newSeats} seat${seatUpdateDialog.newSeats !== 1 ? 's' : ''}.`
                    : `You are about to decrease ${seatUpdateDialog.displayName} from ${seatUpdateDialog.currentSeats} to ${seatUpdateDialog.newSeats} seat${seatUpdateDialog.newSeats !== 1 ? 's' : ''}.`}
                </p>
                <div className="bg-muted rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <CreditCard className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-foreground text-sm font-medium">
                        Prorated billing
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Your subscription will be updated immediately. The
                        difference will be calculated on a{' '}
                        <strong>pro-rata basis</strong> and reflected in your
                        next invoice.{' '}
                        {seatUpdateDialog.newSeats >
                        seatUpdateDialog.currentSeats
                          ? 'You will be charged for the remaining days of the current billing period.'
                          : 'A prorated credit will be applied to your next invoice.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
        <DialogFooter className="gap-2 sm:gap-0 border-t p-6 mt-auto">
            <Button
              variant="outline"
              onClick={() =>
                setSeatUpdateDialog({
                  open: false,
                  seatId: '',
                  displayName: '',
                  currentSeats: 0,
                  newSeats: 0,
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await handleDirectUpdate(
                  seatUpdateDialog.seatId,
                  seatUpdateDialog.newSeats,
                );
                setSeatUpdateDialog({
                  open: false,
                  seatId: '',
                  displayName: '',
                  currentSeats: 0,
                  newSeats: 0,
                });
              }}
            >
              Confirm Update
            </Button>
          </DialogFooter>
      </DialogContent>
      </Dialog>

      {/* Cancel Subscription Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={(open) => {
          if (!open) setCancelDialogOpen(false);
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-md">
          <DialogHeader className="border-b p-6 pb-4">
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p>
                  Are you sure you want to cancel your subscription? All{' '}
                  <strong>
                    {seats.length} active module
                    {seats.length !== 1 ? 's' : ''}
                  </strong>{' '}
                  will be deactivated and your team members will lose access to
                  their assigned modules.
                </p>
                <div className="bg-muted rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <CreditCard className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-foreground text-sm font-medium">
                        Billing & Access
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Your subscription will be cancelled immediately in
                        Stripe. Access to all modules will be revoked. A{' '}
                        <strong>prorated credit</strong> for any unused portion
                        of your current billing period will be applied to your
                        account.
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-destructive text-xs">
                  This action cannot be undone. You will need to re-subscribe to
                  regain access.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Subscription'
              )}
            </Button>
          </DialogFooter>
        <DialogFooter className="gap-2 sm:gap-0 border-t p-6 mt-auto">
            <Button
              variant="outline"
              onClick={() =>
                setSeatUpdateDialog({
                  open: false,
                  seatId: '',
                  displayName: '',
                  currentSeats: 0,
                  newSeats: 0,
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await handleDirectUpdate(
                  seatUpdateDialog.seatId,
                  seatUpdateDialog.newSeats,
                );
                setSeatUpdateDialog({
                  open: false,
                  seatId: '',
                  displayName: '',
                  currentSeats: 0,
                  newSeats: 0,
                });
              }}
            >
              Confirm Update
            </Button>
          </DialogFooter>
      </DialogContent>
      </Dialog>

      {/* Remove Module Confirmation Dialog */}
      <Dialog
        open={removeModuleDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveModuleDialog({
              open: false,
              productKey: '',
              displayName: '',
            });
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-md">
          <DialogHeader className="border-b p-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="text-destructive h-5 w-5" />
              Remove Module
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p>
                  Are you sure you want to remove{' '}
                  <strong>{removeModuleDialog.displayName}</strong> from your
                  subscription? You will lose access to this module immediately.
                </p>
                <div className="bg-muted rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <CreditCard className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-foreground text-sm font-medium">
                        Prorated billing
                      </p>
                      <p className="text-muted-foreground text-xs">
                        This module will be removed from your Stripe
                        subscription immediately. A{' '}
                        <strong>prorated credit</strong> for the unused portion
                        of your billing period will be applied to your next
                        invoice.
                      </p>
                    </div>
                  </div>
                </div>
                {seats.length <= 1 && (
                  <p className="text-destructive text-xs">
                    This is your last active module. Removing it will cancel
                    your entire subscription.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                setRemoveModuleDialog({
                  open: false,
                  productKey: '',
                  displayName: '',
                })
              }
            >
              Keep Module
            </Button>
            <Button
              variant="destructive"
              disabled={removeModuleMutation.isPending}
              onClick={() =>
                removeModuleMutation.mutate(removeModuleDialog.productKey)
              }
            >
              {removeModuleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Module'
              )}
            </Button>
          </DialogFooter>
        <DialogFooter className="gap-2 sm:gap-0 border-t p-6 mt-auto">
            <Button
              variant="outline"
              onClick={() =>
                setSeatUpdateDialog({
                  open: false,
                  seatId: '',
                  displayName: '',
                  currentSeats: 0,
                  newSeats: 0,
                })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await handleDirectUpdate(
                  seatUpdateDialog.seatId,
                  seatUpdateDialog.newSeats,
                );
                setSeatUpdateDialog({
                  open: false,
                  seatId: '',
                  displayName: '',
                  currentSeats: 0,
                  newSeats: 0,
                });
              }}
            >
              Confirm Update
            </Button>
          </DialogFooter>
      </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Trial Banner ────────────────────────────────────────────────

function TrialBanner({
  trialDaysRemaining,
  isExpired,
}: {
  trialDaysRemaining: number | null;
  isExpired: boolean;
}) {
  if (isExpired) {
    return (
      <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <div className="bg-destructive/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <AlertTriangle className="text-destructive h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="primary-heading text-destructive">Trial Expired</p>
            <p className="secondary-text-small text-muted-foreground mt-1">
              Your 7-day trial has ended. Subscribe now to keep access to all
              modules and continue using Leadgaze without interruption.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="primary-heading text-amber-800 dark:text-amber-300">
            {trialDaysRemaining != null
              ? `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} left in your trial`
              : 'Trial active'}
          </p>
          <p className="secondary-text-small mt-1 text-amber-700 dark:text-amber-400">
            You have full access to all modules during your trial. Subscribe now
            to keep your access and adjust seat counts for your team.
          </p>
        </div>
        <Badge variant="warning" className="shrink-0 text-xs">
          Trial
        </Badge>
      </div>
    </div>
  );
}

// ─── Active Module Card ──────────────────────────────────────────

function ActiveModuleCard({
  seat,
  workspaceId,
  isPaid,
  isTrial,
  pendingSeats,
  billingCycle,
  onPendingChange,
  onDirectUpdate,
  onRemove,
}: {
  seat: WorkspaceSeat;
  workspaceId: string;
  isPaid: boolean;
  isTrial: boolean;
  pendingSeats: number;
  billingCycle: 'monthly' | 'yearly';
  onPendingChange: (count: number) => void;
  onDirectUpdate: (count: number) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const product = seat.subscription_products;
  const style = getProductStyle(product?.product_key ?? '');
  const icon = PRODUCT_ICONS[product?.product_key ?? ''] ?? (
    <Package className="h-5 w-5" />
  );

  const displaySeats = isPaid ? seat.seats_purchased : pendingSeats;
  const seatPercent =
    seat.seats_purchased > 0
      ? Math.min(
          100,
          Math.round((seat.seats_used / seat.seats_purchased) * 100),
        )
      : 0;

  const pricePerSeat =
    billingCycle === 'yearly'
      ? product?.yearly_price_per_seat
      : product?.monthly_price_per_seat;
  const total = pricePerSeat ? Number(pricePerSeat) * displaySeats : 0;

  const handleIncrement = async () => {
    const newCount = displaySeats + 1;
    if (isPaid && !isTrial) {
      setUpdating(true);
      try {
        await onDirectUpdate(newCount);
      } finally {
        setUpdating(false);
      }
    } else {
      onPendingChange(newCount);
    }
  };

  const handleDecrement = async () => {
    if (displaySeats <= 1) return;
    const newCount = displaySeats - 1;
    if (isPaid && !isTrial) {
      setUpdating(true);
      try {
        await onDirectUpdate(newCount);
      } finally {
        setUpdating(false);
      }
    } else {
      onPendingChange(newCount);
    }
  };

  const statusLabel =
    seat.status === 'trialing'
      ? 'Trial'
      : seat.status === 'active'
        ? 'Active'
        : seat.status.replace(/_/g, ' ');

  const statusVariant =
    seat.status === 'active'
      ? 'success'
      : seat.status === 'trialing'
        ? 'warning'
        : ('secondary' as const);

  return (
    <Card className="overflow-hidden">
      <div
        className={cn(
          'h-1 bg-gradient-to-r',
          style.gradient.replace('/10', '/60').replace('/5', '/30'),
        )}
      />
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                style.iconBg,
                style.iconColor,
              )}
            >
              {icon}
            </div>
            <div>
              <h3 className="primary-heading text-foreground">
                {product?.display_name ?? 'Module'}
              </h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant} className="text-[10px]">
                  {statusLabel}
                </Badge>
                <span className="secondary-text-small text-muted-foreground">
                  {seat.seats_used}/{seat.seats_purchased} used
                </span>
              </div>
            </div>
          </div>

          {/* Remove module button — only when owner is the sole user */}
          {seat.seats_used <= 1 && (
            <button
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
              onClick={onRemove}
              title="Remove this module from your subscription"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Remove</span>
            </button>
          )}
        </div>

        {/* Seat adjuster */}
        <div className="mt-4 flex items-center justify-between">
          <div>
            <span className="secondary-text-small text-muted-foreground">
              Seats
            </span>
            {pricePerSeat && (
              <span className="secondary-text-small text-foreground ml-2 font-medium">
                ${total}/{billingCycle === 'yearly' ? 'yr' : 'mo'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={displaySeats <= 1 || updating}
              onClick={handleDecrement}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-foreground w-8 text-center text-lg font-bold">
              {displaySeats}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={updating}
              onClick={handleIncrement}
            >
              <Plus className="h-3 w-3" />
            </Button>
            {updating && (
              <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
            )}
          </div>
        </div>

        {/* Seat usage bar */}
        <div className="mt-3">
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${seatPercent}%`,
                backgroundColor:
                  seatPercent >= 90 ? 'var(--destructive)' : 'var(--primary)',
              }}
            />
          </div>
        </div>

        {/* Pricing info */}
        {pricePerSeat && (
          <div className="mt-3 flex items-center justify-between">
            <span className="secondary-text-small text-muted-foreground">
              ${pricePerSeat}/seat/{billingCycle === 'yearly' ? 'yr' : 'mo'}
            </span>
            <button
              className="secondary-text-small text-primary hover:underline"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide' : 'View'} members{' '}
              {expanded ? (
                <ChevronUp className="inline h-3 w-3" />
              ) : (
                <ChevronDown className="inline h-3 w-3" />
              )}
            </button>
          </div>
        )}

        {/* Expanded seat assignments */}
        {expanded && (
          <div className="border-border mt-3 border-t pt-3">
            <SeatAssignmentsList
              workspaceId={workspaceId}
              productKey={product?.product_key ?? ''}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Available Module Card ───────────────────────────────────────

function AvailableModuleCard({
  product,
  billingCycle,
  isSelected,
  selectedSeats,
  onSelect,
  onDeselect,
  onSeatsChange,
}: {
  product: SubscriptionProduct;
  billingCycle: 'monthly' | 'yearly';
  isSelected: boolean;
  selectedSeats: number;
  onSelect: () => void;
  onDeselect: () => void;
  onSeatsChange: (seats: number) => void;
}) {
  const style = getProductStyle(product.product_key);
  const icon = PRODUCT_ICONS[product.product_key] ?? (
    <Package className="h-5 w-5" />
  );

  const pricePerSeat =
    billingCycle === 'yearly'
      ? product.yearly_price_per_seat
      : product.monthly_price_per_seat;

  const total = pricePerSeat ? Number(pricePerSeat) * selectedSeats : 0;

  return (
    <Card
      className={cn(
        'group flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md',
        isSelected && 'ring-primary border-primary ring-2',
      )}
    >
      <div
        className={cn(
          'h-1 bg-gradient-to-r',
          style.gradient.replace('/10', '/60').replace('/5', '/30'),
        )}
      />
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-lg',
              style.iconBg,
              style.iconColor,
            )}
          >
            {icon}
          </div>
          {isSelected ? (
            <Badge variant="success" className="gap-1 text-[10px]">
              <Check className="h-3 w-3" />
              Selected
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              Available
            </Badge>
          )}
        </div>

        <div className="mt-4 flex-1">
          <h3 className="primary-heading text-foreground">
            {product.display_name}
          </h3>
          <p className="secondary-text-small text-muted-foreground mt-1">
            {product.description}
          </p>
        </div>

        <div className="border-border bg-muted/30 mt-4 rounded-lg border p-3">
          <div className="flex items-baseline gap-1">
            {pricePerSeat ? (
              <>
                <span className="text-foreground text-2xl font-bold">
                  ${pricePerSeat}
                </span>
                <span className="secondary-text-small text-muted-foreground">
                  /seat/{billingCycle === 'yearly' ? 'yr' : 'mo'}
                </span>
              </>
            ) : (
              <span className="primary-text-medium text-foreground">
                Contact sales
              </span>
            )}
          </div>
        </div>

        {style.features.length > 0 && (
          <div className="mt-4 space-y-2">
            {style.features.slice(0, 3).map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check className="text-primary h-3.5 w-3.5 shrink-0" />
                <span className="secondary-text-small text-foreground">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Seat selector + Select button */}
        {pricePerSeat ? (
          <div className="border-border mt-4 space-y-3 border-t pt-4">
            {isSelected && (
              <>
                <div className="flex items-center justify-between">
                  <span className="secondary-text-small text-muted-foreground">
                    Seats
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={selectedSeats <= 1}
                      onClick={() =>
                        onSeatsChange(Math.max(1, selectedSeats - 1))
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-foreground w-6 text-center text-base font-bold">
                      {selectedSeats}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onSeatsChange(selectedSeats + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="secondary-text-small text-muted-foreground">
                    Total:{' '}
                    <strong className="text-foreground">
                      ${total}/{billingCycle === 'yearly' ? 'yr' : 'mo'}
                    </strong>
                  </span>
                </div>
              </>
            )}

            {isSelected ? (
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={onDeselect}
              >
                <X className="h-4 w-4" />
                Remove from Checkout
              </Button>
            ) : (
              <Button
                className={cn('w-full gap-2 text-white', style.accent)}
                onClick={onSelect}
              >
                <Plus className="h-4 w-4" />
                Select Module
              </Button>
            )}
          </div>
        ) : (
          <p className="secondary-text-small text-muted-foreground mt-4 text-center">
            Contact sales to subscribe to this module.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Checkout Bar ────────────────────────────────────────────────

function CheckoutBar({
  totalMonthly,
  totalSeats,
  hasChanges,
  isTrial,
  isTrialExpired,
  isPending,
  onCheckout,
}: {
  totalMonthly: number;
  totalSeats: number;
  hasChanges: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  isPending: boolean;
  onCheckout: () => void;
}) {
  const ctaLabel = isTrialExpired
    ? 'Subscribe Now'
    : isTrial
      ? hasChanges
        ? 'Subscribe with Changes'
        : 'Subscribe Now'
      : 'Proceed to Payment';

  return (
    <div className="border-border bg-card/95 fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground h-4 w-4" />
            <span className="secondary-text-small text-muted-foreground">
              {totalSeats} seat{totalSeats !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="bg-border h-4 w-px" />
          <span className="primary-heading text-foreground">
            ${totalMonthly}
            <span className="text-muted-foreground font-normal">/mo</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="text-primary h-4 w-4 animate-spin" />
              <span className="secondary-text-small text-muted-foreground">
                Preparing checkout...
              </span>
            </div>
          ) : (
            <>
              <span className="secondary-text-small text-muted-foreground hidden sm:block">
                Secure payment via Stripe
              </span>
              <Button
                className="bg-primary hover:bg-primary/90 gap-2 text-white"
                onClick={onCheckout}
                disabled={isPending}
              >
                <CreditCard className="h-4 w-4" />
                {ctaLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Seat Assignments List ───────────────────────────────────────

function SeatAssignmentsList({
  workspaceId,
  productKey,
}: {
  workspaceId: string;
  productKey: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['seat-assignments', workspaceId, productKey],
    queryFn: () => getSeatAssignmentsService(workspaceId, productKey),
    enabled: !!workspaceId && !!productKey,
  });

  const assignments: SeatAssignment[] = (data?.data ?? []).filter(
    (a: SeatAssignment) => a.is_active,
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3">
        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        <span className="secondary-text-small text-muted-foreground">
          Loading...
        </span>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <p className="secondary-text-small text-muted-foreground py-2 text-center">
        No members assigned yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {assignments.map((a) => (
        <div
          key={a.id}
          className="hover:bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">
              {(a.accounts?.email?.charAt(0) ?? 'U').toUpperCase()}
            </div>
            <div>
              <p className="primary-text-medium text-foreground text-sm">
                {a.accounts?.name ?? 'User'}
              </p>
              <p className="secondary-text-small text-muted-foreground text-xs">
                {a.accounts?.email}
              </p>
            </div>
          </div>
          <Badge variant="success" className="text-[10px]">
            Active
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function monthlyTotalDisplay(total: number): boolean {
  return total > 0;
}
