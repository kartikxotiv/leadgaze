/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from '@kit/ui/textarea';
import { Button } from '@kit/ui/button';
import { showToast } from '~/components/global/ToastAlert';
import { createRoleService, updateRoleService } from '~/services/rbac.service';

const roleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color'),
  hierarchy_level: z.coerce.number().min(1).max(100),
});

type RoleFormValues = z.infer<typeof roleSchema>;

export function RoleFormDialog({
  children,
  initialData,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  children?: React.ReactNode;
  initialData?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;

  const queryClient = useQueryClient();
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: initialData?.role_name || '',
      description: initialData?.description || '',
      color: initialData?.color || '#3b82f6',
      hierarchy_level: initialData?.hierarchy_level || 1,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: RoleFormValues) => {
      if (initialData?.id) {
        return updateRoleService(initialData.id, values);
      }
      return createRoleService(values);
    },
    onSuccess: () => {
      showToast(initialData ? 'Role updated successfully' : 'Role created successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to save role', 'error');
    },
  });

  function onSubmit(values: RoleFormValues) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-md dark:border-slate-800 dark:bg-slate-950">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-h-[90vh] flex-col">
            <DialogHeader>
              <DialogTitle>{initialData ? 'Edit Role' : 'Create Custom Role'}</DialogTitle>
              <DialogDescription className="text-base">
                Defines a new role for your organization. You can configure permissions after creating the role.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              <FormField
                control={form.control}
                name={'name'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder={'e.g. Content Manager'} {...field} disabled={initialData?.is_system} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={'description'}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={'Describe what this role is for...'}
                        className={'resize-none'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className={'grid grid-cols-2 gap-4'}>
                <FormField
                  control={form.control}
                  name={'color'}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Theme Color</FormLabel>
                      <FormControl>
                        <div className={'flex items-center gap-2'}>
                          <Input type={'color'} className={'h-10 w-12 p-1'} {...field} />
                          <Input {...field} placeholder={'#ffffff'} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={'hierarchy_level'}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hierarchy Rank</FormLabel>
                      <FormControl>
                        <Input type={'number'} min={1} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type={'button'} variant={'outline'} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type={'submit'} disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : initialData ? 'Save Changes' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
