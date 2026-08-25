'use client';

import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  type ModulePlan,
  PLAN_ORDER,
  type WorkspacePlans,
} from '~/components/subscriptions/subscription-management-types';
import { SubscriptionManagementView } from '~/components/subscriptions/subscription-management-view';
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

  return (
    <SubscriptionManagementView
      workspaceId={workspaceId}
      data={plansQuery.data}
      pricing={pricingQuery.data}
      invoices={invoicesQuery.data ?? []}
      notifications={notificationsQuery.data ?? []}
      billingCycle={billingCycle}
      setBillingCycle={setBillingCycle}
      canManage={canManage}
      canBill={canBill}
      activeBundle={activeBundle}
      activeKeys={activeKeys}
      pending={{
        trial: trial.isPending,
        planChange: planChange.isPending,
        removeModule: removeModule.isPending,
        seatChange: seatChange.isPending,
        bundleCheckout: bundleCheckout.isPending,
      }}
      onStartTrial={() => trial.mutate()}
      onPlanChange={(module, targetPlan) =>
        planChange.mutate({ module, targetPlan })
      }
      onRemoveModule={(moduleKey) => removeModule.mutate(moduleKey)}
      onModuleSeatChange={(module, newQuantity) =>
        seatChange.mutate({ module, newQuantity })
      }
      onBundleSeatChange={(bundleKey, newQuantity) =>
        seatChange.mutate({ bundleKey, newQuantity })
      }
      onBundlePurchase={(bundleKey, seats) =>
        bundleCheckout.mutate({ bundleKey, seats })
      }
      onAddModule={(moduleKey, planKey) =>
        addModule.mutate({ moduleKey, planKey })
      }
    />
  );
}
