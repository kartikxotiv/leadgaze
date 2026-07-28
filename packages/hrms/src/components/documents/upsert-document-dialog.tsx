'use client';

import { FormEvent, useEffect, useState } from 'react';

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

import { uploadFileService } from '../../server/services/upload.service';
import type {
  DocumentFormPayload,
  EmployeeDocument,
} from '../../types/document.type';
import type { Employee } from '../../types/employee.type';
import { showToast } from '../global/ToastAlert';

const emptyForm: DocumentFormPayload = {
  employeeId: '',
  name: '',
  uploadFile: '',
};

type UpsertDocumentDialogProps = {
  document?: EmployeeDocument | null;
  employees: Array<
    Pick<Employee, 'employee_code' | 'first_name' | 'id' | 'last_name'>
  >;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: DocumentFormPayload) => void;
  open: boolean;
};

export function UpsertDocumentDialog(props: UpsertDocumentDialogProps) {
  const [form, setForm] = useState<DocumentFormPayload>(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isEdit = Boolean(props.document);
  const isBusy = props.isPending || isUploading;

  useEffect(() => {
    if (!props.open) {
      return;
    }

    setForm(
      props.document
        ? {
            employeeId: props.document.employee_id ?? '',
            name: props.document.name,
            uploadFile: props.document.file_url,
          }
        : emptyForm,
    );
    setSelectedFile(null);
  }, [props.document, props.open]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let fileUrl = form.uploadFile;

    if (selectedFile) {
      setIsUploading(true);

      try {
        const uploadResult = await uploadFileService(selectedFile);
        fileUrl = uploadResult.data.url;
      } catch (error) {
        const uploadError = error as { message?: string };
        showToast(uploadError.message ?? 'Unable to upload document', 'error');
        return;
      } finally {
        setIsUploading(false);
      }
    }

    props.onSubmit({
      employeeId: form.employeeId,
      name: form.name.trim(),
      uploadFile: fileUrl,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[520px] dark:border-slate-800 dark:bg-slate-950">
        <form className="flex max-h-[90vh] flex-col" onSubmit={onSubmit}>
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="pr-12">
              {isEdit ? 'Edit Document' : 'Add Document'}
            </DialogTitle>
            <DialogDescription>
              Attach employee documents to the active Leadgaze workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document-name">Document Name</Label>
              <Input
                id="document-name"
                placeholder="Passport, ID Card, Certificate"
                required
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={form.employeeId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, employeeId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {props.employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name ?? ''} (
                      {employee.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-file">File</Label>
              <Input
                id="document-file"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                required={!isEdit}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedFile(file);

                  if (file) {
                    setForm((current) => ({
                      ...current,
                      uploadFile: file.name,
                    }));
                  }
                }}
              />
              {isEdit && !selectedFile && props.document?.file_url ? (
                <a
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                  href={props.document.file_url}
                  rel="noreferrer"
                  target="_blank"
                >
                  View current file
                </a>
              ) : null}
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
            <Button
              disabled={isBusy}
              type="button"
              variant="outline"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button disabled={isBusy} type="submit">
              {isBusy ? 'Saving...' : 'Save Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
