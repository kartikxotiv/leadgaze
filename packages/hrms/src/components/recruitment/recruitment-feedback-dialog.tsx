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

import { feedbackRecommendationOptions } from '../../pages/recruitment/page.data';
import type { RecruitmentFeedbackPayload } from '../../types/recruitment.type';
import { BaseDialogProps } from './shared';

const emptyFeedbackForm: RecruitmentFeedbackPayload = {
  concerns: '',
  interviewer_employee_id: null,
  interview_id: '',
  rating: null,
  recommendation: 'yes',
  strengths: '',
  summary: '',
};

export function RecruitmentFeedbackDialog(
  props: BaseDialogProps & {
    initialInterviewId?: string | null;
    onSubmit: (payload: RecruitmentFeedbackPayload) => void;
  },
) {
  const [form, setForm] =
    useState<RecruitmentFeedbackPayload>(emptyFeedbackForm);

  useEffect(() => {
    if (!props.open) {
      setForm(emptyFeedbackForm);
      return;
    }

    setForm({
      ...emptyFeedbackForm,
      interview_id: props.initialInterviewId ?? '',
    });
  }, [props.initialInterviewId, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[640px] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="text-2xl pr-12">Record Feedback</DialogTitle>
            <DialogDescription className="text-base">
              Capture recommendation, confidence, strengths, and concerns.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Interview</Label>
                <Select
                  value={form.interview_id || '__none__'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      interview_id: value === '__none__' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select interview" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select interview</SelectItem>
                    {props.options.interviews.map((interview) => (
                      <SelectItem key={interview.id} value={interview.id}>
                        {interview.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Recommendation</Label>
                  <Select
                    value={form.recommendation}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        recommendation:
                          value as RecruitmentFeedbackPayload['recommendation'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {feedbackRecommendationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="feedback-rating">Rating</Label>
                  <Input
                    id="feedback-rating"
                    min={1}
                    max={5}
                    type="number"
                    value={form.rating ?? ''}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        rating: event.target.value
                          ? Number(event.target.value)
                          : null,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
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
                    <SelectValue placeholder="Auto-detect current user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Use current user</SelectItem>
                    {props.options.employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="feedback-strengths">Strengths</Label>
                <Textarea
                  id="feedback-strengths"
                  rows={3}
                  value={form.strengths ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      strengths: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="feedback-concerns">Concerns</Label>
                <Textarea
                  id="feedback-concerns"
                  rows={3}
                  value={form.concerns ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      concerns: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="feedback-summary">Summary</Label>
                <Textarea
                  id="feedback-summary"
                  rows={3}
                  value={form.summary ?? ''}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
            <Button
              type="button"
              variant="outline"
              disabled={props.isPending}
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={props.isPending || !form.interview_id}
              onClick={() =>
                props.onSubmit({
                  ...form,
                  concerns: form.concerns?.trim() || null,
                  strengths: form.strengths?.trim() || null,
                  summary: form.summary?.trim() || null,
                })
              }
            >
              {props.isPending ? 'Saving...' : 'Record Feedback'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
