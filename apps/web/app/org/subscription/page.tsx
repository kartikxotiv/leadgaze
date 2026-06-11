'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  DollarSign,
  Headphones,
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

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
  getSeatAssignmentsService,
  getSubscriptionProductsService,
  getWorkspaceSeatsService,
  subscribeToProductService,
  updateSeatCountService,
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
      'Custom fields & views',
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
      'Document management',
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
      'Supplier management',
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
      'Customer satisfaction',
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
      'Reporting & analytics',
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
  const seats: WorkspaceSeat[] = seatsData?.data ?? [];

  const subscribedProductIds = useMemo(
    () => new Set(seats.map((s) => s.product_id)),
    [seats],
  );

  const availableProducts = products.filter(
    (p) => !subscribedProductIds.has(p.id),
  );

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-border bg-card/80 sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <AppLogo href={null} collapsed />
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-semibold">
                Leadgaze
              </span>
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
        <div className="mx-auto max-w-6xl px-6 py-10">
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
            Manage your active modules, seat allocations, and billing. Add new
            modules to unlock more capabilities.
          </p>

          {/* Quick stats */}
          <div className="mt-6 flex flex-wrap gap-4">
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
                {seats.reduce((sum, s) => sum + s.seats_purchased, 0)}
              </span>
            </div>
            <div className="border-border bg-card flex items-center gap-2 rounded-full border px-4 py-2">
              <Zap className="text-primary h-4 w-4" />
              <span className="secondary-text-small text-muted-foreground">
                Available modules
              </span>
              <span className="primary-text-medium text-foreground font-bold">
                {availableProducts.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl space-y-10 px-6 py-8">
        {/* Active Subscriptions */}
        {seats.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="primary-heading text-foreground">
                Active Subscriptions
              </h2>
              <Badge variant="secondary" className="text-xs">
                {seats.length} module{seats.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="space-y-2">
              {seats.map((seat) => (
                <ActiveSubscriptionCard
                  key={seat.id}
                  seat={seat}
                  workspaceId={workspaceId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Available Products */}
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
            {availableProducts.length > 0 && (
              <Badge variant="info" className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                {availableProducts.length} available
              </Badge>
            )}
          </div>
          {productsLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="text-primary h-6 w-6 animate-spin" />
              <p className="secondary-text-small text-muted-foreground mt-3">
                Loading modules...
              </p>
            </div>
          ) : availableProducts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="bg-primary/10 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                  <Check className="text-primary h-6 w-6" />
                </div>
                <p className="primary-heading text-foreground">
                  All modules subscribed
                </p>
                <p className="secondary-text-small text-muted-foreground mt-1">
                  You have access to every Leadgaze module.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  workspaceId={workspaceId}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Active Subscription Card ────────────────────────────────────

function ActiveSubscriptionCard({
  seat,
  workspaceId,
}: {
  seat: WorkspaceSeat;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const product = seat.subscription_products;
  const style = getProductStyle(product?.product_key ?? '');
  const icon = PRODUCT_ICONS[product?.product_key ?? ''] ?? (
    <Package className="h-5 w-5" />
  );

  const seatPercent =
    seat.seats_purchased > 0
      ? Math.min(
          100,
          Math.round((seat.seats_used / seat.seats_purchased) * 100),
        )
      : 0;

  const monthlyPrice = product?.monthly_price_per_seat;
  const monthlyTotal = monthlyPrice ? monthlyPrice * seat.seats_purchased : 0;

  const updateMutation = useMutation({
    mutationFn: (newCount: number) => updateSeatCountService(seat.id, newCount),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-seats', workspaceId],
      });
      toast.success('Seat count updated');
    },
    onError: (err: unknown) =>
      toast.error((err as Error)?.message || 'Failed to update seats'),
  });

  return (
    <Card className="overflow-hidden">
      {/* Summary row */}
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-lg',
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
                <Badge
                  variant={seat.status === 'active' ? 'success' : 'warning'}
                  className="text-[10px]"
                >
                  {seat.status}
                </Badge>
                <span className="secondary-text-small text-muted-foreground">
                  {seat.seats_used}/{seat.seats_purchased} seats &middot;{' '}
                  <span className="capitalize">{seat.billing_cycle}</span>
                </span>
                {monthlyPrice && (
                  <span className="secondary-text-small text-foreground font-medium">
                    ${monthlyTotal}/
                    {seat.billing_cycle === 'yearly' ? 'yr' : 'mo'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={seat.seats_purchased <= 1 || updateMutation.isPending}
              onClick={() => updateMutation.mutate(seat.seats_purchased - 1)}
            >
              <Minus className="h-3 w-3" />
              <span className="hidden sm:inline">Seat</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate(seat.seats_purchased + 1)}
            >
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Seat</span>
            </Button>
            <div className="bg-border mx-1 h-6 w-px" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide' : 'View'} seats
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Seat usage bar */}
        <div className="px-5 pb-4">
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

        {/* Expanded seat assignments */}
        {expanded && (
          <div className="border-border bg-muted/20 border-t px-5 py-4">
            <div className="mb-3">
              <p className="primary-text-medium text-foreground">
                Assigned Members
              </p>
              <p className="secondary-text-small text-muted-foreground mt-0.5">
                Seats are automatically assigned when members join and revoked
                when they are removed.
              </p>
            </div>
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
      <p className="secondary-text-small text-muted-foreground py-4 text-center">
        No members assigned yet. Seats will be assigned automatically when
        members join.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {assignments.map((a) => (
        <div
          key={a.id}
          className="hover:bg-muted/50 flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold">
              {(a.accounts?.email?.charAt(0) ?? 'U').toUpperCase()}
            </div>
            <div>
              <p className="primary-text-medium text-foreground">
                {a.accounts?.name ?? 'User'}
              </p>
              <p className="secondary-text-small text-muted-foreground">
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

// ─── Product Card (unsubscribed) ─────────────────────────────────

function ProductCard({
  product,
  workspaceId,
}: {
  product: SubscriptionProduct;
  workspaceId: string;
}) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const style = getProductStyle(product.product_key);
  const icon = PRODUCT_ICONS[product.product_key] ?? (
    <Package className="h-5 w-5" />
  );

  return (
    <>
      <Card className="group flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md">
        {/* Top gradient accent */}
        <div
          className={cn(
            'h-1 bg-gradient-to-r',
            style.gradient.replace('/10', '/60').replace('/5', '/30'),
          )}
        />
        <CardContent className="flex flex-1 flex-col p-5">
          {/* Header */}
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
            <Badge variant="info" className="text-[10px]">
              Available
            </Badge>
          </div>

          {/* Product info */}
          <div className="mt-4 flex-1">
            <h3 className="primary-heading text-foreground">
              {product.display_name}
            </h3>
            <p className="secondary-text-small text-muted-foreground mt-1">
              {product.description}
            </p>
          </div>

          {/* Pricing */}
          <div className="border-border bg-muted/30 mt-4 rounded-lg border p-3">
            <div className="flex items-baseline gap-1">
              {product.monthly_price_per_seat ? (
                <>
                  <span className="text-foreground text-2xl font-bold">
                    ${product.monthly_price_per_seat}
                  </span>
                  <span className="secondary-text-small text-muted-foreground">
                    /seat/mo
                  </span>
                </>
              ) : (
                <span className="primary-text-medium text-foreground">
                  Contact sales
                </span>
              )}
            </div>
            {product.yearly_price_per_seat && (
              <p className="secondary-text-small text-muted-foreground mt-1">
                ${product.yearly_price_per_seat}/seat/yr &middot;{' '}
                <span className="text-primary font-medium">Save annually</span>
              </p>
            )}
          </div>

          {/* Features */}
          {style.features.length > 0 && (
            <div className="mt-4 space-y-2">
              {style.features.slice(0, 4).map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="text-primary h-3.5 w-3.5 shrink-0" />
                  <span className="secondary-text-small text-foreground">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <Button
            className={cn('mt-5 w-full gap-2 text-white', style.accent)}
            onClick={() => setCheckoutOpen(true)}
          >
            <CreditCard className="h-4 w-4" />
            Subscribe Now
          </Button>
        </CardContent>
      </Card>

      {checkoutOpen && (
        <CheckoutModal
          product={product}
          workspaceId={workspaceId}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
        />
      )}
    </>
  );
}

// ─── Checkout Modal ──────────────────────────────────────────────

function CheckoutModal({
  product,
  workspaceId,
  open,
  onOpenChange,
}: {
  product: SubscriptionProduct;
  workspaceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [seats, setSeats] = useState(product.min_seats);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly',
  );
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');

  const style = getProductStyle(product.product_key);
  const pricePerSeat =
    billingCycle === 'yearly'
      ? product.yearly_price_per_seat
      : product.monthly_price_per_seat;
  const total = pricePerSeat ? Number(pricePerSeat) * seats : 0;

  const yearlyTotal = product.yearly_price_per_seat
    ? Number(product.yearly_price_per_seat) * seats
    : 0;
  const monthlyEquiv = yearlyTotal ? Math.round(yearlyTotal / 12) : 0;
  const savings =
    monthlyEquiv && product.monthly_price_per_seat
      ? Math.round(
          (1 -
            monthlyEquiv / (Number(product.monthly_price_per_seat) * seats)) *
            100,
        )
      : 0;

  const subscribeMutation = useMutation({
    mutationFn: () =>
      subscribeToProductService({
        workspaceId,
        productKey: product.product_key,
        seats,
        billingCycle,
      }),
    onSuccess: () => {
      setStep('success');
      queryClient.invalidateQueries({
        queryKey: ['workspace-seats', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace-subscription', workspaceId],
      });
      toast.success(`Subscribed to ${product.display_name}!`);
    },
    onError: (err: unknown) => {
      toast.error((err as Error)?.message || 'Checkout failed');
      setStep('form');
    },
  });

  const handleCheckout = () => {
    setStep('processing');
    setTimeout(() => {
      subscribeMutation.mutate();
    }, 1200);
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep('form');
    setSeats(product.min_seats);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === 'success' ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="bg-primary/10 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
              <Check className="text-primary h-7 w-7" />
            </div>
            <DialogTitle className="text-lg">Subscription Active!</DialogTitle>
            <DialogDescription className="mt-2">
              {product.display_name} is now active with {seats} seat
              {seats !== 1 ? 's' : ''}. Seats will be automatically assigned
              when team members join.
            </DialogDescription>
            <Button className="mt-6" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : step === 'processing' ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Loader2 className="text-primary mb-4 h-8 w-8 animate-spin" />
            <DialogTitle className="text-lg">Processing...</DialogTitle>
            <DialogDescription className="mt-1">
              Activating your subscription. Please wait.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    style.iconBg,
                    style.iconColor,
                  )}
                >
                  {PRODUCT_ICONS[product.product_key] ?? (
                    <Package className="h-4 w-4" />
                  )}
                </div>
                Subscribe to {product.display_name}
              </DialogTitle>
              <DialogDescription>{product.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {/* Billing cycle toggle */}
              <div>
                <label className="primary-text-medium text-foreground mb-2 block">
                  Billing Cycle
                </label>
                <div className="border-border flex overflow-hidden rounded-lg border">
                  {(['monthly', 'yearly'] as const).map((cycle) => (
                    <button
                      key={cycle}
                      type="button"
                      className={cn(
                        'flex-1 py-2.5 text-xs font-medium transition-colors',
                        billingCycle === cycle
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:bg-muted',
                      )}
                      onClick={() => setBillingCycle(cycle)}
                    >
                      {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                      {cycle === 'yearly' && product.yearly_price_per_seat && (
                        <span className="ml-1 text-[10px] opacity-80">
                          (Save)
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seat count */}
              <div>
                <label className="primary-text-medium text-foreground mb-2 block">
                  Number of Seats{' '}
                  <span className="text-muted-foreground">
                    (min {product.min_seats})
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    disabled={seats <= product.min_seats}
                    onClick={() =>
                      setSeats(Math.max(product.min_seats, seats - 1))
                    }
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-foreground w-12 text-center text-xl font-bold">
                    {seats}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => setSeats(seats + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Price summary */}
              <Card>
                <CardContent className="space-y-2.5 p-4">
                  <div className="flex justify-between">
                    <span className="secondary-text-small text-muted-foreground">
                      Price per seat
                    </span>
                    <span className="primary-text-medium text-foreground">
                      {pricePerSeat ? `$${pricePerSeat}` : 'Contact sales'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="secondary-text-small text-muted-foreground">
                      Seats
                    </span>
                    <span className="primary-text-medium text-foreground">
                      &times;{seats}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && savings > 0 && (
                    <div className="flex justify-between">
                      <span className="secondary-text-small text-muted-foreground">
                        Annual savings
                      </span>
                      <Badge variant="success" className="text-[10px]">
                        {savings}% off
                      </Badge>
                    </div>
                  )}
                  <div className="border-border flex justify-between border-t pt-2.5">
                    <span className="primary-heading text-foreground">
                      Total
                    </span>
                    <span className="primary-heading text-foreground">
                      {total > 0
                        ? `$${total}/${billingCycle === 'yearly' ? 'yr' : 'mo'}`
                        : 'Contact sales'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <p className="secondary-text-small text-muted-foreground text-center">
                This is a demo checkout. No real payment will be processed.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className={cn('gap-2 text-white', style.accent)}
                onClick={handleCheckout}
              >
                <CreditCard className="h-4 w-4" />
                Complete Purchase
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
