'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { formatDateTime } from '../../hooks/recruitment-formatters';
import { RecruitmentStatusBadge } from '../../pages/recruitment/page.components';
import { formatLabel } from '../../pages/recruitment/page.data';
import type {
  RecruitmentCandidateNoteSummary,
  RecruitmentFeedbackSummary,
} from '../../types/recruitment.type';

export function RecruitmentActivityTab(props: {
  feedback: RecruitmentFeedbackSummary[];
  notes: RecruitmentCandidateNoteSummary[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
          <CardDescription>
            Interview recommendations and summaries recorded by the hiring team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {props.feedback.length ? (
            props.feedback.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.candidate_name}</p>
                  <RecruitmentStatusBadge
                    label={formatLabel(item.recommendation)}
                  />
                </div>
                <p className="text-muted-foreground mt-2 text-sm">
                  {item.summary || 'No summary provided.'}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {item.interviewer_employee?.name ?? 'Unknown interviewer'} -{' '}
                  {formatDateTime(item.submitted_at)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              No feedback recorded yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
          <CardDescription>
            Recruiter and hiring-team notes kept alongside candidate context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {props.notes.length ? (
            props.notes.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-xl border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.candidate_name}</p>
                  {item.is_pinned ? (
                    <RecruitmentStatusBadge label="Pinned" />
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-2 text-sm">
                  {item.note}
                </p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {item.author_employee?.name ?? 'Unknown author'} -{' '}
                  {formatDateTime(item.created_at)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">
              No internal notes yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
