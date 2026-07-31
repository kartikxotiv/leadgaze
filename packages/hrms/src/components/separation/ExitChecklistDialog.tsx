import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
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
  ApiResponse,
  EmployeeOption,
  ExitChecklistItemOption,
  ExitChecklistOption,
} from '../../types/separation.type';
import {
  NONE,
  toDateInput,
  toDateTimeLocalInput,
  toIsoDateTime,
} from '../../utils/separation-utils';

interface ExitChecklistDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingChecklist: ExitChecklistOption | null;
  employees: EmployeeOption[];
  checklistItems: ExitChecklistItemOption[];
  fetchResignationIdForEmployee: (employeeId: string) => Promise<string>;
  onSuccess: () => Promise<void>;
}

interface ExitChecklistForm {
  employee_id: string;
  resignation_id: string;
  task_name: string;
  checklist_item_ids: string[];
  task_category: 'IT' | 'ADMIN' | 'HR' | 'FINANCE';
  owner_employee_id: string;
  due_date: string;
  completed_at: string;
  description: string;
  remarks: string;
}

const INITIAL_FORM: ExitChecklistForm = {
  employee_id: '',
  resignation_id: '',
  task_name: '',
  checklist_item_ids: [],
  task_category: 'IT',
  owner_employee_id: NONE,
  due_date: '',
  completed_at: '',
  description: '',
  remarks: '',
};

export function ExitChecklistDialog({
  isOpen,
  onClose,
  editingChecklist,
  employees,
  checklistItems,
  fetchResignationIdForEmployee,
  onSuccess,
}: ExitChecklistDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (editingChecklist) {
      setForm({
        employee_id: editingChecklist.employee_id,
        resignation_id: editingChecklist.resignation_id ?? '',
        task_name: editingChecklist.task_name,
        checklist_item_ids: editingChecklist.checklist_item_id
          ? [editingChecklist.checklist_item_id]
          : [],
        task_category: editingChecklist.task_category,
        owner_employee_id: editingChecklist.owner_employee_id ?? NONE,
        due_date: toDateInput(editingChecklist.due_date),
        completed_at: toDateTimeLocalInput(editingChecklist.completed_at),
        description: editingChecklist.description ?? '',
        remarks: editingChecklist.remarks ?? '',
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [editingChecklist, isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const path = editingChecklist
      ? `/api/hrms/separation/exit-checklists/${editingChecklist.id}`
      : '/api/hrms/separation/exit-checklists';

    const payload = {
      employee_id: form.employee_id,
      resignation_id: form.resignation_id || null,
      task_name: editingChecklist ? form.task_name : undefined,
      checklist_item_ids: editingChecklist
        ? undefined
        : form.checklist_item_ids,
      checklist_item_id: editingChecklist
        ? (form.checklist_item_ids[0] ?? null)
        : undefined,
      task_category: form.task_category,
      owner_employee_id:
        form.owner_employee_id === NONE ? null : form.owner_employee_id,
      due_date: form.due_date || null,
      completed_at: toIsoDateTime(form.completed_at),
      description: editingChecklist ? form.description || null : undefined,
      remarks: form.remarks || null,
    };

    try {
      const response = await fetch(path, {
        method: editingChecklist ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await response
        .json()
        .catch(() => null)) as ApiResponse<unknown> | null;

      if (!response.ok) {
        throw new Error(json?.message || 'Failed to save checklist item');
      }

      toast.success(json?.message || 'Checklist item saved successfully');
      onClose();
      await onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save checklist item',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-2xl dark:border-slate-800 dark:bg-slate-950">
        <form className="flex max-h-[90vh] flex-col" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingChecklist
                ? 'Edit Employee Checklist'
                : 'Add Employee Checklist'}
            </DialogTitle>
            <DialogDescription className="text-base">
              Assign saved checklist items to an employee.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Employee</Label>
                <Select
                  value={form.employee_id}
                  onValueChange={async (value) => {
                    setForm((prev) => ({ ...prev, employee_id: value }));
                    const resId = await fetchResignationIdForEmployee(value);
                    if (resId !== NONE) {
                      setForm((prev) => ({ ...prev, resignation_id: resId }));
                    } else {
                      setForm((prev) => ({ ...prev, resignation_id: '' }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {[employee.first_name, employee.last_name]
                          .filter(Boolean)
                          .join(' ') || employee.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 sm:col-span-2">
                <Label>Checklist Items</Label>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                  {checklistItems.length > 0 ? (
                    checklistItems.map((item) => (
                      <label
                        key={item.id}
                        className="hover:bg-muted flex cursor-pointer items-start gap-3 rounded-md p-2"
                      >
                        <Checkbox
                          checked={form.checklist_item_ids.includes(item.id)}
                          onCheckedChange={(checked) => {
                            setForm((prev) => ({
                              ...prev,
                              checklist_item_ids: checked
                                ? [...prev.checklist_item_ids, item.id]
                                : prev.checklist_item_ids.filter(
                                    (id) => id !== item.id,
                                  ),
                            }));
                          }}
                        />
                        <span className="space-y-1">
                          <span className="block text-sm font-medium">
                            {item.title}
                          </span>
                          {item.description ? (
                            <span className="text-muted-foreground block text-xs">
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Add checklist items before assigning employee checklists.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="checklist-remarks">Remarks</Label>
                <Textarea
                  id="checklist-remarks"
                  value={form.remarks}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      remarks: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checklist-due-date">Due Date</Label>
                <Input
                  id="checklist-due-date"
                  type="date"
                  value={form.due_date}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, due_date: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checklist-completed-at">Completed At</Label>
                <Input
                  id="checklist-completed-at"
                  type="datetime-local"
                  value={form.completed_at}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      completed_at: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !form.employee_id ||
                form.checklist_item_ids.length === 0
              }
            >
              {isSubmitting
                ? 'Saving...'
                : editingChecklist
                  ? 'Update'
                  : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
