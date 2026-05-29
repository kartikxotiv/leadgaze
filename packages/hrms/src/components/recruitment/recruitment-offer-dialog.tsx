'use client';

import { useEffect, useState } from 'react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import type {
  RecruitmentOfferPayload,
  RecruitmentOfferSummary,
} from '~/types/recruitment.type';

import { offerStatusOptions } from '../page.data';
import { BaseDialogProps, toDateInputValue } from './shared';

const emptyOfferForm: RecruitmentOfferPayload = {
  approved_by_employee_id: null,
  candidate_id: '',
  currency_code: 'INR',
  joining_date: null,
  notes: '',
  offered_designation: '',
  salary_amount: 0,
  status: 'draft',
};

export function RecruitmentOfferDialog(
  props: BaseDialogProps & {
    initialCandidateId?: string | null;
    initialData?: RecruitmentOfferSummary | null;
    onSubmit: (payload: RecruitmentOfferPayload) => void;
  },
) {
  const [form, setForm] = useState<RecruitmentOfferPayload>(emptyOfferForm);

  useEffect(() => {
    if (!props.open) {
      setForm(emptyOfferForm);
      return;
    }

    if (props.initialData) {
      setForm({
        approved_by_employee_id: props.initialData.approved_by_employee_id,
        candidate_id: props.initialData.candidate_id,
        currency_code: props.initialData.currency_code,
        joining_date: props.initialData.joining_date,
        notes: props.initialData.notes ?? '',
        offered_designation: props.initialData.offered_designation,
        salary_amount: props.initialData.salary_amount,
        status: props.initialData.status,
      });
      return;
    }

    setForm({
      ...emptyOfferForm,
      candidate_id: props.initialCandidateId ?? '',
    });
  }, [props.initialCandidateId, props.initialData, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
        <div className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {props.initialData ? 'Edit Offer' : 'Create Offer'}
            </DialogTitle>
            <DialogDescription className="text-base">
              Track approvals, offered designation, salary, joining date, and candidate response.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>Candidate</Label>
              <Select
                value={form.candidate_id || '__none__'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    candidate_id: value === '__none__' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select candidate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select candidate</SelectItem>
                  {props.options.candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.full_name} ({candidate.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="offered-designation">Offered Designation</Label>
              <Input
                id="offered-designation"
                value={form.offered_designation}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    offered_designation: event.target.value,
                  }))
                }
                placeholder="Senior Frontend Engineer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="salary-amount">Salary Amount</Label>
              <Input
                id="salary-amount"
                min={0}
                type="number"
                value={form.salary_amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    salary_amount: Number(event.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency-code">Currency</Label>
              <Input
                id="currency-code"
                maxLength={3}
                value={form.currency_code ?? 'INR'}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currency_code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="INR"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="joining-date">Joining Date</Label>
              <Input
                id="joining-date"
                type="date"
                value={toDateInputValue(form.joining_date)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    joining_date: event.target.value || null,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as RecruitmentOfferPayload['status'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {offerStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label>Approved By</Label>
              <Select
                value={form.approved_by_employee_id ?? '__none__'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    approved_by_employee_id: value === '__none__' ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select approver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No approver</SelectItem>
                  {props.options.employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="offer-notes">Notes</Label>
              <Textarea
                id="offer-notes"
                rows={4}
                value={form.notes ?? ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Approval comments, offer conditions, or follow-up notes."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={props.isPending}
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                props.isPending ||
                !form.candidate_id ||
                !form.offered_designation.trim() ||
                form.salary_amount < 0
              }
              onClick={() =>
                props.onSubmit({
                  ...form,
                  currency_code: (form.currency_code || 'INR').trim().toUpperCase(),
                  notes: form.notes?.trim() || null,
                  offered_designation: form.offered_designation.trim(),
                })
              }
            >
              {props.isPending
                ? 'Saving...'
                : props.initialData
                  ? 'Save Changes'
                  : 'Create Offer'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
