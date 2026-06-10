'use client';

import { useEffect, useMemo, useState } from 'react';

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

import { onboardingStatusOptions } from '../../pages/recruitment/page.data';
import type {
  RecruitmentOnboardingTaskPayload,
  RecruitmentOnboardingTaskSummary,
} from '../../types/recruitment.type';
import { BaseDialogProps, toDateInputValue } from './shared';

const emptyOnboardingTaskForm: RecruitmentOnboardingTaskPayload = {
  candidate_id: '',
  description: '',
  due_date: null,
  offer_id: null,
  owner_employee_id: null,
  status: 'pending',
  title: '',
};

export function RecruitmentOnboardingTaskDialog(
  props: BaseDialogProps & {
    initialCandidateId?: string | null;
    initialData?: RecruitmentOnboardingTaskSummary | null;
    onSubmit: (payload: RecruitmentOnboardingTaskPayload) => void;
  },
) {
  const [form, setForm] = useState<RecruitmentOnboardingTaskPayload>(
    emptyOnboardingTaskForm,
  );

  useEffect(() => {
    if (!props.open) {
      setForm(emptyOnboardingTaskForm);
      return;
    }

    if (props.initialData) {
      setForm({
        candidate_id: props.initialData.candidate_id,
        description: props.initialData.description ?? '',
        due_date: props.initialData.due_date,
        offer_id: props.initialData.offer_id,
        owner_employee_id: props.initialData.owner_employee_id,
        status: props.initialData.status,
        title: props.initialData.title,
      });
      return;
    }

    setForm({
      ...emptyOnboardingTaskForm,
      candidate_id: props.initialCandidateId ?? '',
    });
  }, [props.initialCandidateId, props.initialData, props.open]);

  const offerOptions = useMemo(() => {
    if (!form.candidate_id) {
      return props.options.offers;
    }

    return props.options.offers.filter(
      (offer) => offer.candidate_id === form.candidate_id,
    );
  }, [form.candidate_id, props.options.offers]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
        <div className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {props.initialData
                ? 'Edit Onboarding Task'
                : 'Add Onboarding Task'}
            </DialogTitle>
            <DialogDescription className="text-base">
              Create checklist items that HR and hiring teams must close before
              joining.
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
                    offer_id: null,
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
              <Label htmlFor="onboarding-task-title">Task Title</Label>
              <Input
                id="onboarding-task-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Collect signed offer letter"
              />
            </div>

            <div className="grid gap-2">
              <Label>Linked Offer</Label>
              <Select
                value={form.offer_id ?? '__none__'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    offer_id: value === '__none__' ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select offer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No linked offer</SelectItem>
                  {offerOptions.map((offer) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.offered_designation}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as RecruitmentOnboardingTaskPayload['status'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {onboardingStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Task Owner</Label>
              <Select
                value={form.owner_employee_id ?? '__none__'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    owner_employee_id: value === '__none__' ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No owner</SelectItem>
                  {props.options.employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="onboarding-due-date">Due Date</Label>
              <Input
                id="onboarding-due-date"
                type="date"
                value={toDateInputValue(form.due_date)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    due_date: event.target.value || null,
                  }))
                }
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="onboarding-description">Description</Label>
              <Textarea
                id="onboarding-description"
                rows={4}
                value={form.description ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="What needs to be completed, by whom, and with what dependency?"
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
                props.isPending || !form.candidate_id || !form.title.trim()
              }
              onClick={() =>
                props.onSubmit({
                  ...form,
                  description: form.description?.trim() || null,
                  title: form.title.trim(),
                })
              }
            >
              {props.isPending
                ? 'Saving...'
                : props.initialData
                  ? 'Save Changes'
                  : 'Add Task'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
