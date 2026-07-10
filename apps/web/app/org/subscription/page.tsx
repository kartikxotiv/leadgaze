'use client';

import { useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
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
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { cn } from '@kit/ui/utils';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  type ModuleEntitlement,
  type SeatAssignment,
  type SubscriptionProduct,
  type WorkspaceSeat,
  cancelSubscriptionService,
  createMultiProductCheckoutService,
  getSeatAssignmentsService,
  getSubscriptionProductsService,
  getWorkspaceEntitlementsService,
  getWorkspaceSeatsService,
  updateSeatsViaStripeService,
} from '~/services/subscription.service';
import { useLocalization } from '@kit/shared/localization';

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
    accentHex: string;
    features: string[];
  }
> = {
  sales: {
    iconBg: 'bg-blue-50 dark:bg-blue-500/10',
    iconColor: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-500/10 to-indigo-500/5',
    accent: 'bg-blue-600 hover:bg-blue-700',
    accentHex: '#2563eb',
    features: [
      'Lead & contact management',
      'Sales pipeline tracking',
      'Email campaigns & templates',
    ],
  },
  hrms: {
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    gradient: 'from-violet-500/10 to-purple-500/5',
    accent: 'bg-violet-600 hover:bg-violet-700',
    accentHex: '#7c3aed',
    features: [
      'Employee directory',
      'Attendance & leave tracking',
      'Payroll management',
    ],
  },
  inventory: {
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'from-emerald-500/10 to-green-500/5',
    accent: 'bg-emerald-600 hover:bg-emerald-700',
    accentHex: '#059669',
    features: [
      'Product catalog',
      'Stock management',
      'Purchase & sales orders',
    ],
  },
  service_cloud: {
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-500/10 to-orange-500/5',
    accent: 'bg-amber-600 hover:bg-amber-700',
    accentHex: '#d97706',
    features: ['Ticket management', 'Shared inbox', 'SLA tracking'],
  },
  funds: {
    iconBg: 'bg-teal-50 dark:bg-teal-500/10',
    iconColor: 'text-teal-600 dark:text-teal-400',
    gradient: 'from-teal-500/10 to-cyan-500/5',
    accent: 'bg-teal-600 hover:bg-teal-700',
    accentHex: '#0d9488',
    features: ['Investor CRM', 'Deal pipeline', 'Fundraise tracking'],
  },
};

function getProductStyle(key: string) {
  return (
    PRODUCT_STYLES[key] ?? {
      iconBg: 'bg-slate-50 dark:bg-slate-500/10',
      iconColor: 'text-slate-600 dark:text-slate-400',
      gradient: 'from-slate-500/10 to-gray-500/5',
      accent: 'bg-slate-600 hover:bg-slate-700',
      accentHex: '#475569',
      features: [],
    }
  );
}

// ─── Main Page ───────────────────────────────────────────────────

function getPriceAndCurrency(
  product: {
    monthly_price_per_seat?: number | null;
    yearly_price_per_seat?: number | null;
    india_monthly_price_per_seat?: number | null;
    india_yearly_price_per_seat?: number | null;
  } | null | undefined,
  billingCountry: string | null | undefined,
  billingCycle: 'monthly' | 'yearly',
) {
  if (!product) return { price: 0, currencySymbol: '$' };
  const isIndia = billingCountry === 'IN' || billingCountry?.toLowerCase() === 'india';
  const price = isIndia
    ? billingCycle === 'yearly'
      ? (product.india_yearly_price_per_seat ?? 0)
      : (product.india_monthly_price_per_seat ?? 0)
    : billingCycle === 'yearly'
      ? (product.yearly_price_per_seat ?? 0)
      : (product.monthly_price_per_seat ?? 0);
  return { price, currencySymbol: isIndia ? '₹' : '$' };
}

