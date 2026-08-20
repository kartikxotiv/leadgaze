'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import { Check, Layers3, Sparkles } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import type { PricingResponseData } from '~/lib/subscriptions/contracts';

type FeatureMatrixRow = {
  featureKey: string;
  featureName: string;
  moduleId: string;
  values: Record<string, string | number>;
};

const PLAN_ORDER = ['free_forever', 'launch', 'growth', 'scale'] as const;

export function PublicPricingPage({
  pricing,
  featureMatrix,
}: {
  pricing: PricingResponseData;
  featureMatrix: FeatureMatrixRow[];
}) {
  const [moduleKey, setModuleKey] = useState<'sales' | 'service_cloud'>(
    'sales',
  );
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const selectedModule = pricing.modules.find(
    (item) => item.moduleKey === moduleKey,
  );
  const moduleId = useMemo(() => {
    const firstFeature = featureMatrix.find((row) =>
      row.featureKey.startsWith(moduleKey === 'sales' ? 'sales.' : 'service.'),
    );
    return firstFeature?.moduleId;
  }, [featureMatrix, moduleKey]);

  return (
    <main className="dark:via-background dark:to-background min-h-screen bg-gradient-to-b from-blue-50/80 via-white to-white dark:from-blue-950/20">
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-12 md:px-8 md:py-20">
        <header className="mx-auto max-w-3xl space-y-5 text-center">
          <Badge className="gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Simple, modular pricing
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Start free. Add power as you grow.
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose Sales, Service, or the best-value bundle. Every workspace can
            start a 14-day Growth trial.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              ['sales', 'Sales Workspace'],
              ['service_cloud', 'Service Workspace'],
            ].map(([key, label]) => (
              <Button
                key={key}
                variant={moduleKey === key ? 'default' : 'outline'}
                onClick={() => setModuleKey(key as typeof moduleKey)}
              >
                {label}
              </Button>
            ))}
            {['People · Soon', 'Inventory · Soon', 'Finance · Soon'].map(
              (label) => (
                <Button key={label} variant="ghost" disabled>
                  {label}
                </Button>
              ),
            )}
          </div>
          <div className="bg-background inline-flex rounded-xl border p-1">
            <Button
              size="sm"
              variant={cycle === 'monthly' ? 'default' : 'ghost'}
              onClick={() => setCycle('monthly')}
            >
              Monthly
            </Button>
            <Button
              size="sm"
              variant={cycle === 'yearly' ? 'default' : 'ghost'}
              onClick={() => setCycle('yearly')}
            >
              Annual · save {pricing.yearlyDiscountPercent}%
            </Button>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {pricing.plans.map((plan) => {
            const price = selectedModule?.prices.find(
              (item) => item.planKey === plan.planKey,
            );
            const amount =
              cycle === 'monthly' ? price?.monthlyPrice : price?.yearlyPrice;
            const popular = plan.planKey === 'growth';
            return (
              <Card
                key={plan.planKey}
                className={
                  popular
                    ? 'border-blue-500 shadow-lg ring-1 ring-blue-500'
                    : ''
                }
              >
                <CardHeader>
                  <div className="flex justify-between gap-2">
                    <CardTitle>{plan.planName}</CardTitle>
                    {popular && <Badge>Most popular</Badge>}
                  </div>
                  <p className="text-muted-foreground min-h-10 text-sm">
                    {plan.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    {amount === null || amount === undefined ? (
                      <span className="text-2xl font-bold">Talk to sales</span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">${amount}</span>
                        <span className="text-muted-foreground">
                          /{cycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(selectedModule?.featureHighlights ?? [])
                      .slice(0, 5)
                      .map((feature) => (
                        <p key={feature} className="flex gap-2 text-sm">
                          <Check className="h-4 w-4 text-emerald-600" />{' '}
                          {feature}
                        </p>
                      ))}
                  </div>
                  <Button
                    asChild
                    className="w-full"
                    variant={popular ? 'default' : 'outline'}
                  >
                    <Link href="/auth/sign-up">
                      {plan.isPaid ? 'Start 14-day trial' : 'Start free'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="space-y-6">
          <div className="text-center">
            <Badge variant="secondary">Best value</Badge>
            <h2 className="mt-3 text-3xl font-bold">Sales + Service bundles</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {pricing.bundles.map((bundle) => (
              <Card key={bundle.bundleKey}>
                <CardContent className="space-y-4 p-6">
                  <Layers3 className="h-7 w-7 text-blue-600" />
                  <h3 className="text-xl font-semibold">{bundle.bundleName}</h3>
                  <p>
                    <span className="text-3xl font-bold">
                      $
                      {cycle === 'monthly'
                        ? bundle.monthlyPrice
                        : bundle.yearlyPrice}
                    </span>
                    /{cycle === 'monthly' ? 'mo' : 'yr'}
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/auth/sign-up">Start Growth trial</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div>
            <h2 className="text-3xl font-bold">Compare every feature</h2>
            <p className="text-muted-foreground">
              Limits and included capabilities for {selectedModule?.moduleName}.
            </p>
          </div>
          <div className="bg-background overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  {pricing.plans.map((plan) => (
                    <TableHead key={plan.planKey}>{plan.planName}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureMatrix
                  .filter((row) => row.moduleId === moduleId)
                  .map((row) => (
                    <TableRow key={row.featureKey}>
                      <TableCell className="font-medium">
                        {row.featureName}
                      </TableCell>
                      {PLAN_ORDER.map((plan) => (
                        <TableCell key={plan}>
                          {row.values[plan] ?? '—'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="rounded-3xl bg-slate-950 p-8 text-center text-white md:p-14">
          <h2 className="text-3xl font-bold">Ready to see Growth in action?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">
            Start your 14-day trial with no changes to server-side enforcement
            or data safety.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Start 14-day Growth trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="mailto:sales@leadgaze.com">Talk to sales</a>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
