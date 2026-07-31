import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import type {
  ApiResponse,
  EmployeeOption,
  ExitLetterOption,
} from '../../types/separation.type';
import {
  NONE,
  toDateTimeLocalInput,
  toIsoDateTime,
} from '../../utils/separation-utils';
import { uploadFileService } from '../../server/services/upload.service';

interface ExitLetterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editingLetter: ExitLetterOption | null;
  employees: EmployeeOption[];
  activeEmployees: EmployeeOption[];
  resignationOptions: { id: string; label: string }[];
  fetchResignationIdForEmployee: (employeeId: string) => Promise<string>;
  onSuccess: () => Promise<void>;
}

interface ExitLetterForm {
  employee_id: string;
  resignation_id: string;
  letter_type: 'RELIEVING' | 'EXPERIENCE';
  issued_by: string;
  issued_at: string;
  letter_number: string;
  letter_url: string;
  remarks: string;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
}

const INITIAL_FORM: ExitLetterForm = {
  employee_id: '',
  resignation_id: NONE,
  letter_type: 'RELIEVING',
  issued_by: NONE,
  issued_at: '',
  letter_number: '',
  letter_url: '',
  remarks: '',
  status: 'DRAFT',
};

export function ExitLetterDialog({
  isOpen,
  onClose,
  editingLetter,
  employees,
  fetchResignationIdForEmployee,
  onSuccess,
}: ExitLetterDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (editingLetter) {
      setForm({
        employee_id: editingLetter.employee_id,
        resignation_id: editingLetter.resignation_id ?? NONE,
        letter_type: editingLetter.letter_type,
        issued_by: editingLetter.issued_by ?? NONE,
        issued_at: toDateTimeLocalInput(editingLetter.issued_at),
        letter_number: editingLetter.letter_number ?? '',
        letter_url: editingLetter.letter_url ?? '',
        remarks: editingLetter.remarks ?? '',
        status: editingLetter.status,
      });
    } else {
      setForm(INITIAL_FORM);
    }
    setSelectedFile(null);
  }, [editingLetter, isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    let fileUrl = form.letter_url;

    if (selectedFile) {
      try {
        const uploadResult = await uploadFileService(selectedFile);
        fileUrl = uploadResult.data.url;
      } catch {
        toast.error('Failed to upload letter document');
        setIsSubmitting(false);
        return;
      }
    }

    const path = editingLetter
      ? `/api/hrms/separation/exit-letters/${editingLetter.id}`
      : '/api/hrms/separation/exit-letters';

    const payload = {
      employee_id: form.employee_id,
      resignation_id: form.resignation_id === NONE ? null : form.resignation_id,
      letter_type: form.letter_type,
      issued_by: form.issued_by === NONE ? null : form.issued_by,
      issued_at: toIsoDateTime(form.issued_at),
      letter_number: form.letter_number || null,
      letter_url: fileUrl || null,
      remarks: form.remarks || null,
      status: form.status,
    };

    try {
      const response = await fetch(path, {
        method: editingLetter ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = (await response.json().catch(() => null)) as ApiResponse<unknown> | null;

      if (!response.ok) {
        throw new Error(json?.message || 'Failed to save exit letter');
      }

      toast.success(json?.message || 'Exit letter saved successfully');
      onClose();
      await onSuccess();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save exit letter');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-2xl dark:border-slate-800 dark:bg-slate-950">
        <form className="flex max-h-[90vh] flex-col" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editingLetter ? 'Edit Letter Request' : 'Add Letter Request'}</DialogTitle>
            <DialogDescription className="text-base">
              All exit letter fields are available below.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={form.employee_id}
                  onValueChange={async (value) => {
                    setForm((prev) => ({ ...prev, employee_id: value }));
                    if (!editingLetter) {
                      const resId = await fetchResignationIdForEmployee(value);
                      if (resId !== NONE) {
                        setForm((prev) => ({ ...prev, resignation_id: resId }));
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {[employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* <div className="space-y-2">
                <Label>Resignation</Label>
                <Select
                  value={form.resignation_id}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, resignation_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resignation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {resignationOptions.map((resignation) => (
                      <SelectItem key={resignation.id} value={resignation.id}>
                        {resignation.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}

              <div className="space-y-2">
                <Label>Letter Type</Label>
                <Select
                  value={form.letter_type}
                  onValueChange={(value: 'RELIEVING' | 'EXPERIENCE') => setForm((prev) => ({ ...prev, letter_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RELIEVING">Relieving</SelectItem>
                    <SelectItem value="EXPERIENCE">Experience</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: 'DRAFT' | 'ISSUED' | 'CANCELLED') => setForm((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ISSUED">Issued</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* <div className="space-y-2">
                <Label>Issued By</Label>
                <Select
                  value={form.issued_by}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, issued_by: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select issuer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {activeEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {[employee.first_name, employee.last_name].filter(Boolean).join(' ') || employee.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}

              <div className="space-y-2">
                <Label htmlFor="issued-at">Issued On</Label>
                <Input
                  id="issued-at"
                  type="datetime-local"
                  value={form.issued_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, issued_at: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="letter-number">Letter Number</Label>
                <Input
                  id="letter-number"
                  maxLength={100}
                  value={form.letter_number}
                  onChange={(event) => setForm((prev) => ({ ...prev, letter_number: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="letter-url">Letter Document</Label>
                <Input
                  id="letter-url"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setSelectedFile(file || null);
                  }}
                />
                {editingLetter && !selectedFile && form.letter_url && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current file: <a href={form.letter_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">View</a>
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="letter-remarks">Remarks</Label>
                <Textarea
                  id="letter-remarks"
                  value={form.remarks}
                  onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))}
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
            <Button type="submit" disabled={isSubmitting || !form.employee_id}>
              {isSubmitting ? 'Saving...' : editingLetter ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