export default function OrgSubscriptionPage({
  canManageSubscription: canManageSubscriptionProp,
}: {
  canManageSubscription?: boolean;
} = {}) {
  const { currentWorkspace, canAccess, isLoading: isRbacLoading } = useRBAC();
  const workspaceId = currentWorkspace?.id ?? '';
  const canViewSubscription = canAccess('subscription', 'view');
  const canManageSubscription =
    canManageSubscriptionProp ?? canAccess('subscription', 'manage');
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [pendingChanges, setPendingChanges] = useState<Record<string, number>>(
    {},
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly',
  );
  const [availableSelections, setAvailableSelections] = useState<
    Record<string, number>
  >({});
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [removeModuleDialog, setRemoveModuleDialog] = useState<{
    open: boolean;
    productKey: string;
    displayName: string;
  }>({ open: false, productKey: '', displayName: '' });
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
  const [isDirectUpdating, setIsDirectUpdating] = useState(false);

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
      queryClient.invalidateQueries({
        queryKey: ['user-seat-assignments', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace-entitlements', workspaceId],
      });
      window.history.replaceState({}, '', '/org/subscription');
    } else if (checkout === 'cancel') {
      toast.error('Checkout was cancelled.');
      window.history.replaceState({}, '', '/org/subscription');
    }
  }, [searchParams, workspaceId, queryClient]);
  const { formatDate } = useLocalization();

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

  const billingCountry = currentWorkspace?.billing_country;
  const currencySymbol = billingCountry === 'IN' || billingCountry?.toLowerCase() === 'india' ? '₹' : '$';

  // Fetch workspace entitlements (free access grants)
  const { data: entitlementsData } = useQuery({
    queryKey: ['workspace-entitlements', workspaceId],
    queryFn: () => getWorkspaceEntitlementsService(workspaceId),
    enabled: !!workspaceId,
  });

  const products = useMemo<SubscriptionProduct[]>(
    () => productsData?.data ?? [],
    [productsData?.data],
  );
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

  // Detect existing billing cycle from user's active subscription
  const existingBillingCycle: 'monthly' | 'yearly' | null = useMemo(() => {
    if (!isPaid) return null;
    // Check first paid seat's billing_cycle
    const paidSeat = seats.find(
      (s) =>
        s.billing_cycle &&
        s.status === 'active' &&
        !s.provider_subscription_id?.startsWith('trial_sub_'),
    );
    if (paidSeat) {
      const cycle = paidSeat.billing_cycle?.toLowerCase();
      if (cycle === 'yearly' || cycle === 'year') return 'yearly';
      if (cycle === 'monthly' || cycle === 'month') return 'monthly';
    }
    // Fallback to subscription status
    const subCycle =
      subscriptionStatus?.subscription?.billing_cycle?.toLowerCase();
    if (subCycle === 'yearly' || subCycle === 'year') return 'yearly';
    if (subCycle === 'monthly' || subCycle === 'month') return 'monthly';
    return null;
  }, [isPaid, seats, subscriptionStatus]);

  // Lock billing cycle to match existing subscription (can't switch between monthly/yearly)
  useEffect(() => {
    if (existingBillingCycle && billingCycle !== existingBillingCycle) {
      setBillingCycle(existingBillingCycle);
    }
  }, [existingBillingCycle, billingCycle]);

  const subscribedProductIds = useMemo(
    () => new Set(seats.map((s) => s.product_id)),
    [seats],
  );

  // Entitlement-based modules (free access without paid subscription)
  const entitledModules = useMemo(() => {
    const entitlements = (entitlementsData?.data ?? []) as ModuleEntitlement[];
    const now = new Date();
    return entitlements
      .filter(
        (e) => e.is_active && (!e.valid_until || new Date(e.valid_until) > now),
      )
      .map((e) => ({
        ...e,
        product: products.find((p) => p.id === e.product_id),
      }))
      .filter((e) => e.product && !subscribedProductIds.has(e.product_id));
  }, [entitlementsData, products, subscribedProductIds]);

  // Product IDs that already have entitlements (to hide from available modules)
  const entitledProductIds = useMemo(
    () => new Set(entitledModules.map((e) => e.product_id)),
    [entitledModules],
  );

  const availableProducts = products.filter(
    (p) => !subscribedProductIds.has(p.id) && !entitledProductIds.has(p.id),
  );

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

  const { totalMonthly, totalSeats, changedItems, selectedNewItems } =
    useMemo(() => {
      let monthly = 0;
      let seatsTotal = 0;
      const changed: Array<{ productKey: string; seats: number }> = [];

      for (const seat of seats) {
        const pending = pendingChanges[seat.product_id] ?? seat.seats_purchased;
        const product = seat.subscription_products;
        if (product) {
          const { price } = getPriceAndCurrency(product, billingCountry, billingCycle);
          monthly += price * pending;
          seatsTotal += pending;
          if (pending !== seat.seats_purchased) {
            changed.push({ productKey: product.product_key, seats: pending });
          }
        }
      }

      const newItems: Array<{ productKey: string; seats: number }> = [];
      for (const [productKey, seatCount] of Object.entries(
        availableSelections,
      )) {
        const product = products.find((p) => p.product_key === productKey);
        if (product) {
          const { price } = getPriceAndCurrency(product, billingCountry, billingCycle);
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
    }, [seats, pendingChanges, availableSelections, products, billingCycle]);

  const trialDaysRemaining = subscriptionStatus?.trial_days_remaining ?? null;
  const isTrialExpired = subscriptionStatus?.is_trial_expired ?? false;

  const checkoutMutation = useMutation({
    mutationFn: () => {
      if (!canManageSubscription) {
        throw new Error('You do not have permission to manage subscriptions.');
      }

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
        queryClient.invalidateQueries({
          queryKey: ['workspace-subscription', workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ['user-seat-assignments', workspaceId],
        });
        queryClient.invalidateQueries({
          queryKey: ['workspace-entitlements', workspaceId],
        });
      }
    },
    onError: (err: unknown) => {
      toast.error((err as Error)?.message || 'Failed to create checkout');
    },
  });

  const handleDirectUpdate = async (seatId: string, newQuantity: number) => {
    if (!canManageSubscription) {
      toast.error('You do not have permission to manage subscriptions.');
      return;
    }

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

  const requestSeatUpdate = (seat: WorkspaceSeat, newQuantity: number) => {
    if (!canManageSubscription) return;

    setSeatUpdateDialog({
      open: true,
      seatId: seat.id,
      displayName: seat.subscription_products?.display_name ?? 'Module',
      currentSeats: seat.seats_purchased,
      newSeats: newQuantity,
    });
  };

  const updatePending = (productId: string, seats: number) => {
    if (!canManageSubscription) return;

    setPendingChanges((prev) => ({ ...prev, [productId]: seats }));
  };

  const hasChanges = changedItems.length > 0 || selectedNewItems.length > 0;

  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!canManageSubscription) {
        throw new Error('You do not have permission to manage subscriptions.');
      }

      return cancelSubscriptionService({ workspaceId });
    },
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

  const removeModuleMutation = useMutation({
    mutationFn: (productKey: string) => {
      if (!canManageSubscription) {
        throw new Error('You do not have permission to manage subscriptions.');
      }

      return cancelSubscriptionService({ workspaceId, productKey });
    },
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

  if (isRbacLoading) {
    return null;
  }

  if (!canViewSubscription) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          You do not have permission to view billing.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Billing cycle toggle — only for trial/new users, not existing subscribers */}
      {!existingBillingCycle && canManageSubscription && (
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm font-medium">
            Billing Cycle
          </span>
          <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            {(['monthly', 'yearly'] as const).map((cycle) => (
              <Button
                key={cycle}
                type="button"
                variant={billingCycle === cycle ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'gap-1.5 rounded-none border-y-0 first:rounded-l-md first:border-l last:rounded-r-md last:border-r',
                  billingCycle === cycle
                    ? ''
                    : 'bg-background text-muted-foreground hover:bg-muted',
                )}
                onClick={() => setBillingCycle(cycle)}
              >
                {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                {cycle === 'yearly' && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'ml-1 px-1.5 py-0 text-[10px] font-semibold',
                      billingCycle === 'yearly'
                        ? 'bg-white/20 text-white'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                    )}
                  >
                    -10%
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}
      {/* Trial Banner */}
      {(isTrial || isTrialExpired) && (
        <TrialBanner
          trialDaysRemaining={trialDaysRemaining}
          isExpired={isTrialExpired}
        />
      )}

      {/* Quick stats */}
      <div className="flex flex-wrap items-center gap-5">
        <div className="flex items-center gap-2">
          <Package className="text-primary h-4 w-4" />
          <span className="text-muted-foreground text-sm">Active modules</span>
          <span className="text-foreground text-sm font-bold">
            {seats.length}
          </span>
        </div>
        <div className="bg-border h-4 w-px" />
        <div className="flex items-center gap-2">
          <Users className="text-primary h-4 w-4" />
          <span className="text-muted-foreground text-sm">Total seats</span>
          <span className="text-foreground text-sm font-bold">
            {totalSeats}
          </span>
        </div>
      </div>

      {/* Active Subscriptions — Table layout */}
      {seats.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-lg">Your Modules</CardTitle>
            <span className="text-muted-foreground text-sm">
              {seats.length} module{seats.length !== 1 ? 's' : ''}
              {isTrial && ' (Trial)'}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Price / Seat</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seats.map((seat) => (
                  <ActiveModuleRow
                    billingCountry={billingCountry}
                    key={seat.id}
                    seat={seat}
                    workspaceId={workspaceId}
                    isPaid={isPaid}
                    isTrial={isTrial}
                    pendingSeats={
                      pendingChanges[seat.product_id] ?? seat.seats_purchased
                    }
                    billingCycle={billingCycle}
                    canManageSubscription={canManageSubscription}
                    onPendingChange={(count) =>
                      updatePending(seat.product_id, count)
                    }
                    onDirectUpdate={(count) => requestSeatUpdate(seat, count)}
                    onRemove={() => {
                      if (!canManageSubscription) return;

                      setRemoveModuleDialog({
                        open: true,
                        productKey:
                          seat.subscription_products?.product_key ?? '',
                        displayName:
                          seat.subscription_products?.display_name ?? 'Module',
                      });
                    }}
                  />
                ))}
              </TableBody>
            </Table>

            {/* Pricing breakdown rows */}
            {seats.map((seat) => {
              const product = seat.subscription_products;
              const { price: pricePerSeat, currencySymbol } = getPriceAndCurrency(product, billingCountry, billingCycle);
              const pending =
                pendingChanges[seat.product_id] ?? seat.seats_purchased;
              const displaySeats = isPaid ? seat.seats_purchased : pending;
              const style = getProductStyle(product?.product_key ?? '');

              if (!pricePerSeat) return null;

              return (
                <PricingBreakdownRow currencySymbol={currencySymbol} key={`breakdown-${seat.id}`}
                  seat={seat}
                  workspaceId={workspaceId}
                  pricePerSeat={Number(pricePerSeat)}
                  displaySeats={displaySeats}
                  billingCycle={billingCycle}
                  accentColor={style.accentHex}
                />
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Entitlement-based Modules (free access grants) */}
      {entitledModules.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-lg">Entitled Modules</CardTitle>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            >
              Free Access
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Valid Until</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entitledModules.map((ent) => {
                  const product = ent.product;
                  const style = getProductStyle(product?.product_key ?? '');
                  const icon = PRODUCT_ICONS[product?.product_key ?? ''] ?? (
                    <Package className="h-5 w-5" />
                  );

                  return (
                    <TableRow
                      key={ent.product_id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex h-9 w-9 items-center justify-center rounded-lg',
                              style.iconBg,
                              style.iconColor,
                            )}
                          >
                            {icon}
                          </div>
                          <div>
                            <p className="text-foreground text-sm font-semibold">
                              {product?.display_name ?? 'Module'}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Via entitlement
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-purple-100 text-purple-700 capitalize dark:bg-purple-900/30 dark:text-purple-400"
                        >
                          {ent.entitlement_type.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {ent.granted_seats
                            ? `${ent.granted_seats} seats`
                            : 'Unlimited'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {ent.valid_until
                            ? formatDate(ent.valid_until)
                            : 'Never expires'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Available Products */}
      {availableProducts.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-foreground text-lg font-bold">
                Available Modules
              </h2>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Add modules to expand your workspace capabilities
              </p>
            </div>
            <Badge
              variant="secondary"
              className="gap-1.5 text-green-700 dark:text-green-400"
            >
              <Check className="h-3 w-3" />
              {availableProducts.length} available
            </Badge>
          </div>

          {productsLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="text-primary h-6 w-6 animate-spin" />
              <p className="text-muted-foreground mt-3 text-sm">
                Loading modules...
              </p>
            </div>
          ) : (
            <div className="grid gap-4 px-1 sm:grid-cols-2 lg:grid-cols-3">
              {availableProducts.map((product) => (
                <AvailableModuleCard billingCountry={billingCountry} key={product.id}
                  product={product}
                  billingCycle={billingCycle}
                  canManageSubscription={canManageSubscription}
                  isSelected={product.product_key in availableSelections}
                  selectedSeats={availableSelections[product.product_key] ?? 1}
                  onSelect={() => {
                    if (!canManageSubscription) return;

                    setAvailableSelections((prev) => ({
                      ...prev,
                      [product.product_key]: 1,
                    }));
                  }}
                  onDeselect={() => {
                    if (!canManageSubscription) return;

                    setAvailableSelections((prev) => {
                      const next = { ...prev };
                      delete next[product.product_key];
                      return next;
                    });
                  }}
                  onSeatsChange={(seats) => {
                    if (!canManageSubscription) return;

                    setAvailableSelections((prev) => ({
                      ...prev,
                      [product.product_key]: seats,
                    }));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Checkout Bar */}
      {canManageSubscription &&
        (((!isPaid || isTrial) && seats.length > 0) ||
          selectedNewItems.length > 0) && (
          <CheckoutBar
            currencySymbol={currencySymbol}
            totalMonthly={totalMonthly}
            totalSeats={totalSeats}
            billingCycle={billingCycle}
            hasChanges={hasChanges}
            isTrial={isTrial}
            isTrialExpired={isTrialExpired}
            isPending={checkoutMutation.isPending}
            onCheckout={() => checkoutMutation.mutate()}
            isPaid={isPaid}
          />
        )}

      {/* Cancel Subscription Section (only for paid subscriptions) */}
      {canManageSubscription && isPaid && seats.length > 0 && (
        <Card className="border-destructive/20">
          <CardContent className="flex flex-col md:flex-row items-center justify-between p-6">
            <div className="flex items-start gap-3 mb-2">
              <div className="bg-destructive/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <AlertTriangle className="text-destructive h-4 w-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-destructive font-semibold">
                  Cancel Subscription
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Cancelling will revoke access to all modules at the end of your
                  current billing period. This action cannot be undone.
                </p>
              </div>
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
          </CardContent>
        </Card>
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
          <DialogFooter className="mt-auto gap-2 border-t p-6 sm:gap-0">
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
              disabled={!canManageSubscription || isDirectUpdating}
              onClick={async () => {
                if (!canManageSubscription) return;
                setIsDirectUpdating(true);
                try {
                  await handleDirectUpdate(
                    seatUpdateDialog.seatId,
                    seatUpdateDialog.newSeats,
                  );
                } finally {
                  setIsDirectUpdating(false);
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
              {isDirectUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                        Billing &amp; Access
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
          <DialogFooter className="mt-auto gap-2 border-t p-6 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending || !canManageSubscription}
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
          <DialogFooter className="mt-auto gap-2 border-t p-6 sm:gap-0">
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
              disabled={
                removeModuleMutation.isPending || !canManageSubscription
              }
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
      <Card className="border-destructive/30">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="bg-destructive/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <AlertTriangle className="text-destructive h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-destructive font-semibold">Trial Expired</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Your 7-day trial has ended. Subscribe now to keep access to all
              modules and continue using Leadgaze without interruption.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            {trialDaysRemaining != null
              ? `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} left in your trial`
              : 'Trial active'}
          </p>
          <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-400">
            You have full access to all modules during your trial. Subscribe now
            to keep your access.
          </p>
        </div>
        <Badge className="shrink-0 bg-amber-500 text-white">Trial</Badge>
      </CardContent>
    </Card>
  );
}

// ─── Active Module Row (Table row layout) ────────────────────────

function ActiveModuleRow({
  seat,
  isPaid,
  isTrial,
  pendingSeats,
  billingCycle,
  canManageSubscription,
  onPendingChange,
  onDirectUpdate,
  onRemove,
  billingCountry,
}: {
  seat: WorkspaceSeat;
  workspaceId: string;
  isPaid: boolean;
  isTrial: boolean;
  pendingSeats: number;
  billingCycle: 'monthly' | 'yearly';
  canManageSubscription: boolean;
  onPendingChange: (count: number) => void;
  onDirectUpdate: (count: number) => void;
  onRemove: () => void;
  billingCountry?: string | null;
}) {
  const [updating, setUpdating] = useState(false);
  const product = seat.subscription_products;
  const style = getProductStyle(product?.product_key ?? '');
  const icon = PRODUCT_ICONS[product?.product_key ?? ''] ?? (
    <Package className="h-5 w-5" />
  );

  const displaySeats = isPaid ? seat.seats_purchased : pendingSeats;

  const { price: pricePerSeat, currencySymbol } = getPriceAndCurrency(product, billingCountry, billingCycle);
  const total = pricePerSeat ? Number(pricePerSeat) * displaySeats : 0;

  const handleIncrement = async () => {
    if (!canManageSubscription) return;

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
    if (!canManageSubscription) return;

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

  return (
    <TableRow className="hover:bg-muted/50">
      {/* Module name + icon */}
      <TableCell className="p-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              style.iconBg,
              style.iconColor,
            )}
          >
            {icon}
          </div>
          <div>
            <p className="text-foreground text-sm font-semibold">
              {product?.display_name ?? 'Module'}
            </p>
            <p className="text-muted-foreground text-xs">
              {seat.seats_used}/{seat.seats_purchased} used
            </p>
          </div>
        </div>
      </TableCell>

      {/* Status badge */}
      <TableCell>
        <Badge
          variant="secondary"
          className={cn(
            seat.status === 'trialing'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
              : seat.status === 'active'
                ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
          )}
        >
          {statusLabel}
        </Badge>
      </TableCell>

      {/* Seat adjuster */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={!canManageSubscription || displaySeats <= 1 || updating}
            onClick={handleDecrement}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-foreground w-6 text-center text-sm font-semibold">
            {displaySeats}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            disabled={!canManageSubscription || updating}
            onClick={handleIncrement}
          >
            <Plus className="h-3 w-3" />
          </Button>
          {updating && (
            <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
          )}
        </div>
      </TableCell>

      {/* Price per seat */}
      <TableCell className="text-foreground text-sm whitespace-nowrap">
        {pricePerSeat ? (
          <>
            <span className="font-semibold">{currencySymbol}{pricePerSeat}</span>
            <span className="text-muted-foreground text-xs">
              /{billingCycle === 'yearly' ? 'yr' : 'mo'}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>

      {/* Total + Remove */}
      <TableCell>
        <div className="flex items-center justify-between">
          <div className="text-foreground text-sm whitespace-nowrap">
            {pricePerSeat ? (
              <>
                <span className="font-semibold">{currencySymbol}{total}</span>
                <span className="text-muted-foreground text-xs">
                  /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                </span>
              </>
            ) : null}
          </div>
          {canManageSubscription && seat.seats_used <= 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/80 h-auto px-2 py-1 text-xs"
              onClick={onRemove}
            >
              Remove
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Pricing Breakdown Row ────────────────────────────────────────

function PricingBreakdownRow({
  seat,
  workspaceId,
  pricePerSeat,
  displaySeats,
  billingCycle,
  accentColor,
  currencySymbol,
}: {
  seat: WorkspaceSeat;
  workspaceId: string;
  pricePerSeat: number;
  displaySeats: number;
  billingCycle: 'monthly' | 'yearly';
  accentColor: string;
  currencySymbol?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const period = billingCycle === 'yearly' ? 'yr' : 'mo';

  return (
    <div className="bg-muted/30 border-t">
      <div className="flex items-center justify-between px-5 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: accentColor }}
          >
            {currencySymbol}{pricePerSeat}/seat/{period}
          </span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-muted-foreground text-xs">
            {displaySeats} seat{displaySeats !== 1 ? 's' : ''} × {currencySymbol}{pricePerSeat}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto gap-1 px-2 py-1 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          View members
          {expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </div>

      {expanded && (
        <div className="border-t px-5 pt-2 pb-3">
          <SeatAssignmentsList
            workspaceId={workspaceId}
            productKey={seat.subscription_products?.product_key ?? ''}
          />
        </div>
      )}
    </div>
  );
}

// ─── Available Module Card ───────────────────────────────────────

function AvailableModuleCard({
  product,
  billingCycle,
  canManageSubscription,
  isSelected,
  selectedSeats,
  onSelect,
  onDeselect,
  onSeatsChange,
  billingCountry,
}: {
  product: SubscriptionProduct;
  billingCycle: 'monthly' | 'yearly';
  canManageSubscription: boolean;
  isSelected: boolean;
  selectedSeats: number;
  onSelect: () => void;
  onDeselect: () => void;
  onSeatsChange: (seats: number) => void;
  billingCountry?: string | null;
}) {
  const style = getProductStyle(product.product_key);
  const icon = PRODUCT_ICONS[product.product_key] ?? (
    <Package className="h-5 w-5" />
  );

  const { price: pricePerSeat, currencySymbol } = getPriceAndCurrency(
    product,
    billingCountry,
    billingCycle,
  );

  const period = billingCycle === 'yearly' ? 'yr' : 'mo';

  return (
    <Card
      className={cn(
        'flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md',
        isSelected && 'ring-primary ring-2',
      )}
    >
      <CardContent className="flex flex-1 flex-col p-5">
        {/* Icon + available badge */}
        <div className="flex items-start justify-between">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl',
              style.iconBg,
              style.iconColor,
            )}
          >
            {icon}
          </div>
          <Badge
            variant="secondary"
            className={cn(
              isSelected
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            )}
          >
            {isSelected ? 'Selected' : 'Available'}
          </Badge>
        </div>

        {/* Name + description */}
        <div className="mt-4 flex-1">
          <h3 className="text-foreground font-semibold">
            {product.display_name}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {product.description}
          </p>
        </div>

        {/* Price */}
        <div className="mt-4">
          {pricePerSeat ? (
            <div className="flex items-baseline gap-0.5">
              <span className="text-foreground text-2xl font-bold">
                {currencySymbol}{pricePerSeat}
              </span>
              <span className="text-muted-foreground text-sm">
                /seat/{period}
              </span>
            </div>
          ) : (
            <span className="text-foreground font-medium">Contact sales</span>
          )}
        </div>

        {/* Features */}
        {style.features.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {style.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <Check
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: style.accentHex }}
                />
                <span className="text-foreground text-sm">{feature}</span>
              </div>
            ))}
          </div>
        )}

        {/* Seat selector + action button */}
        {pricePerSeat ? (
          <div className="mt-4 space-y-3">
            {isSelected && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Seats</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!canManageSubscription || selectedSeats <= 1}
                    onClick={() =>
                      onSeatsChange(Math.max(1, selectedSeats - 1))
                    }
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-foreground w-6 text-center text-sm font-bold">
                    {selectedSeats}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!canManageSubscription}
                    onClick={() => onSeatsChange(selectedSeats + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {isSelected ? (
              <Button
                type="button"
                variant="destructive"
                className="w-full gap-2"
                disabled={!canManageSubscription}
                onClick={onDeselect}
              >
                <X className="h-4 w-4" />
                Remove from Checkout
              </Button>
            ) : (
              <Button
                type="button"
                className="w-full gap-2"
                style={{ backgroundColor: style.accentHex }}
                disabled={!canManageSubscription}
                onClick={onSelect}
              >
                <Plus className="h-4 w-4" />
                Select Module
              </Button>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground mt-4 text-center text-sm">
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
  billingCycle,
  hasChanges,
  isTrial,
  isTrialExpired,
  isPending,
  onCheckout,
  currencySymbol,
  isPaid,
}: {
  totalMonthly: number;
  totalSeats: number;
  billingCycle: 'monthly' | 'yearly';
  hasChanges: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  isPending: boolean;
  onCheckout: () => void;
  currencySymbol?: string;
  isPaid: boolean;
}) {
  const ctaLabel = isTrialExpired
    ? 'Subscribe Now'
    : isTrial
      ? hasChanges
        ? 'Subscribe with Changes'
        : 'Subscribe Now'
      : 'Proceed to Payment';

  const periodLabel = billingCycle === 'yearly' ? 'New Yearly Total' : 'New Monthly Total';
  const normalPeriodLabel = billingCycle === 'yearly' ? 'Total Yearly' : 'Total Monthly';

  return (
    <Card className="sticky bottom-0 z-10 border-t shadow-lg">
      <CardContent className="flex h-16 items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground text-sm">
              {totalSeats} seat{totalSeats !== 1 ? 's' : ''}
            </span>
          </div>
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-muted-foreground text-sm">
            Secure payment via Stripe
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end mr-2">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">
              {isPaid ? periodLabel : normalPeriodLabel}
            </span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-foreground text-xl font-bold">
                {currencySymbol}{totalMonthly}
              </span>
              <span className="text-muted-foreground text-sm">
                {billingCycle === 'yearly' ? '/yr' : '/mo'}
              </span>
            </div>
          </div>

          {isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="text-primary h-4 w-4 animate-spin" />
              <span className="text-muted-foreground text-sm">
                Preparing checkout...
              </span>
            </div>
          ) : (
            <Button onClick={onCheckout} disabled={isPending} className="gap-2">
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
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
        <span className="text-muted-foreground text-sm">Loading...</span>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-center text-sm">
        No members assigned yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {assignments.map((a) => (
        <div
          key={a.id}
          className="hover:bg-muted/50 flex items-center justify-between rounded-lg px-2 py-2 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold">
              {(a.accounts?.email?.charAt(0) ?? 'U').toUpperCase()}
            </div>
            <div>
              <p className="text-foreground text-sm font-medium">
                {a.accounts?.name ?? 'User'}
              </p>
              <p className="text-muted-foreground text-xs">
                {a.accounts?.email}
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          >
            Active
          </Badge>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────
