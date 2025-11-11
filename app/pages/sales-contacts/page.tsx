'use client';

import { useCallback, useMemo, useState } from 'react';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ReactTable } from '@/components/reuseableComponent/ReactTable';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspaceContext } from '@/hooks/use-workspace-context';
import {
  useCreateSalesContact,
  useDeleteSalesContact,
  useSalesContacts,
  useUpdateSalesContact,
} from '@/hooks/use-sales-contact';
import { useContactPlatforms, useCreateContactPlatform } from '@/hooks/use-contact-platforms';
import { DeleteConfirmDialog } from '@/components/common/delete-confirm-dialog';
import { SidebarPanel } from '@/components/common/sidebar-panel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Mail,
  AlertCircle,
  Phone,
  MapPin,
  Loader2,
  Save,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { SalesContactInsert } from '@/lib/data/sales-contacts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type StatusOptionValue = NonNullable<SalesContactInsert['status']>;

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  location: string;
  contactTimeZone: string;
  platformId: string;
  platformCustom: string;
  status: StatusOptionValue;
}

const INITIAL_FORM_STATE: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  location: '',
  contactTimeZone: '',
  platformId: '',
  platformCustom: '',
  status: 'pending',
};

const INITIAL_FORM_ERRORS: Record<keyof FormData, string> = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  location: '',
  contactTimeZone: '',
  platformId: '',
  platformCustom: '',
  status: '',
};

const STATUS_OPTIONS: Array<{ value: StatusOptionValue; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'moved_to_lead', label: 'Moved to Lead' },
  { value: 'rejected', label: 'Rejected' },
];

const ADD_PLATFORM_SELECT_VALUE = '__add_new_platform__';

