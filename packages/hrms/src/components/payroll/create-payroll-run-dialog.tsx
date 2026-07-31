/* eslint-disable react/no-unescaped-entities */
'use client';

import type { ChangeEvent } from 'react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';

/* eslint-disable react/no-unescaped-entities */

/* eslint-disable react/no-unescaped-entities */

/* eslint-disable react/no-unescaped-entities */

export function CreatePayrollRunDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: {
    period_start: string;
    period_end: string;
  };
  onFormChange: (field: 'period_start' | 'period_end', value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  const handleChange =
    (field: 'period_start' | 'period_end') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      props.onFormChange(field, event.target.value);
    };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-md dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader>
            <DialogTitle>Create Payroll Run</DialogTitle>
            <DialogDescription>
              Define the period for this payroll run. Calculation will pick up all
              active assignments in this range.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-1 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300">
              <p className="font-semibold">Eligibility Check:</p>
              <ul className="list-inside list-disc opacity-90">
                <li>Only "Primary" assignments are included.</li>
                <li>"Effective From" must be on or before the period end.</li>
                <li>Employee must be in "Active" status.</li>
              </ul>
            </div>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Period Start</label>
                <input
                  type="date"
                  value={props.form.period_start}
                  onChange={handleChange('period_start')}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Period End</label>
                <input
                  type="date"
                  value={props.form.period_end}
                  onChange={handleChange('period_end')}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => props.onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={props.onSubmit} disabled={props.isPending}>
              {props.isPending ? 'Creating...' : 'Create Run'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
