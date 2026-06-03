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

import type { RecruitmentOnboardingTaskSummary } from '~/types/recruitment.type';

import { formatLabel } from '../page.data';
import { RecruitmentStatusBadge } from '../page.components';
import { formatDate } from '../_lib/recruitment-formatters';

export function RecruitmentOnboardingTab(props: {
  canManageOnboarding: boolean;
  onDelete: (id: string) => void;
  onEdit: (task: RecruitmentOnboardingTaskSummary) => void;
  onboardingTasks: RecruitmentOnboardingTaskSummary[];
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Onboarding Checklist</CardTitle>
        <CardDescription>
          Track pre-joining tasks, owners, blockers, and completion dates.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.onboardingTasks.length ? (
              props.onboardingTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.candidate_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{task.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {task.offer_designation ?? 'No linked offer'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{task.owner_employee?.name ?? '-'}</TableCell>
                  <TableCell>{formatDate(task.due_date)}</TableCell>
                  <TableCell>
                    <RecruitmentStatusBadge label={formatLabel(task.status)} />
                  </TableCell>
                  <TableCell className="text-right">
                    {props.canManageOnboarding ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => props.onEdit(task)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => props.onDelete(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center">
                  No onboarding tasks yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
