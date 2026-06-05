'use client';

import { useEffect, useState } from 'react';

import { MessageSquareReply } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Textarea } from '@kit/ui/textarea';

import type {
  SupportSystemMetric,
  SupportSystemRequest,
  SupportSystemRequestUpdatePayload,
} from '../../types/support-system.type';
import {
  SUPPORT_SYSTEM_TABS,
  type SupportSystemTabValue,
  formatDate,
  getSupportRequestCategoryLabel,
  getSupportRequestStatusLabel,
} from './page.data';

function getBadgeClassName(value: string) {
  const normalizedValue = value.toLowerCase();

  if (
    ['resolved', 'closed'].includes(normalizedValue) ||
    ['documents', 'benefits'].includes(normalizedValue)
  ) {
    return 'border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300';
  }

  if (['urgent', 'high', 'in_progress', 'payroll'].includes(normalizedValue)) {
    return 'border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-500/40 dark:text-amber-300';
  }

  if (['open', 'policy'].includes(normalizedValue)) {
    return 'border-sky-200 bg-sky-500/10 text-sky-700 dark:border-sky-500/40 dark:text-sky-300';
  }

  return 'border-slate-200 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-300';
}

export function SupportSystemAccessCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Support System access is restricted</CardTitle>
        <CardDescription>
          Ask an administrator to grant support-system permissions for your
          role.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function SupportSystemMetricCards(props: {
  items: SupportSystemMetric[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {props.items.map((item) => (
        <Card key={item.label}>
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl">{item.value}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-muted-foreground text-sm">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SupportSystemRequestsCard(props: {
  activeTab: SupportSystemTabValue;
  canUpdate: boolean;
  onTabChange: (value: SupportSystemTabValue) => void;
  onUpdate: (request: SupportSystemRequest) => void;
  requests: SupportSystemRequest[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>HR Requests</CardTitle>
        <CardDescription>
          Tickets raised by employees are visible here for HR and admin
          follow-up.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {SUPPORT_SYSTEM_TABS.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={props.activeTab === tab.value ? 'default' : 'outline'}
              onClick={() => props.onTabChange(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Request</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    <p className="font-medium">{request.employee.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {request.employee.employee_code}
                      {request.employee.department_name
                        ? ` - ${request.employee.department_name}`
                        : ''}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="space-y-1">
                    <p className="font-medium">{request.subject}</p>
                    <p className="text-muted-foreground line-clamp-2 max-w-[320px] text-xs">
                      {request.description}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <Badge
                    variant="outline"
                    className={getBadgeClassName(request.category)}
                  >
                    {getSupportRequestCategoryLabel(request.category)}
                  </Badge>
                </TableCell>
                <TableCell className="align-top">
                  <Badge
                    variant="outline"
                    className={getBadgeClassName(request.priority)}
                  >
                    {request.priority}
                  </Badge>
                </TableCell>
                <TableCell className="align-top">
                  <Badge
                    variant="outline"
                    className={getBadgeClassName(request.status)}
                  >
                    {getSupportRequestStatusLabel(request.status)}
                  </Badge>
                </TableCell>
                <TableCell className="align-top text-sm">
                  {formatDate(request.created_at)}
                </TableCell>
                <TableCell className="text-right align-top">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!props.canUpdate}
                    onClick={() => props.onUpdate(request)}
                  >
                    Update
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {props.requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center">
                  No requests in this view.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function SupportRequestUpdateDialog(props: {
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: SupportSystemRequestUpdatePayload) => void;
  open: boolean;
  request: SupportSystemRequest | null;
}) {
  const [status, setStatus] =
    useState<SupportSystemRequestUpdatePayload['status']>('open');
  const [priority, setPriority] =
    useState<SupportSystemRequestUpdatePayload['priority']>('medium');
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    if (!props.open || !props.request) {
      return;
    }

    setStatus(props.request.status);
    setPriority(props.request.priority);
    setResponseMessage(props.request.response_message ?? '');
  }, [props.open, props.request]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>Update support request</DialogTitle>
          <DialogDescription>
            Share an HR response and move the request through its support
            workflow.
          </DialogDescription>
        </DialogHeader>

        {props.request ? (
          <div className="space-y-5">
            <div className="rounded-xl border p-4">
              <p className="font-medium">{props.request.subject}</p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                {props.request.description}
              </p>
              <p className="text-muted-foreground mt-3 text-xs">
                {props.request.employee.name} -{' '}
                {props.request.employee.work_email}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(value) =>
                    setStatus(
                      value as SupportSystemRequestUpdatePayload['status'],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setPriority(
                      value as SupportSystemRequestUpdatePayload['priority'],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Response</Label>
              <Textarea
                rows={6}
                value={responseMessage}
                onChange={(event) => setResponseMessage(event.target.value)}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => props.onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={props.isPending || !props.request}
            onClick={() =>
              props.onSubmit({
                priority,
                response_message: responseMessage,
                status,
              })
            }
          >
            {props.isPending ? 'Saving...' : 'Save update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SupportSystemIntroCard() {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-6">
        <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <MessageSquareReply className="h-5 w-5" />
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Centralized HR request handling</p>
          <p className="text-muted-foreground text-sm leading-6">
            Every employee ticket lands here, so HR can review, respond, and
            close the loop from one workspace.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
