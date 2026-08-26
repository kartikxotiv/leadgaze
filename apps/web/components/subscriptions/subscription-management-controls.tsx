'use client';

import { useState } from 'react';

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

import type { PricingResponseData } from '~/lib/subscriptions/contracts';

export function SeatChangeControl({
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

export function BundlePurchaseCard({
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
