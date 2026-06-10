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

import { candidateStatusOptions } from '../../pages/recruitment/page.data';
import type {
  RecruitmentCandidatePayload,
  RecruitmentCandidateSummary,
} from '../../types/recruitment.type';
import { BaseDialogProps, toDateInputValue } from './shared';

const emptyCandidateForm: RecruitmentCandidatePayload = {
  applied_at: null,
  current_company: '',
  current_ctc: null,
  current_designation: '',
  email: '',
  expected_ctc: null,
  experience_years: null,
  full_name: '',
  notice_period_days: null,
  owner_employee_id: null,
  phone: '',
  requisition_id: '',
  resume_url: '',
  source: '',
  status: 'applied',
};

export function RecruitmentCandidateDialog(
  props: BaseDialogProps & {
    initialData?: RecruitmentCandidateSummary | null;
    onSubmit: (payload: RecruitmentCandidatePayload) => void;
  },
) {
  const [form, setForm] =
    useState<RecruitmentCandidatePayload>(emptyCandidateForm);

  useEffect(() => {
    if (!props.open || !props.initialData) {
      setForm(emptyCandidateForm);
      return;
    }

    setForm({
      applied_at: props.initialData.applied_at,
      current_company: props.initialData.current_company ?? '',
      current_ctc: props.initialData.current_ctc,
      current_designation: props.initialData.current_designation ?? '',
      email: props.initialData.email,
      expected_ctc: props.initialData.expected_ctc,
      experience_years: props.initialData.experience_years,
      full_name: props.initialData.full_name,
      notice_period_days: props.initialData.notice_period_days,
      owner_employee_id: props.initialData.owner_employee_id,
      phone: props.initialData.phone ?? '',
      requisition_id: props.initialData.requisition_id,
      resume_url: props.initialData.resume_url ?? '',
      source: props.initialData.source ?? '',
      status: props.initialData.status,
    });
  }, [props.initialData, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
        <div className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {props.initialData ? 'Edit Candidate' : 'Add Candidate'}
            </DialogTitle>
            <DialogDescription className="text-base">
              Track pipeline status, ownership, compensation expectations, and
              source details.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label>Requisition</Label>
              <Select
                value={form.requisition_id || '__none__'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    requisition_id: value === '__none__' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select requisition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select requisition</SelectItem>
                  {props.options.requisitions.map((requisition) => (
                    <SelectItem key={requisition.id} value={requisition.id}>
                      {requisition.requisition_code} - {requisition.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-name">Full Name</Label>
              <Input
                id="candidate-name"
                value={form.full_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    full_name: event.target.value,
                  }))
                }
                placeholder="John Doe"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-email">Email</Label>
              <Input
                id="candidate-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="candidate@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-phone">Phone</Label>
              <Input
                id="candidate-phone"
                value={form.phone ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    status: value as RecruitmentCandidatePayload['status'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {candidateStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Owner</Label>
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
              <Label htmlFor="candidate-source">Source</Label>
              <Input
                id="candidate-source"
                value={form.source ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    source: event.target.value,
                  }))
                }
                placeholder="Referral / LinkedIn / Agency"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-company">Current Company</Label>
              <Input
                id="candidate-company"
                value={form.current_company ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    current_company: event.target.value,
                  }))
                }
                placeholder="Current employer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-designation">Current Designation</Label>
              <Input
                id="candidate-designation"
                value={form.current_designation ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    current_designation: event.target.value,
                  }))
                }
                placeholder="Frontend Developer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-experience">Experience (Years)</Label>
              <Input
                id="candidate-experience"
                min={0}
                step="0.1"
                type="number"
                value={form.experience_years ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    experience_years: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-notice">Notice Period (Days)</Label>
              <Input
                id="candidate-notice"
                min={0}
                type="number"
                value={form.notice_period_days ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notice_period_days: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-current-ctc">Current CTC</Label>
              <Input
                id="candidate-current-ctc"
                min={0}
                type="number"
                value={form.current_ctc ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    current_ctc: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-expected-ctc">Expected CTC</Label>
              <Input
                id="candidate-expected-ctc"
                min={0}
                type="number"
                value={form.expected_ctc ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    expected_ctc: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="candidate-applied-at">Applied At</Label>
              <Input
                id="candidate-applied-at"
                type="date"
                value={toDateInputValue(form.applied_at)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    applied_at: event.target.value || null,
                  }))
                }
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="candidate-resume-url">Resume URL</Label>
              <Input
                id="candidate-resume-url"
                value={form.resume_url ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    resume_url: event.target.value,
                  }))
                }
                placeholder="https://..."
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
                !form.requisition_id ||
                !form.full_name.trim() ||
                !form.email.trim()
              }
              onClick={() =>
                props.onSubmit({
                  ...form,
                  current_company: form.current_company?.trim() || null,
                  current_designation: form.current_designation?.trim() || null,
                  email: form.email.trim().toLowerCase(),
                  full_name: form.full_name.trim(),
                  phone: form.phone?.trim() || null,
                  resume_url: form.resume_url?.trim() || null,
                  source: form.source?.trim() || null,
                })
              }
            >
              {props.isPending
                ? 'Saving...'
                : props.initialData
                  ? 'Save Changes'
                  : 'Add Candidate'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
