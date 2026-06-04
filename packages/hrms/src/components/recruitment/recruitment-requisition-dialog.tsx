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
  employmentTypeOptions,
  priorityOptions,
  requisitionStatusOptions,
} from '../../pages/recruitment/page.data';
import type {
  RecruitmentRequisitionPayload,
  RecruitmentRequisitionSummary,
} from '../../types/recruitment.type';
import { BaseDialogProps, toDateInputValue } from './shared';

const emptyRequisitionForm: RecruitmentRequisitionPayload = {
  compensation_max: null,
  compensation_min: null,
  department_id: null,
  description: '',
  employment_type: 'full_time',
  hiring_manager_employee_id: null,
  location: '',
  openings: 1,
  owner_employee_id: null,
  priority: 'medium',
  requested_by_employee_id: null,
  requisition_code: '',
  status: 'draft',
  target_start_date: null,
  title: '',
};

export function RecruitmentRequisitionDialog(
  props: BaseDialogProps & {
    initialData?: RecruitmentRequisitionSummary | null;
    onSubmit: (payload: RecruitmentRequisitionPayload) => void;
  },
) {
  const [form, setForm] =
    useState<RecruitmentRequisitionPayload>(emptyRequisitionForm);

  useEffect(() => {
    if (!props.open || !props.initialData) {
      setForm(emptyRequisitionForm);
      return;
    }

    setForm({
      compensation_max: props.initialData.compensation_max,
      compensation_min: props.initialData.compensation_min,
      department_id: props.initialData.department_id,
      description: props.initialData.description ?? '',
      employment_type: props.initialData.employment_type,
      hiring_manager_employee_id: props.initialData.hiring_manager_employee_id,
      location: props.initialData.location ?? '',
      openings: props.initialData.openings,
      owner_employee_id: props.initialData.owner_employee_id,
      priority: props.initialData.priority,
      requested_by_employee_id: props.initialData.requested_by_employee_id,
      requisition_code: props.initialData.requisition_code,
      status: props.initialData.status,
      target_start_date: props.initialData.target_start_date,
      title: props.initialData.title,
    });
  }, [props.initialData, props.open]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
        <div className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {props.initialData ? 'Edit Requisition' : 'Create Requisition'}
            </DialogTitle>
            <DialogDescription className="text-base">
              Capture role demand, ownership, hiring priority, and compensation
              range.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="requisition-code">Requisition Code</Label>
              <Input
                id="requisition-code"
                value={form.requisition_code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    requisition_code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="REQ-2026-001"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="requisition-title">Job Title</Label>
              <Input
                id="requisition-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Senior Frontend Engineer"
              />
            </div>

            <div className="grid gap-2">
              <Label>Department</Label>
              <Select
                value={form.department_id ?? '__none__'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    department_id: value === '__none__' ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No department</SelectItem>
                  {props.options.departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name} ({department.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Employment Type</Label>
              <Select
                value={form.employment_type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    employment_type:
                      value as RecruitmentRequisitionPayload['employment_type'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employmentTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    priority:
                      value as RecruitmentRequisitionPayload['priority'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
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
                    status: value as RecruitmentRequisitionPayload['status'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {requisitionStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="target-start-date">Target Start Date</Label>
              <Input
                id="target-start-date"
                type="date"
                value={toDateInputValue(form.target_start_date)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    target_start_date: event.target.value || null,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="requisition-location">Location</Label>
              <Input
                id="requisition-location"
                value={form.location ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                placeholder="Bengaluru / Hybrid"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="requisition-openings">Openings</Label>
              <Input
                id="requisition-openings"
                min={1}
                type="number"
                value={form.openings}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    openings: Number(event.target.value || 1),
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Owner</Label>
              <Select
                value={form.owner_employee_id ?? '__none__'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    owner_employee_id: value === '__none__' ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No owner</SelectItem>
                  {props.options.employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Requested By</Label>
              <Select
                value={form.requested_by_employee_id ?? '__none__'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    requested_by_employee_id:
                      value === '__none__' ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select requester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No requester</SelectItem>
                  {props.options.employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label>Hiring Manager</Label>
              <Select
                value={form.hiring_manager_employee_id ?? '__none__'}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    hiring_manager_employee_id:
                      value === '__none__' ? null : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hiring manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No hiring manager</SelectItem>
                  {props.options.employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="compensation-min">Min Compensation</Label>
              <Input
                id="compensation-min"
                min={0}
                type="number"
                value={form.compensation_min ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    compensation_min: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="compensation-max">Max Compensation</Label>
              <Input
                id="compensation-max"
                min={0}
                type="number"
                value={form.compensation_max ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    compensation_max: event.target.value
                      ? Number(event.target.value)
                      : null,
                  }))
                }
              />
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="requisition-description">Description</Label>
              <Textarea
                id="requisition-description"
                rows={4}
                value={form.description ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Role scope, hiring context, must-have skills, and business impact."
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
                props.isPending ||
                !form.requisition_code.trim() ||
                !form.title.trim() ||
                form.openings < 1
              }
              onClick={() =>
                props.onSubmit({
                  ...form,
                  description: form.description?.trim() || null,
                  location: form.location?.trim() || null,
                  requisition_code: form.requisition_code.trim().toUpperCase(),
                  title: form.title.trim(),
                })
              }
            >
              {props.isPending
                ? 'Saving...'
                : props.initialData
                  ? 'Save Changes'
                  : 'Create Requisition'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
