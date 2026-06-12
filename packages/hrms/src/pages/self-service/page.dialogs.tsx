'use client';

import { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, Phone } from 'lucide-react';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Textarea } from '@kit/ui/textarea';

import { getSelfServicePayslipDetailService } from '../../server/services/self-service.service';
import type {
  SelfServiceEmployeeProfile,
  SelfServicePayslipDetail,
  SelfServiceRequestCategory,
  SelfServiceRequestPriority,
} from '../../types/self-service.type';
import {
  SELF_SERVICE_REQUEST_CATEGORY_OPTIONS,
  SELF_SERVICE_REQUEST_PRIORITY_OPTIONS,
  formatCurrency,
  formatPayslipPeriod,
} from './page.data';
import { StatTile } from './page.shared';

export function UpdateProfileDialog(props: {
  employee: SelfServiceEmployeeProfile;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    address: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    first_name: string;
    last_name: string | null;
    personal_email: string | null;
    phone: string | null;
  }) => void;
  open: boolean;
}) {
  const [form, setForm] = useState({
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    first_name: '',
    last_name: '',
    personal_email: '',
    phone: '',
  });

  useEffect(() => {
    if (!props.open) {
      return;
    }

    setForm({
      address: props.employee.address ?? '',
      emergency_contact_name: props.employee.emergency_contact_name ?? '',
      emergency_contact_phone: props.employee.emergency_contact_phone ?? '',
      first_name: props.employee.first_name,
      last_name: props.employee.last_name ?? '',
      personal_email: props.employee.personal_email ?? '',
      phone: props.employee.phone ?? '',
    });
  }, [props.employee, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Update personal details</DialogTitle>
          <DialogDescription>
            Keep your personal contact information current for HR and payroll.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              value={form.first_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  first_name: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              value={form.last_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  last_name: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personal_email">Personal email</Label>
            <Input
              id="personal_email"
              type="email"
              value={form.personal_email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  personal_email: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Emergency contact</Label>
            <Input
              id="emergency_contact_name"
              value={form.emergency_contact_name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  emergency_contact_name: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">
              Emergency contact phone
            </Label>
            <div className="relative">
              <Phone className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="emergency_contact_phone"
                className="pl-9"
                value={form.emergency_contact_phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    emergency_contact_phone: event.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            rows={4}
            value={form.address}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                address: event.target.value,
              }))
            }
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => props.onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={props.isPending}
            onClick={() =>
              props.onSubmit({
                address: form.address || null,
                emergency_contact_name: form.emergency_contact_name || null,
                emergency_contact_phone: form.emergency_contact_phone || null,
                first_name: form.first_name,
                last_name: form.last_name || null,
                personal_email: form.personal_email || null,
                phone: form.phone || null,
              })
            }
          >
            {props.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateRequestDialog(props: {
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: {
    category: SelfServiceRequestCategory;
    description: string;
    priority: SelfServiceRequestPriority;
    subject: string;
  }) => void;
  open: boolean;
}) {
  const [category, setCategory] =
    useState<SelfServiceRequestCategory>('policy');
  const [priority, setPriority] =
    useState<SelfServiceRequestPriority>('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!props.open) {
      return;
    }

    setCategory('policy');
    setPriority('medium');
    setSubject('');
    setDescription('');
  }, [props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Raise an HR request</DialogTitle>
          <DialogDescription>
            Create a ticket for payroll, policies, documents, or profile
            updates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="request_category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) =>
                setCategory(value as SelfServiceRequestCategory)
              }
            >
              <SelectTrigger id="request_category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {SELF_SERVICE_REQUEST_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request_priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) =>
                setPriority(value as SelfServiceRequestPriority)
              }
            >
              <SelectTrigger id="request_priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {SELF_SERVICE_REQUEST_PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="request_subject">Subject</Label>
          <Input
            id="request_subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="request_description">Description</Label>
          <Textarea
            id="request_description"
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => props.onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={props.isPending}
            onClick={() =>
              props.onSubmit({
                category,
                description,
                priority,
                subject,
              })
            }
          >
            {props.isPending ? 'Submitting...' : 'Submit request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SelfServicePayslipDetailsDialog(props: {
  canDownload: boolean;
  onDownload: (payslipId: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  payslipId: string | null;
}) {
  const detailsQuery = useQuery({
    enabled: props.open && Boolean(props.payslipId),
    queryFn: () => getSelfServicePayslipDetailService(props.payslipId!),
    queryKey: ['self-service-payslip', props.payslipId],
  });

  const detail = detailsQuery.data?.data as
    | SelfServicePayslipDetail
    | undefined;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[860px]">
        <DialogHeader>
          <DialogTitle>Payslip details</DialogTitle>
          <DialogDescription>
            Review the earning and deduction breakdown for this payroll cycle.
          </DialogDescription>
        </DialogHeader>

        {detailsQuery.isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading payslip details...
          </div>
        ) : detailsQuery.isError ? (
          <div className="text-destructive rounded-lg border p-4 text-sm">
            {(detailsQuery.error as Error)?.message ??
              'Unable to load payslip details.'}
          </div>
        ) : detail ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <StatTile
                label="Period"
                value={formatPayslipPeriod(detail.payslip)}
              />
              <StatTile
                label="Gross Salary"
                value={formatCurrency(detail.payslip.gross_salary)}
              />
              <StatTile
                label="Deductions"
                value={formatCurrency(detail.payslip.deductions)}
              />
              <StatTile
                label="Net Salary"
                value={formatCurrency(detail.payslip.net_salary)}
              />
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.components.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">
                        {component.salary_component?.name ?? 'Component'}
                      </TableCell>
                      <TableCell>
                        {component.salary_component?.type ?? '-'}
                      </TableCell>
                      <TableCell>{component.source}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(component.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button
                disabled={!props.canDownload || !detail.payslip.id}
                variant="outline"
                onClick={() => props.onDownload(detail.payslip.id)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download payslip
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
