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
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';
import { Textarea } from '@kit/ui/textarea';

import type { RecruitmentCandidateNotePayload } from '../../types/recruitment.type';
import { BaseDialogProps } from './shared';

type NoteFormState = RecruitmentCandidateNotePayload & { candidate_id: string };

const emptyNoteForm: NoteFormState = {
  candidate_id: '',
  is_pinned: false,
  note: '',
};

export function RecruitmentNoteDialog(
  props: BaseDialogProps & {
    initialCandidateId?: string | null;
    onSubmit: (
      candidateId: string,
      payload: RecruitmentCandidateNotePayload,
    ) => void;
  },
) {
  const [form, setForm] = useState<NoteFormState>(emptyNoteForm);

  useEffect(() => {
    if (!props.open) {
      setForm(emptyNoteForm);
      return;
    }

    setForm({
      ...emptyNoteForm,
      candidate_id: props.initialCandidateId ?? '',
    });
  }, [props.initialCandidateId, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <div className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Internal Note</DialogTitle>
            <DialogDescription className="text-base">
              Capture internal context that should stay with the candidate
              profile.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
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

            <div className="grid gap-2">
              <Label htmlFor="candidate-note">Note</Label>
              <Textarea
                id="candidate-note"
                rows={5}
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="Interview panel context, hiring manager preference, risk flag, or follow-up reminder."
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium">Pin this note</p>
                <p className="text-muted-foreground text-sm">
                  Use for notes that should stay visible at the top of the
                  activity feed.
                </p>
              </div>
              <Switch
                checked={Boolean(form.is_pinned)}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, is_pinned: checked }))
                }
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
                props.isPending || !form.candidate_id || !form.note.trim()
              }
              onClick={() =>
                props.onSubmit(form.candidate_id, {
                  is_pinned: Boolean(form.is_pinned),
                  note: form.note.trim(),
                })
              }
            >
              {props.isPending ? 'Saving...' : 'Add Note'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
