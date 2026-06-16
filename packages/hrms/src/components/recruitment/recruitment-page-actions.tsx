'use client';

import { FileCheck2, MessageSquarePlus, Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';

type RecruitmentPageActionsProps = {
  canAddNotes: boolean;
  canRecordFeedback: boolean;
  canShowPrimaryAction: boolean;
  onAddFeedback: () => void;
  onAddNote: () => void;
  onPrimaryAction: () => void;
  primaryActionLabel?: string;
};

export function RecruitmentPageActions(props: RecruitmentPageActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.primaryActionLabel && props.canShowPrimaryAction ? (
        <Button size="sm" onClick={props.onPrimaryAction}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {props.primaryActionLabel}
        </Button>
      ) : null}

      {props.canAddNotes ? (
        <Button variant="outline" size="sm" onClick={props.onAddNote}>
          <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
          Add Note
        </Button>
      ) : null}

      {props.canRecordFeedback ? (
        <Button variant="outline" size="sm" onClick={props.onAddFeedback}>
          <FileCheck2 className="mr-1.5 h-3.5 w-3.5" />
          Record Feedback
        </Button>
      ) : null}
    </div>
  );
}
