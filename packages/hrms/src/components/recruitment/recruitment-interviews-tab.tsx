'use client';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';

import type { RecruitmentInterviewSummary } from '~/types/recruitment.type';

import { formatLabel } from '../page.data';
import { RecruitmentStatusBadge } from '../page.components';
import { formatDateTime } from '../_lib/recruitment-formatters';

export function RecruitmentInterviewsTab(props: {
  canRecordFeedback: boolean;
  canScheduleInterviews: boolean;
  interviews: RecruitmentInterviewSummary[];
  onAddFeedback: (interviewId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (interview: RecruitmentInterviewSummary) => void;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Interviews</CardTitle>
        <CardDescription>
          Schedule interview rounds, assign interviewers, and monitor pending feedback.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Interview</TableHead>
              <TableHead>Candidate</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Interviewer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.interviews.length ? (
              props.interviews.map((interview) => (
                <TableRow key={interview.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{interview.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatLabel(interview.round_type)} - {interview.feedback_count} feedback
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{interview.candidate_name}</TableCell>
                  <TableCell>{formatDateTime(interview.scheduled_at)}</TableCell>
                  <TableCell>{interview.interviewer_employee?.name ?? '-'}</TableCell>
                  <TableCell>
                    <RecruitmentStatusBadge label={formatLabel(interview.status)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {props.canScheduleInterviews ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => props.onEdit(interview)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => props.onDelete(interview.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                      {props.canRecordFeedback ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => props.onAddFeedback(interview.id)}
                        >
                          Feedback
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center">
                  No interviews scheduled yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
