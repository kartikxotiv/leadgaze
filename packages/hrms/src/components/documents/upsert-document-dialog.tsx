'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Button } from '@kit/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { createDocumentService, updateDocumentService } from '~/services/document.service';
import { listEmployeesService } from '~/services/employee.service';
import { uploadFileService } from '~/services/upload.service';
import type { EmployeeDocument, DocumentFormPayload } from '~/types/document.type';
import type { Employee } from '~/types/employee.type';
import { useEffect, useState } from 'react';

const formSchema = z.object({
  name: z.string().min(2, 'Document name must be at least 2 characters'),
  employeeId: z.string().uuid('Please select an employee'),
  uploadFile: z.string().min(1, 'Please select a file'),
});

interface UpsertDocumentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  document?: EmployeeDocument | null;
}

export function UpsertDocumentDialog({
  isOpen,
  onOpenChange,
  document,
}: UpsertDocumentDialogProps) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const isEdit = !!document;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: document?.name ?? '',
      employeeId: document?.employee_id ?? '',
      uploadFile: document?.file_url ?? '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: document?.name ?? '',
        employeeId: document?.employee_id ?? '',
        uploadFile: document?.file_url ?? '',
      });
      setSelectedFile(null);
    }
  }, [document, isOpen, form]);

  const employeesQuery = useQuery({
    queryKey: ['employees'],
    queryFn: listEmployeesService,
  });

  const upsertMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      let fileUrl = values.uploadFile;

      // If a new file is selected, upload it first
      if (selectedFile) {
        const uploadResult = await uploadFileService(selectedFile);
        fileUrl = uploadResult.data.url;
      }

      const payload: DocumentFormPayload = {
        name: values.name,
        employeeId: values.employeeId,
        uploadFile: fileUrl,
      };

      if (isEdit && document) {
        return updateDocumentService(document.id, payload);
      }
      return createDocumentService(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_documents'] });
      toast.success(isEdit ? 'Document updated' : 'Document created');
      onOpenChange(false);
      form.reset();
      setSelectedFile(null);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Something went wrong');
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    upsertMutation.mutate(values);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Document' : 'Add New Document'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Passport, ID Card" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employeesQuery.data?.data.map((employee: Employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.first_name} {employee.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="uploadFile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File Upload</FormLabel>
                  <FormControl>
                    <Input
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          field.onChange(file.name);
                        } else {
                          setSelectedFile(null);
                          field.onChange(document?.file_url ?? '');
                        }
                      }}
                    />
                  </FormControl>
                  {isEdit && !selectedFile && document?.file_url && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Current file: <a href={document.file_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">View</a>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'Saving...' : 'Save Document'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