function formatStatus(status?: string | null) {
  if (!status) return '';
  return status
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDateTime(value?: string | null) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function SalesContactsPage() {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = currentWorkspace?.id;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filters = useMemo(() => {
    if (!workspaceId) return undefined;
    return {
      page,
      limit: pageSize,
      workspaceId,
    };
  }, [workspaceId, page, pageSize]);

  const [addPlatformDialog, setAddPlatformDialog] = useState<{
    open: boolean;
    platformName: string;
    error: string;
    targetForm: 'add' | 'edit';
  }>({
    open: false,
    platformName: '',
    error: '',
    targetForm: 'add',
  });

  const handleAddPlatformDialogOpenChange = useCallback(
    (open: boolean, targetForm?: 'add' | 'edit') => {
      setAddPlatformDialog((prev) => ({
        open,
        platformName: open
          ? prev.open
            ? prev.platformName
            : ''
          : '',
        error: '',
        targetForm: open
          ? targetForm ?? prev.targetForm ?? 'add'
          : prev.targetForm ?? 'add',
      }));
    },
    []
  );

  const handleAddPlatformDialogPlatformNameChange = useCallback((platformName: string) => {
    setAddPlatformDialog((prev) => ({ ...prev, platformName, error: '' }));
  }, []);

  const { data: salesContacts, isLoading, isError, error } = useSalesContacts(filters);
  const { data: platformList, isLoading: platformsLoading } = useContactPlatforms();
  const createSalesContactMutation = useCreateSalesContact();
  const createContactPlatformMutation = useCreateContactPlatform();
  const updateSalesContactMutation = useUpdateSalesContact();
  const deleteSalesContactMutation = useDeleteSalesContact();
  const platformOptions = useMemo(() => platformList ?? [], [platformList]);
  const platformNameMap = useMemo(() => {
    const map = new Map<number, string>();
    platformOptions.forEach((platform) => {
      if (platform.id !== undefined && platform.id !== null) {
        map.set(platform.id, platform.name);
      }
    });
    return map;
  }, [platformOptions]);

  const tableData = useMemo(() => {
    const contacts = salesContacts?.data ?? [];
    return contacts.map((contact) => ({
      ...contact,
      company_label: contact.company_id ?? '',
      platform_label: contact.platform
        ? platformNameMap.get(contact.platform) ?? `ID ${contact.platform}`
        : '',
      status_label: formatStatus(contact.status),
      created_at_label: formatDateTime(contact.created_at),
      updated_at_label: formatDateTime(contact.updated_at),
    }));
  }, [salesContacts?.data, platformNameMap]);

  const router = useRouter();
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    salesContactId?: string;
    salesContactName?: string;
  }>({ open: false });
  const [previewSidebarOpen, setPreviewSidebarOpen] = useState(false);
  const [addSalesContactSidebarOpen, setAddSalesContactSidebarOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({ ...INITIAL_FORM_STATE });
  const [errors, setErrors] = useState<Record<keyof FormData, string>>({
    ...INITIAL_FORM_ERRORS,
  });
  const [editFormData, setEditFormData] = useState<FormData>({ ...INITIAL_FORM_STATE });
  const [editErrors, setEditErrors] = useState<Record<keyof FormData, string>>({
    ...INITIAL_FORM_ERRORS,
  });
  const isSaving =
    createSalesContactMutation.isPending || createContactPlatformMutation.isPending;
  const isAddingPlatform = createContactPlatformMutation.isPending;
  const isUpdating = updateSalesContactMutation.isPending;

  const validateField = useCallback((fieldName: keyof FormData, value: string) => {
    switch (fieldName) {
      case 'firstName':
        return !value.trim() ? 'First name is required' : '';
      case 'email':
        if (value && value.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value) ? '' : 'Please enter a valid email';
        }
        return '';
      default:
        return '';
    }
  }, []);

  const buildValidationErrors = useCallback((data: FormData) => {
    const newErrors: Record<keyof FormData, string> = {
      firstName: validateField('firstName', data.firstName),
      email: validateField('email', data.email),
      lastName: '',
      phoneNumber: '',
      location: '',
      contactTimeZone: '',
      platformId: '',
      platformCustom: '',
      status: '',
    };

    return Object.fromEntries(
      Object.entries(newErrors).filter(([, value]) => value !== '')
    ) as Record<keyof FormData, string>;
  }, [validateField]);

  const handleFormChange = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
    },
    [errors]
  );

  const handleEditFormChange = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setEditFormData((prev) => ({ ...prev, [field]: value }));

      if (editErrors[field]) {
        setEditErrors((prev) => ({ ...prev, [field]: '' }));
      }
    },
    [editErrors]
  );

  const validateForm = useCallback(() => {
    const filteredErrors = buildValidationErrors(formData);
    if (Object.keys(filteredErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...filteredErrors }));
      return false;
    }
    return true;
  }, [buildValidationErrors, formData]);

  const validateEditForm = useCallback(() => {
    const filteredErrors = buildValidationErrors(editFormData);
    if (Object.keys(filteredErrors).length > 0) {
      setEditErrors((prev) => ({ ...prev, ...filteredErrors }));
      return false;
    }
    return true;
  }, [buildValidationErrors, editFormData]);

  const resetFormState = useCallback(() => {
    setFormData(() => ({ ...INITIAL_FORM_STATE }));
    setErrors(() => ({ ...INITIAL_FORM_ERRORS }));
  }, []);

  const resetEditFormState = useCallback(() => {
    setEditFormData(() => ({ ...INITIAL_FORM_STATE }));
    setEditErrors(() => ({ ...INITIAL_FORM_ERRORS }));
  }, []);

  const mapContactToFormData = useCallback((contact: any): FormData => {
    if (!contact) {
      return { ...INITIAL_FORM_STATE };
    }

    return {
      firstName: contact.first_name ?? '',
      lastName: contact.last_name ?? '',
      email: contact.email ?? '',
      phoneNumber: contact.phone_number ?? '',
      location: contact.location ?? '',
      contactTimeZone: contact.contact_time_zone ?? '',
      platformId:
        contact.platform !== undefined && contact.platform !== null
          ? String(contact.platform)
          : '',
      platformCustom: '',
      status: (contact.status as StatusOptionValue) ?? 'pending',
    };
  }, []);
  const [previewContact, setPreviewContact] = useState<any | null>(null);

  const handleDeleteSalesContact = useCallback(
    (salesContactId: string, salesContactName: string) => {
      setDeleteDialog({
        open: true,
        salesContactId,
        salesContactName,
      });
    },
    []
  );

  const confirmDeleteSalesContact = useCallback(
    async (salesContactId?: string) => {
      if (!salesContactId) return;
      try {
        await deleteSalesContactMutation.mutateAsync(salesContactId);
        toast.success("Sales contact deleted successfully");
      } catch (err: any) {
        toast.error(err?.message || "Failed to delete sales contact");
        throw err;
      }
    },
    [deleteSalesContactMutation]
  );

  const handlePreviewContact = useCallback(
    (contact: any) => {
      setPreviewContact(contact);
      setPreviewSidebarOpen(true);
      setEditFormData(mapContactToFormData(contact));
      setEditErrors({ ...INITIAL_FORM_ERRORS });
    },
    [mapContactToFormData]
  );

  const handleSidebarOpenChange = useCallback(
    (open: boolean) => {
      setPreviewSidebarOpen(open);
      if (!open) {
        setPreviewContact(null);
        resetEditFormState();
      }
    },
    [resetEditFormState]
  );

  const handleAddSalesContactSidebarOpenChange = useCallback(
    (open: boolean) => {
      setAddSalesContactSidebarOpen(open);
      if (!open) {
        resetFormState();
      }
    },
    [resetFormState]
  );

  const handleAddPlatformDialogAddPlatform = useCallback(async () => {
    const platformName = addPlatformDialog.platformName.trim();
    const targetForm = addPlatformDialog.targetForm ?? 'add';

    if (!platformName) {
      setAddPlatformDialog((prev) => ({
        ...prev,
        error: 'Platform name is required',
      }));
      return;
    }

    const existingPlatform = platformOptions.find(
      (platform) =>
        platform.name.toLowerCase() === platformName.toLowerCase()
    );

    if (existingPlatform?.id !== undefined && existingPlatform?.id !== null) {
      if (targetForm === 'edit') {
        handleEditFormChange('platformId', String(existingPlatform.id));
      } else {
        handleFormChange('platformId', String(existingPlatform.id));
      }
      toast.success('Platform already existed, selected it for you.');
      setAddPlatformDialog({
        open: false,
        platformName: '',
        error: '',
        targetForm,
      });
      return;
    }

    try {
      const newPlatform = await createContactPlatformMutation.mutateAsync(
        platformName
      );
      if (newPlatform?.id !== undefined && newPlatform?.id !== null) {
        if (targetForm === 'edit') {
          handleEditFormChange('platformId', String(newPlatform.id));
        } else {
          handleFormChange('platformId', String(newPlatform.id));
        }
      }
      toast.success('Platform added successfully!');
      setAddPlatformDialog({
        open: false,
        platformName: '',
        error: '',
        targetForm,
      });
    } catch (error: any) {
      setAddPlatformDialog((prev) => ({
        ...prev,
        error: error?.message || 'Failed to create platform. Please try again.',
      }));
    }
  }, [
    addPlatformDialog.platformName,
    createContactPlatformMutation,
    handleEditFormChange,
    handleFormChange,
    platformOptions,
  ]);

  const handleSubmit = useCallback(
    async (saveAndExit: boolean = true) => {
      if (!currentWorkspace?.id) {
        toast.error('Please select a workspace before creating contacts.');
        return;
      }

      if (!validateForm()) {
        toast.error('Please fix the highlighted errors.');
        return;
      }

      let platformId: number | null = formData.platformId
        ? Number(formData.platformId)
        : null;

      const manualPlatformName = formData.platformCustom.trim();

      if (!platformId && manualPlatformName) {
        const existingPlatform = platformOptions.find(
          (platform) =>
            platform.name.toLowerCase() === manualPlatformName.toLowerCase()
        );

        if (existingPlatform) {
          platformId = existingPlatform.id ?? null;
        } else {
          try {
            const newPlatform = await createContactPlatformMutation.mutateAsync(
              manualPlatformName
            );
            platformId = newPlatform?.id ?? null;
          } catch (error: any) {
            toast.error(
              error?.message || 'Failed to create platform. Please try again.'
            );
            return;
          }
        }
      }

      const payload: SalesContactInsert = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim() || null,
        email: formData.email.trim() || null,
        phone_number: formData.phoneNumber.trim() || null,
        location: formData.location.trim() || null,
        contact_time_zone: formData.contactTimeZone.trim() || null,
        status: formData.status,
        workspace_id: currentWorkspace.id,
        platform: platformId,
      };

      try {
        await createSalesContactMutation.mutateAsync(payload);
        toast.success('Sales contact created successfully!');
        resetFormState();
        if (saveAndExit) {
          setAddSalesContactSidebarOpen(false);
        }
      } catch (error: any) {
        toast.error(error?.message || 'Failed to create sales contact.');
      }
    },
    [
      createContactPlatformMutation,
      createSalesContactMutation,
      currentWorkspace?.id,
      formData,
      platformOptions,
      resetFormState,
      validateForm,
    ]
  );

  const handleUpdateSubmit = useCallback(
    async () => {
      const contactId = previewContact?.id;
      if (!contactId) {
        toast.error('Select a sales contact to update.');
        return;
      }

      if (!validateEditForm()) {
        toast.error('Please fix the highlighted errors.');
        return;
      }

      let platformId: number | null = editFormData.platformId
        ? Number(editFormData.platformId)
        : null;

      const manualPlatformName = editFormData.platformCustom.trim();

      if (!platformId && manualPlatformName) {
        const existingPlatform = platformOptions.find(
          (platform) =>
            platform.name.toLowerCase() === manualPlatformName.toLowerCase()
        );

        if (existingPlatform) {
          platformId = existingPlatform.id ?? null;
        } else {
          try {
            const newPlatform = await createContactPlatformMutation.mutateAsync(
              manualPlatformName
            );
            platformId = newPlatform?.id ?? null;
          } catch (error: any) {
            toast.error(
              error?.message || 'Failed to create platform. Please try again.'
            );
            return;
          }
        }
      }

      const payload = {
        first_name: editFormData.firstName.trim(),
        last_name: editFormData.lastName.trim() || null,
        email: editFormData.email.trim() || null,
        phone_number: editFormData.phoneNumber.trim() || null,
        location: editFormData.location.trim() || null,
        contact_time_zone: editFormData.contactTimeZone.trim() || null,
        status: editFormData.status,
        platform: platformId,
      };

      try {
        const updatedContact = await updateSalesContactMutation.mutateAsync({
          id: String(contactId),
          data: payload,
        });
        toast.success('Sales contact updated successfully!');
        setPreviewContact((prev: any) => {
          if (!prev) return prev;
          const platformLabel =
            updatedContact?.platform !== undefined &&
            updatedContact?.platform !== null
              ? platformNameMap.get(updatedContact.platform) ??
                prev.platform_label ??
                ''
              : '';
          return {
            ...prev,
            ...updatedContact,
            platform_label: platformLabel,
            status_label: formatStatus(updatedContact?.status),
            created_at_label: formatDateTime(updatedContact?.created_at),
            updated_at_label: formatDateTime(updatedContact?.updated_at),
          };
        });
        setEditFormData(mapContactToFormData(updatedContact));
        setEditErrors({ ...INITIAL_FORM_ERRORS });
      } catch (error: any) {
        toast.error(error?.message || 'Failed to update sales contact.');
      }
    },
    [
      createContactPlatformMutation,
      editFormData,
      mapContactToFormData,
      platformNameMap,
      platformOptions,
      previewContact?.id,
      updateSalesContactMutation,
      validateEditForm,
    ]
  );

  const SalesContactFormFields = ({
    data,
    errors: formErrors,
    onChange,
    onPlatformSelectChange,
  }: {
    data: FormData;
    errors: Record<keyof FormData, string>;
    onChange: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
    onPlatformSelectChange: (value: string) => void;
  }) => (
    <div className="space-y-8">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
              <Input
                id="firstName"
                value={data.firstName}
                onChange={(event) => onChange('firstName', event.target.value)}
                placeholder="John"
                className={`pl-10 bg-gray-100 ${
                  formErrors.firstName ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
            </div>
            {formErrors.firstName && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {formErrors.firstName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
              <Input
                id="lastName"
                value={data.lastName}
                onChange={(event) => onChange('lastName', event.target.value)}
                placeholder="Doe"
                className="pl-10 bg-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={(event) => onChange('email', event.target.value)}
                placeholder="john.doe@example.com"
                className={`pl-10 bg-gray-100 ${
                  formErrors.email ? 'border-red-500 focus:border-red-500' : ''
                }`}
              />
            </div>
            {formErrors.email && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {formErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
              <Input
                id="phoneNumber"
                value={data.phoneNumber}
                onChange={(event) => onChange('phoneNumber', event.target.value)}
                placeholder="+1 (555) 123-4567"
                className="pl-10 bg-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 -translate-y-1/2" />
              <Input
                id="location"
                value={data.location}
                onChange={(event) => onChange('location', event.target.value)}
                placeholder="New York, USA"
                className="pl-10 bg-gray-100"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={data.status}
              onValueChange={(value) =>
                onChange('status', value as FormData['status'])
              }
            >
              <SelectTrigger className="bg-gray-100">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="platformId">Lead Platform</Label>
            <Select
              value={data.platformId}
              onValueChange={onPlatformSelectChange}
              disabled={platformsLoading}
            >
              <SelectTrigger className="bg-gray-100">
                <SelectValue
                  placeholder={
                    platformsLoading
                      ? 'Loading platforms...'
                      : platformOptions.length === 0
                      ? 'No saved platforms'
                      : 'Select a platform'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {platformOptions.length > 0 ? (
                  platformOptions.map((platform) => (
                    <SelectItem key={platform.id} value={String(platform.id)}>
                      {platform.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-platforms" disabled>
                    No saved platforms
                  </SelectItem>
                )}
                <div className="my-1 border-t border-muted-foreground/20" />
                <SelectItem
                  value={ADD_PLATFORM_SELECT_VALUE}
                  className="text-sm text-muted-foreground"
                >
                  + Add platform
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  const handlePlatformSelectChange = useCallback(
    (value: string) => {
      if (value === ADD_PLATFORM_SELECT_VALUE) {
        handleAddPlatformDialogOpenChange(true, 'add');
        return;
      }
      handleFormChange('platformId', value);
    },
    [handleAddPlatformDialogOpenChange, handleFormChange]
  );

  const handleEditPlatformSelectChange = useCallback(
    (value: string) => {
      if (value === ADD_PLATFORM_SELECT_VALUE) {
        handleAddPlatformDialogOpenChange(true, 'edit');
        return;
      }
      handleEditFormChange('platformId', value);
    },
    [handleAddPlatformDialogOpenChange, handleEditFormChange]
  );
  
  const columns = useMemo(
    () => [
      {
        id: 'first_name',
        name: 'First Name',
        selector: (row: any) => `${row.first_name || ''} ${row.last_name || ''}`.trim(),
        sortable: true,
      },
     
      {
        id: 'email',
        name: 'Email',
        selector: (row: any) => row.email || '',
        sortable: true,
      },

      {
        id: 'phone_number',
        name: 'Phone Number',
        selector: (row: any) => row.phone_number || '',
        sortable: true,
      },
     
   
      {
        id: 'location',
        name: 'Location',
        selector: (row: any) => row.location || '',
        sortable: true,
      },
      {
        id: 'platform',
        name: 'Platform',
        selector: (row: any) => row.platform_label || '',
        sortable: true,
      },
      
      {
        id: 'status',
        name: 'Status',
        selector: (row: any) => row.status_label || '',
        sortable: true,
      },
      {
        id: 'actions',
        name: 'Actions', 
        cell: (row: any) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/pages/sales-contacts/new?edit=${row.id}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={() =>
                  handleDeleteSalesContact(
                    row.id,
                    `${row.first_name || ''} ${row.last_name || ''}`.trim()
                  )
                }
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        ignoreRowClick: true,
        allowOverflow: true,
        button: true,
      },
    ],
    [handleDeleteSalesContact, router],
  );

  const totalRows = salesContacts?.count ?? 0;
  const currentPage = salesContacts?.page ?? page;

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const handleRowsPerPageChange = useCallback((nextRowsPerPage: number, nextPage: number) => {
    setPageSize(nextRowsPerPage);
    setPage(nextPage);
  }, []);

  const renderTable = () => {
    if (!workspaceId) {
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-sm text-muted-foreground">
          Select a workspace to view sales contacts.
        </div>
      );
    }

    if (isLoading) {
      return <Skeleton className="h-[420px] w-full" />;
    }

    if (isError) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load sales contacts. {message}
        </div>
      );
    }

    if (tableData.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          No sales contacts yet. Add your first contact to get started.
        </div>
      );
    }

    return (
      <ReactTable
        columns={columns}
        data={tableData}
        pagination
        paginationTotalRows={totalRows}
        paginationPerPage={pageSize}
        paginationDefaultPage={currentPage}
        onChangePage={handlePageChange}
        onChangeRowsPerPage={handleRowsPerPageChange}
        onRowClicked={handlePreviewContact}
      />
    );
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight"> Contacts</h1>
          <p className="text-sm text-muted-foreground">Manage your sales contacts</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" size="sm" >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => handleAddSalesContactSidebarOpenChange(true)}>
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="mt-6 border border-muted-foreground/30 overflow-hidden">{renderTable()}</div>





      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({
            open,
            salesContactId: open ? prev.salesContactId : undefined,
            salesContactName: open ? prev.salesContactName : undefined,
          }))
        }
        itemName={deleteDialog.salesContactName || ""}
        itemId={deleteDialog.salesContactId}
        onConfirm={confirmDeleteSalesContact}
        isLoading={deleteSalesContactMutation.isPending}
        title="Delete Sales Contact"
      />
      <SidebarPanel
        open={previewSidebarOpen}
        onOpenChange={handleSidebarOpenChange}
        title="Sales Contact Preview"
        description={
          previewContact
            ? `${previewContact.first_name || ""} ${previewContact.last_name || ""}`.trim()
            : "Select a sales contact to view details"
        }
      >
        {previewContact ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold">
                {`${previewContact.first_name || ''} ${previewContact.last_name || ''}`.trim() ||
                  'Unnamed Contact'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {previewContact.email || 'No email provided'}
              </p>
            </div>

            <SalesContactFormFields
              data={editFormData}
              errors={editErrors}
              onChange={handleEditFormChange}
              onPlatformSelectChange={handleEditPlatformSelectChange}
            />

          

            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => handleSidebarOpenChange(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                className="min-w-[140px] bg-[#45a2ff] hover:bg-[#45a2ff]/90"
                onClick={() => {
                  void handleUpdateSubmit();
                }}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Contact
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            Select a sales contact to view details.
          </div>
        )}
      </SidebarPanel>


      <SidebarPanel
        open={addSalesContactSidebarOpen}
        onOpenChange={handleAddSalesContactSidebarOpenChange}
        title="Add Sales Contact"
        description={
          "Add a new sales contact to your workspace"
        }
      >
        <div className="space-y-6">
          <CardContent className="p-1">
            <SalesContactFormFields
              data={formData}
              errors={errors}
              onChange={handleFormChange}
              onPlatformSelectChange={handlePlatformSelectChange}
            />
          </CardContent>

          <div className="flex items-end justify-end mt-4">
            <div className="flex items-center gap-3">
              {/* <Button
                variant="outline"
                onClick={() => {
                  void handleSubmit(false);
                }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save & Add Another"
                )}
              </Button> */}
              <Button
                className="min-w-[140px] bg-[#45a2ff] hover:bg-[#45a2ff]/90"
                onClick={() => {
                  void handleSubmit(true);
                }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Exit
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SidebarPanel>





    <Dialog open={addPlatformDialog.open} onOpenChange={handleAddPlatformDialogOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Platform</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            id="platformName"
            value={addPlatformDialog.platformName}
            onChange={(event) =>
              handleAddPlatformDialogPlatformNameChange(event.target.value)
            }
            placeholder="Enter platform name"
          />
          {addPlatformDialog.error && (
            <p className="text-sm text-destructive">{addPlatformDialog.error}</p>
          )}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                void handleAddPlatformDialogAddPlatform();
              }}
              disabled={isAddingPlatform}
            >
              {isAddingPlatform ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Platform'
              )}
            </Button>
          </div>
        </div>
      
      </DialogContent>
    </Dialog>

    </DashboardLayout>
  );
}

