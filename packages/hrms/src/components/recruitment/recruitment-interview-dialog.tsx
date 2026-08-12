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

import {
  interviewRoundTypeOptions,
  interviewStatusOptions,
} from '../../pages/recruitment/page.data';
import type {
  RecruitmentInterviewPayload,
  RecruitmentInterviewSummary,
} from '../../types/recruitment.type';
import { BaseDialogProps, toDateTimeInputValue } from './shared';

const emptyInterviewForm: RecruitmentInterviewPayload = {
  candidate_id: '',
  duration_minutes: 45,
  interviewer_employee_id: null,
  location: '',
  meeting_link: '',
  outcome: '',
  round_type: 'screening',
  scheduled_at: '',
  status: 'scheduled',
  title: '',
};

export function RecruitmentInterviewDialog(
  props: BaseDialogProps & {
    initialCandidateId?: string | null;
    initialData?: RecruitmentInterviewSummary | null;
    onSubmit: (payload: RecruitmentInterviewPayload) => void;
  },
) {
  const [form, setForm] =
    useState<RecruitmentInterviewPayload>(emptyInterviewForm);

  useEffect(() => {
    if (!props.open) {
      setForm(emptyInterviewForm);
      return;
    }

    if (props.initialData) {
      setForm({
        candidate_id: props.initialData.candidate_id,
        duration_minutes: props.initialData.duration_minutes,
        interviewer_employee_id: props.initialData.interviewer_employee_id,
        location: props.initialData.location ?? '',
        meeting_link: props.initialData.meeting_link ?? '',
        outcome: props.initialData.outcome ?? '',
        round_type: props.initialData.round_type,
        scheduled_at: toDateTimeInputValue(props.initialData.scheduled_at),
        status: props.initialData.status,
        title: props.initialData.title,
      });
      return;
    }

    setForm({
      ...emptyInterviewForm,
      candidate_id: props.initialCandidateId ?? '',
    });
  }, [props.initialCandidateId, props.initialData, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[680px] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader>
            <DialogTitle>
              {props.initialData ? 'Edit Interview' : 'Schedule Interview'}
            </DialogTitle>
            <DialogDescription className="text-base">
              Define the round, assign an interviewer, and capture timing
              details.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
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
                <Label htmlFor="interview-title">Interview Title</Label>
                <Input
                  id="interview-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Technical Round"
                />
              </div>

              <div className="grid gap-2">
                <Label>Round Type</Label>
                <Select
                  value={form.round_type}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      round_type:
                        value as RecruitmentInterviewPayload['round_type'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewRoundTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
                      status: value as RecruitmentInterviewPayload['status'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {interviewStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="interview-scheduled-at">Scheduled At</Label>
                <Input
                  id="interview-scheduled-at"
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      scheduled_at: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="interview-duration">Duration (Minutes)</Label>
                <Input
                  id="interview-duration"
                  min={1}
                  type="number"
                  value={form.duration_minutes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      duration_minutes: Number(event.target.value || 45),
                    }))
                  }
                />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label>Interviewer</Label>
                <Select
                  value={form.interviewer_employee_id ?? '__none__'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      interviewer_employee_id:
                        value === '__none__' ? null : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No interviewer</SelectItem>
                    {props.options.employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="meeting-link">Meeting Link</Label>
                <Input
                  id="meeting-link"
                  value={form.meeting_link ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      meeting_link: event.target.value,
                    }))
                  }
                  placeholder="https://meet..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="interview-location">Location</Label>
                <Input
                  id="interview-location"
                  value={form.location ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Conference Room A"
                />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="interview-outcome">Outcome</Label>
                <Textarea
                  id="interview-outcome"
                  rows={3}
                  value={form.outcome ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      outcome: event.target.value,
                    }))
                  }
                  placeholder="Optional decision summary or next-step note"
                />
              </div>
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
                !form.title.trim() ||
                !form.scheduled_at
              }
              onClick={() =>
                props.onSubmit({
                  ...form,
                  location: form.location?.trim() || null,
                  meeting_link: form.meeting_link?.trim() || null,
                  outcome: form.outcome?.trim() || null,
                  scheduled_at: new Date(form.scheduled_at).toISOString(),
                  title: form.title.trim(),
                })
              }
            >
              {props.isPending
                ? 'Saving...'
                : props.initialData
                  ? 'Save Changes'
                  : 'Schedule Interview'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
