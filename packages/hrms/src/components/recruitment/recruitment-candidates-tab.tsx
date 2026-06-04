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

import type { RecruitmentCandidateSummary } from '~/types/recruitment.type';

import { formatLabel } from '../page.data';
import { RecruitmentStatusBadge } from '../page.components';

export function RecruitmentCandidatesTab(props: {
  canAddNotes: boolean;
  canManageCandidates: boolean;
  canRecordFeedback: boolean;
  candidates: RecruitmentCandidateSummary[];
  latestInterviewIdForCandidate: (candidateId: string) => string | null;
  onAddFeedback: (interviewId: string | null) => void;
  onAddNote: (candidateId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (candidate: RecruitmentCandidateSummary) => void;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Candidates</CardTitle>
        <CardDescription>
          Track status-wise candidate progress, ownership, notes, and feedback context.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Requisition</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.candidates.length ? (
              props.candidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{candidate.full_name}</span>
                      <span className="text-muted-foreground text-xs">
                        {candidate.email} - {candidate.source ?? 'Unknown source'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{candidate.requisition_title}</TableCell>
                  <TableCell>
                    <RecruitmentStatusBadge label={formatLabel(candidate.status)} />
                  </TableCell>
                  <TableCell>
                    {candidate.notes_count} notes - {candidate.feedback_count} feedback
                  </TableCell>
                  <TableCell>{candidate.owner_employee?.name ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {props.canManageCandidates ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => props.onEdit(candidate)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => props.onDelete(candidate.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}
                      {props.canAddNotes ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => props.onAddNote(candidate.id)}
                        >
                          Note
                        </Button>
                      ) : null}
                      {props.canRecordFeedback ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            props.onAddFeedback(
                              props.latestInterviewIdForCandidate(candidate.id),
                            )
                          }
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
                  No candidates yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
