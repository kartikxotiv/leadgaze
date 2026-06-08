'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
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
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { cn } from '@kit/ui/utils';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  type SeatAssignment,
  type SubscriptionProduct,
  type WorkspaceSeat,
  assignSeatService,
  getSeatAssignmentsService,
  getSubscriptionProductsService,
  getWorkspaceSeatsService,
  revokeSeatService,
  subscribeToProductService,
  updateSeatCountService,
} from '~/services/subscription.service';
import {
  type WorkspaceMember,
  getMembersService,
} from '~/services/team-members.service';

// ─── Constants ───────────────────────────────────────────────────

const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  sales: <ShoppingCart className="h-5 w-5" />,
  hrms: <Users className="h-5 w-5" />,
  inventory: <Package className="h-5 w-5" />,
  service_cloud: <Headphones className="h-5 w-5" />,
  funds: <DollarSign className="h-5 w-5" />,
};

const PRODUCT_COLORS: Record<string, string> = {
  sales: '#0176d3',
  hrms: '#9050dd',
  inventory: '#2e844a',
  service_cloud: '#dd7a01',
  funds: '#0b7764',
};

// ─── Main Page ───────────────────────────────────────────────────

export default function OrgSubscriptionPage() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id ?? '';

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['subscription-products'],
    queryFn: () => getSubscriptionProductsService(),
  });

  const { data: seatsData, isLoading: seatsLoading } = useQuery({
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
    <div className="min-h-screen bg-[#f3f2f2]">
      {/* Header */}
      <header className="border-b border-[#dddbda] bg-[#1b2533]">
        <div className="flex h-12 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <LogoMark size={22} inverted />
            <span className="text-sm font-semibold tracking-wide text-white">
              LEADGAZE
            </span>
            <div className="mx-2 h-4 w-px bg-white/20" />
            <nav className="flex items-center gap-1 text-xs text-white/50">
              <span className="cursor-pointer transition-colors hover:text-white/80">
                Platform
              </span>
              <span className="mx-1">/</span>
              <span className="text-white/80">Subscription</span>
            </nav>
          </div>
          <a
            href="/org/home"
            className="flex items-center gap-1.5 rounded border border-white/20 px-3 py-1 text-xs text-white/70 transition-colors hover:border-white/40 hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </a>
        </div>
      </header>

      {/* Page header */}
      <div className="border-b border-[#dddbda] bg-white px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-1 text-[10px] font-bold tracking-widest text-[#706e6b] uppercase">
            Account · Billing
          </p>
          <h1 className="text-2xl font-bold text-[#1b2533]">
            Subscription & Modules
          </h1>
          <p className="mt-1 text-sm text-[#54698d]">
            Manage your active modules, seat allocations, and billing.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {/* Active Subscriptions */}
        {seats.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold tracking-widest text-[#706e6b] uppercase">
              Active Subscriptions
            </h2>
            <div className="space-y-3">
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
          <h2 className="mb-3 text-xs font-bold tracking-widest text-[#706e6b] uppercase">
            Available Modules
          </h2>
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#0176d3]" />
            </div>
          ) : availableProducts.length === 0 ? (
            <p className="rounded-md border border-[#dddbda] bg-white px-4 py-8 text-center text-sm text-[#706e6b]">
              All modules are subscribed.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const product = seat.subscription_products;
  const color = PRODUCT_COLORS[product?.product_key ?? ''] ?? '#6b7280';
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

  // Update seat count mutation
  const updateMutation = useMutation({
    mutationFn: (newCount: number) => updateSeatCountService(seat.id, newCount),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-seats', workspaceId],
      });
      toast.success('Seat count updated');
    },
    onError: (err: any) =>
      toast.error(err?.message || 'Failed to update seats'),
  });

  return (
    <div className="rounded-md border border-[#dddbda] bg-white shadow-sm">
      {/* Summary row */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-md"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1b2533]">
              {product?.display_name ?? 'Module'}
            </h3>
            <p className="text-xs text-[#706e6b]">
              {seat.seats_used} / {seat.seats_purchased} seats used ·{' '}
              <span className="capitalize">{seat.billing_cycle}</span> ·{' '}
              <Badge
                variant="outline"
                className={cn(
                  'ml-1 text-[10px]',
                  seat.status === 'active'
                    ? 'border-green-500/30 text-green-600'
                    : 'border-amber-500/30 text-amber-600',
                )}
              >
                {seat.status}
              </Badge>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Seat count controls */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={seat.seats_purchased <= 1 || updateMutation.isPending}
            onClick={() => updateMutation.mutate(seat.seats_purchased - 1)}
          >
            <Minus className="h-3 w-3" /> Seat
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate(seat.seats_purchased + 1)}
          >
            <Plus className="h-3 w-3" /> Seat
          </Button>

          <div className="mx-1 h-5 w-px bg-[#dddbda]" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide' : 'Manage'} seats
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Seat usage bar */}
      <div className="px-5 pb-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f3f2f2]">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${seatPercent}%`,
              backgroundColor: seatPercent >= 90 ? '#c23934' : color,
            }}
          />
        </div>
      </div>

      {/* Expanded seat assignments */}
      {expanded && (
        <div className="border-t border-[#f3f2f2] px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-[#54698d]">
              Assigned Members
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={() => setAssignDialogOpen(true)}
            >
              <Plus className="h-3 w-3" /> Assign Seat
            </Button>
          </div>
          <SeatAssignmentsList
            workspaceId={workspaceId}
            productKey={product?.product_key ?? ''}
          />
        </div>
      )}

      {/* Assign seat dialog */}
      {assignDialogOpen && (
        <AssignSeatDialog
          workspaceId={workspaceId}
          productKey={product?.product_key ?? ''}
          productName={product?.display_name ?? 'Module'}
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
        />
      )}
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
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['seat-assignments', workspaceId, productKey],
    queryFn: () => getSeatAssignmentsService(workspaceId, productKey),
    enabled: !!workspaceId && !!productKey,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeSeatService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['seat-assignments', workspaceId, productKey],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace-seats', workspaceId],
      });
      toast.success('Seat revoked');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to revoke seat'),
  });

  const assignments: SeatAssignment[] = (data?.data ?? []).filter(
    (a: SeatAssignment) => a.is_active,
  );

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-[#706e6b]" />;
  }

  if (assignments.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-[#706e6b]">
        No members assigned yet. Click &quot;Assign Seat&quot; to add members.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {assignments.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between rounded px-3 py-2 transition-colors hover:bg-[#f3f2f2]"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8f4fd] text-xs font-semibold text-[#0176d3]">
              {(a.accounts?.email?.charAt(0) ?? 'U').toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-medium text-[#1b2533]">
                {a.accounts?.name ?? 'User'}
              </p>
              <p className="text-[10px] text-[#706e6b]">{a.accounts?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[#c23934] hover:bg-[#fce9e9] hover:text-[#c23934]"
            onClick={() => revokeMutation.mutate(a.id)}
            disabled={revokeMutation.isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Assign Seat Dialog ──────────────────────────────────────────

function AssignSeatDialog({
  workspaceId,
  productKey,
  productName,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  productKey: string;
  productName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');

  // Fetch members
  const { data: membersData } = useQuery({
    queryKey: ['workspaceMembers', workspaceId],
    queryFn: () => getMembersService(workspaceId),
    enabled: !!workspaceId,
  });

  // Fetch current assignments to exclude already-assigned users
  const { data: assignmentsData } = useQuery({
    queryKey: ['seat-assignments', workspaceId, productKey],
    queryFn: () => getSeatAssignmentsService(workspaceId, productKey),
    enabled: !!workspaceId && !!productKey,
  });

  const assignedUserIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of assignmentsData?.data ?? []) {
      if (a.is_active) set.add(a.user_id);
    }
    return set;
  }, [assignmentsData]);

  const members: WorkspaceMember[] = (membersData?.data ?? []).filter(
    (m: WorkspaceMember) =>
      m.status === 'accepted' && !assignedUserIds.has(m.user_id),
  );

  const assignMutation = useMutation({
    mutationFn: () =>
      assignSeatService({ workspaceId, userId: selectedUserId, productKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['seat-assignments', workspaceId, productKey],
      });
      queryClient.invalidateQueries({
        queryKey: ['workspace-seats', workspaceId],
      });
      toast.success(`Seat assigned for ${productName}`);
      onOpenChange(false);
      setSelectedUserId('');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to assign seat'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Seat — {productName}</DialogTitle>
          <DialogDescription>
            Select a team member to assign a seat for this module.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {members.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#706e6b]">
              All team members already have seats for this module.
            </p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                    selectedUserId === m.user_id
                      ? 'border border-[#0176d3]/30 bg-[#e8f4fd]'
                      : 'border border-transparent hover:bg-[#f3f2f2]',
                  )}
                  onClick={() => setSelectedUserId(m.user_id)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f2f2] text-xs font-semibold">
                    {(m.user?.email?.charAt(0) ?? 'U').toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1b2533]">
                      {m.user?.user_metadata?.full_name ?? 'Team Member'}
                    </p>
                    <p className="text-xs text-[#706e6b]">{m.user?.email}</p>
                  </div>
                  {selectedUserId === m.user_id && (
                    <Check className="h-4 w-4 text-[#0176d3]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#0176d3] text-white hover:bg-[#0161b0]"
            disabled={!selectedUserId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            {assignMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Assign Seat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const color = PRODUCT_COLORS[product.product_key] ?? '#6b7280';
  const icon = PRODUCT_ICONS[product.product_key] ?? (
    <Package className="h-5 w-5" />
  );

  return (
    <>
      <div className="group rounded-md border border-[#dddbda] bg-white p-5 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-start justify-between">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-md"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
          <Badge variant="outline" className="text-[10px]">
            Available
          </Badge>
        </div>
        <h3 className="mt-3 text-sm font-semibold text-[#1b2533]">
          {product.display_name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-[#706e6b]">
          {product.description}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-[#54698d]">
            {product.monthly_price_per_seat
              ? `$${product.monthly_price_per_seat}/seat/mo`
              : 'Contact sales'}
          </p>
          <Button
            size="sm"
            className="h-7 gap-1 text-xs text-white"
            style={{ backgroundColor: color }}
            onClick={() => setCheckoutOpen(true)}
          >
            <CreditCard className="h-3 w-3" />
            Subscribe
          </Button>
        </div>
      </div>

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

// ─── Checkout Modal (Dummy) ──────────────────────────────────────

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

  const color = PRODUCT_COLORS[product.product_key] ?? '#6b7280';
  const pricePerSeat =
    billingCycle === 'yearly'
      ? product.yearly_price_per_seat
      : product.monthly_price_per_seat;
  const total = pricePerSeat ? Number(pricePerSeat) * seats : 0;

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
    onError: (err: any) => {
      toast.error(err?.message || 'Checkout failed');
      setStep('form');
    },
  });

  const handleCheckout = () => {
    setStep('processing');
    // Simulate processing delay for UX
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
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <DialogTitle className="text-lg">Subscription Active!</DialogTitle>
            <DialogDescription className="mt-2">
              {product.display_name} is now active with {seats} seat
              {seats !== 1 ? 's' : ''}. Assign seats to your team members from
              the subscription page.
            </DialogDescription>
            <Button
              className="mt-6 bg-[#0176d3] text-white hover:bg-[#0161b0]"
              onClick={handleClose}
            >
              Done
            </Button>
          </div>
        ) : step === 'processing' ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-[#0176d3]" />
            <DialogTitle className="text-lg">Processing Payment...</DialogTitle>
            <DialogDescription className="mt-1">
              Please wait while we activate your subscription.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${color}15`, color }}
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
                <label className="mb-1.5 block text-xs font-medium text-[#54698d]">
                  Billing Cycle
                </label>
                <div className="flex overflow-hidden rounded-md border border-[#dddbda]">
                  {(['monthly', 'yearly'] as const).map((cycle) => (
                    <button
                      key={cycle}
                      type="button"
                      className={cn(
                        'flex-1 py-2 text-xs font-medium transition-colors',
                        billingCycle === cycle
                          ? 'bg-[#0176d3] text-white'
                          : 'bg-white text-[#54698d] hover:bg-[#f3f2f2]',
                      )}
                      onClick={() => setBillingCycle(cycle)}
                    >
                      {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seat count */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#54698d]">
                  Number of Seats (min {product.min_seats})
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={seats <= product.min_seats}
                    onClick={() =>
                      setSeats(Math.max(product.min_seats, seats - 1))
                    }
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-10 text-center text-lg font-bold text-[#1b2533]">
                    {seats}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setSeats(seats + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Price summary */}
              <div className="space-y-2 rounded-md border border-[#dddbda] bg-[#f3f2f2] p-4">
                <div className="flex justify-between text-xs">
                  <span className="text-[#706e6b]">Price per seat</span>
                  <span className="font-medium text-[#1b2533]">
                    {pricePerSeat ? `$${pricePerSeat}` : 'Contact sales'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#706e6b]">Seats</span>
                  <span className="font-medium text-[#1b2533]">x{seats}</span>
                </div>
                <div className="flex justify-between border-t border-[#dddbda] pt-2">
                  <span className="text-sm font-semibold text-[#1b2533]">
                    Total
                  </span>
                  <span className="text-sm font-bold text-[#1b2533]">
                    {total > 0
                      ? `$${total}/${billingCycle === 'yearly' ? 'yr' : 'mo'}`
                      : 'Contact sales'}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-[#9ea4ac]">
                This is a demo checkout. No real payment will be processed.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                className="text-white"
                style={{ backgroundColor: color }}
                onClick={handleCheckout}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Complete Purchase
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Logo ────────────────────────────────────────────────────────

function LogoMark({
  size = 28,
  inverted = false,
}: {
  size?: number;
  inverted?: boolean;
}) {
  const fg = inverted ? '#fff' : '#0176d3';
  const bg = inverted ? '#0176d3' : '#e8f4fd';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="6" fill={bg} />
      <path
        d="M8 22L14 10L20 18L24 14"
        stroke={fg}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="14" r="2.5" fill={fg} />
    </svg>
  );
}
