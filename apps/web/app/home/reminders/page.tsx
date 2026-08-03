'use client';

import React, { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Loader2,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { DateTimePicker } from '@kit/ui/datetime-picker';
import { AddColumnModal } from '@kit/ui/add-column-modal';
import { format } from 'date-fns';
import { useLocalization } from '@kit/shared/localization';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Calendar } from '@kit/ui/calendar';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import CustomTableContainer from '@kit/ui/custom-table-container';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@kit/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Skeleton } from '@kit/ui/skeleton';
import { SortableTableHead } from '@kit/ui/sortable-table-head';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { TablePagination } from '@kit/ui/table-pagination';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';
import { useTableSort } from '@kit/ui/use-table-sort';
import { cn } from '@kit/ui/utils';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { useDebounce } from '~/lib/hooks/use-debounce';
import { usePackageMembers } from '~/lib/hooks/use-package-members';
import { getAccountsService } from '~/services/accounts.service';
import {
  Reminder,
  createReminderService,
  deleteReminderService,
  getRemindersService,
  updateReminderService,
} from '~/services/activities.service';
import { getContactsService } from '~/services/contacts.service';
import { getLeadsService } from '~/services/leads.service';
import { getOpportunitiesService } from '~/services/opportunities.service';

function RemindersPageSkeleton() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-60" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-6 pb-6">
        <div className="flex min-h-0 flex-1 flex-col px-4 lg:px-8">
          <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
            <Table className="w-max min-w-full caption-bottom border-separate border-spacing-0 text-sm">
              <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12 whitespace-nowrap">
                    S. No.
                  </TableHead>
                  <TableHead>Reminder Title</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="sticky-right-header z-10 w-12 px-1 text-center">
                    <Button
                      type="button"
                      size="icon"
                      className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-leadgaze-primary text-white hover:bg-leadgaze-primary/90 border-0 p-0 shadow-xs"
                      onClick={() => setAddColumnModalOpen(true)}
                      title="Toggle Columns"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(10)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-[32px] px-4 py-2" colSpan={7}>
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RemindersPage() {
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const itemsPerPage = pageSize;
  const {
    dateRange: createdOnRange,
    setDateRange: setCreatedOnRange,
    computedDates: computedCreatedOnDates,
    clearDateRange: clearCreatedOnRange,
  } = useDateRangeFilter();
  const {
    dateRange: updatedOnRange,
    setDateRange: setUpdatedOnRange,
    computedDates: computedUpdatedOnDates,
    clearDateRange: clearUpdatedOnRange,
  } = useDateRangeFilter('updated');

  const [selectedCreatedByIds, setSelectedCreatedByIds] = useState<string[]>([]);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { members } = usePackageMembers();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const { formatDate } = useLocalization();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    entity_type: 'lead',
    entityId: '',
  });

  const reminderColumns = useMemo(
    () => [
      { id: 'sno', label: 'S. No.' },
      { id: 'title', label: 'Reminder Title' },
      { id: 'description', label: 'Description' },
      { id: 'due_date', label: 'Due Date' },
      { id: 'priority', label: 'Priority' },
      { id: 'status', label: 'Status' },
      { id: 'category', label: 'Entity' },
      { id: 'associate', label: 'Associate With' },
      { id: 'created_by', label: 'Created By' },
      { id: 'created_at', label: 'Created On' },
      { id: 'updated_by', label: 'Last Updated By' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('reminders', {
      sno: true,
      title: true,
      description: false,
      due_date: true,
      priority: true,
      status: true,
      category: true,
      associate: true,
      created_by: false,
      created_at: false,
      updated_by: false,
    });

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('reminders');

  const { data: remindersResponse, isLoading } = useQuery({
    queryKey: [
      'reminders',
      workspace?.id,
      currentPage,
      pageSize,
      statusFilter,
      priorityFilter,
      debouncedSearchTerm,
      selectedCreatedByIds,
      computedCreatedOnDates,
      computedUpdatedOnDates,
    ],
    queryFn: () => {
      if (!workspace?.id) return { data: [], total: 0 };
      const apiStatus =
        statusFilter === 'completed'
          ? 'completed'
          : statusFilter === 'pending'
            ? 'active'
            : undefined;
      return getRemindersService(workspace.id, undefined, undefined, {
        page: currentPage,
        limit: pageSize,
        status: apiStatus,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        searchTerm: debouncedSearchTerm || undefined,
        createdAtFrom: computedCreatedOnDates?.from,
        createdAtTo: computedCreatedOnDates?.to,
        updatedAtFrom: computedUpdatedOnDates?.from,
        updatedAtTo: computedUpdatedOnDates?.to,
        createdByIds: selectedCreatedByIds.length > 0 ? selectedCreatedByIds : undefined,
      });
    },
    enabled: !!workspace?.id,
  });

  const reminders = useMemo(() => {
    if (Array.isArray(remindersResponse)) return remindersResponse;
    return remindersResponse?.data || [];
  }, [remindersResponse]);

  const totalCount = useMemo(() => {
    if (Array.isArray(remindersResponse)) return remindersResponse.length;
    return remindersResponse?.total ?? reminders.length;
  }, [remindersResponse, reminders]);

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const res = await getLeadsService({ workspaceId: workspace?.id });
      return res?.data ?? [];
    },
    enabled: !!workspace?.id,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const res = await getContactsService({ workspaceId: workspace?.id });
      return res?.data ?? [];
    },
    enabled: !!workspace?.id,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const res = await getAccountsService({ workspaceId: workspace?.id });
      return res?.data ?? [];
    },
    enabled: !!workspace?.id,
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const res = await getOpportunitiesService({ workspaceId: workspace?.id });
      return res?.data ?? [];
    },
    enabled: !!workspace?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      createReminderService({
        workspace_id: workspace!.id,
        entity_type: data.entity_type,
        entity_id: data.entityId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        due_date: data.due_date
          ? new Date(data.due_date).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      toast.success('Reminder added');
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium',
        entity_type: 'lead',
        entityId: '',
      });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: () => toast.error('Failed to add reminder'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; [key: string]: any }) =>
      updateReminderService(id, payload),
    onSuccess: () => {
      toast.success('Reminder updated');
      setIsEditDialogOpen(false);
      setEditingReminder(null);
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: () => toast.error('Failed to update reminder'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReminderService(id),
    onSuccess: () => {
      toast.success('Reminder deleted');
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
    onError: () => toast.error('Failed to delete reminder'),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    priorityFilter,
    statusFilter,
    selectedCreatedByIds,
    pageSize,
    createdOnRange,
    updatedOnRange,
  ]);

  const filteredReminders = useMemo(() => {
    return reminders;
  }, [reminders]);

  const { sortColumn, sortDirection, toggleSort, sortedData } =
    useTableSort<Reminder>('reminders', filteredReminders, {
      onSortChange: () => setCurrentPage(1),
    });

  const paginatedReminders = sortedData;

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  const handleCreate = () => {
    if (!formData.title.trim() || !formData.entityId || !formData.due_date)
      return;
    createMutation.mutate(formData);
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      due_date: reminder.due_date
        ? new Date(reminder.due_date).toISOString().slice(0, 16)
        : '',
      priority: reminder.priority || 'medium',
      entity_type: reminder.entity_type || 'lead',
      entityId: reminder.entity_id,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingReminder || !formData.title.trim() || !formData.due_date)
      return;
    updateMutation.mutate({
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      due_date: formData.due_date
        ? new Date(formData.due_date).toISOString()
        : null,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleCompletion = (reminder: Reminder) => {
    updateReminderService(reminder.id, {
      is_completed: !reminder.is_completed,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['reminders', workspace?.id] });
      toast.success(
        reminder.is_completed
          ? 'Reminder marked as active'
          : 'Reminder marked as completed',
      );
    });
  };

  const formatDueDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    const dateMidnight = new Date(date);
    dateMidnight.setHours(0, 0, 0, 0);

    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);

    const timeDiff = dateMidnight.getTime() - todayMidnight.getTime();
    const dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));

    if (dayDiff === 0) return 'Today';
    if (dayDiff === 1) return 'Tomorrow';
    if (dayDiff > 1) return `In ${dayDiff} days`;
    if (dayDiff === -1) return 'Yesterday';
    if (dayDiff < -1) return 'Overdue';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return (
          <Badge
            variant="outline"
            className="border-red-200 bg-red-50 text-red-600"
          >
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-600"
          >
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-600"
          >
            Low
          </Badge>
        );
      default:
        return <Badge variant="secondary">{priority || 'Medium'}</Badge>;
    }
  };

  const getStatusBadge = (completed: boolean) => {
    if (completed) {
      return (
        <Badge
          variant="outline"
          className="border-green-200 bg-green-50 text-green-500"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="border-blue-200 bg-blue-50 text-blue-500"
      >
        <Clock className="mr-1 h-3 w-3" /> Pending
      </Badge>
    );
  };

  const getCategoryBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'lead':
        return (
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-600"
          >
            Lead
          </Badge>
        );
      case 'contact':
        return (
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-600"
          >
            Contact
          </Badge>
        );
      case 'opportunity':
        return (
          <Badge
            variant="outline"
            className="border-purple-200 bg-purple-50 text-purple-600"
          >
            Opportunity
          </Badge>
        );
      case 'account':
        return (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-600"
          >
            Account
          </Badge>
        );
      default:
        return <Badge variant="secondary">{type || 'General'}</Badge>;
    }
  };

  const filterGroups = useMemo(() => {
    return [
      {
        key: 'status',
        label: 'Status',
        selectedValue: statusFilter === 'all' ? '' : statusFilter,
        selectedLabel:
          statusFilter === 'all'
            ? 'All statuses'
            : statusFilter === 'pending'
              ? 'Pending'
              : 'Completed',
        options: [
          { value: 'pending', label: 'Pending' },
          { value: 'completed', label: 'Completed' },
          { value: 'all', label: 'All' },
        ],
        onSelect: (val: string) => setStatusFilter(val || 'all'),
      },
      {
        key: 'priority',
        label: 'Priority',
        selectedValue: priorityFilter === 'all' ? '' : priorityFilter,
        selectedLabel:
          priorityFilter === 'all'
            ? 'All priorities'
            : priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1),
        options: [
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ],
        onSelect: (val: string) => setPriorityFilter(val || 'all'),
      },
      {
        key: 'created_by',
        label: 'Created By',
        selectedValues: selectedCreatedByIds,
        selectedLabel:
          selectedCreatedByIds.length === 0
            ? 'All members'
            : selectedCreatedByIds.length === 1
              ? ((
                  members.find(
                    (m: any) => m.user_id === selectedCreatedByIds[0],
                  ) as any
                )?.user?.user_metadata?.full_name ?? '1 selected')
              : `${selectedCreatedByIds.length} selected`,
        options: members
          .filter((m: any) => m.user_id)
          .map((m: any) => ({
            value: m.user_id,
            label:
              m.user?.user_metadata?.full_name ||
              m.user?.email ||
              m.user_id,
          })),
        onSelectValues: setSelectedCreatedByIds,
      },
      {
        key: 'created_on',
        label: 'Created On',
        type: 'date',
        dateValue: createdOnRange,
        onDateChange: (val) => {
          setCreatedOnRange(val);
          setCurrentPage(1);
        },
      },
      {
        key: 'updated_on',
        label: 'Updated On',
        type: 'date',
        dateValue: updatedOnRange,
        onDateChange: (val) => {
          setUpdatedOnRange(val);
          setCurrentPage(1);
        },
      },
    ];
  }, [statusFilter, priorityFilter, dateRange, createdOnRange, updatedOnRange, selectedCreatedByIds, members]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (priorityFilter !== 'all') count++;
    if (selectedCreatedByIds.length > 0) count++;
    if (dateRange.from || dateRange.to) count++;
    if (createdOnRange) count++;
    if (updatedOnRange) count++;
    return count;
  }, [statusFilter, priorityFilter, selectedCreatedByIds, dateRange, createdOnRange, updatedOnRange]);

  const handleClearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setSelectedCreatedByIds([]);
    setDateRange({ from: undefined, to: undefined });
    clearCreatedOnRange();
    clearUpdatedOnRange();
  };

  if (!workspace) {
    return <RemindersPageSkeleton />;
  }

  return (
    <>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          title={`Reminders`}          
        >
          <Button
            onClick={() => {
              setFormData({
                title: '',
                description: '',
                due_date: '',
                priority: 'medium',
                entity_type: 'lead',
                entityId: '',
              });
              setIsCreateDialogOpen(true);
            }}
            className="secondary-text-small-bold gap-1.5 px-2 bg-leadgaze-primary hover:bg-leadgaze-primary text-white"
          >
            <Plus className="h-4 w-4" />
            New Reminder
          </Button>
        </PageHeader>
      </div>

      {/* Full-width search / filter / actions toolbar */}
      <div className="flex w-full max-w-full min-w-0 shrink-0 items-center justify-between border-top-bottom-gray">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {[
            { id: 'all', label: 'All Reminders' },
            { id: 'pending', label: 'Pending' },
            { id: 'completed', label: 'Completed' }
          ].map((status) => {
            const isSelected = statusFilter === status.id;
            return (
              <button
                key={status.id}
                onClick={() => {
                  setStatusFilter(status.id);
                  setCurrentPage(1);
                }}
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-1 primary-text-medium",
                  isSelected
                    ? "border-leadgaze-primary text-leadgaze-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                {status.id === 'all' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                )}
                {status.label}
              </button>
            );
          })}
        </div>

        <ListToolBar
          align="right"
          className="border-none bg-transparent p-0"
          showSearch
          expandableSearch
          searchPlaceholder="Search"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          showFilter
          filterLabel="Show Filters"
          filterGroups={filterGroups}
          activeFilterCount={activeFilterCount}
          onClearFilters={handleClearFilters}
          actions={[]}
          columnVisibilitySlot={
            <ColumnVisibilitySelector
              columns={reminderColumns}
              visibility={visibility}
              onToggle={toggleVisibility}
              onReset={reset}
            />
          }
        />
      </div>

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
          <CustomTableContainer
            pagination={
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(val) => {
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                entityLabel="reminders"
              />
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {isVisible('sno') && (
                    <SortableTableHead
                      label="S. No."
                      columnId="sno"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      sortable={false}
                      className="relative w-12 whitespace-nowrap"
                      {...getHeaderProps('sno')}
                    >
                      <span
                        className="col-resize-handle"
                        data-min-width={30}
                        {...getResizeHandleProps('sno')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('title') && (
                    <SortableTableHead
                      label="Task Title"
                      columnId="title"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('title')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('title')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('description') && (
                    <SortableTableHead
                      label="Description"
                      columnId="description"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      sortable={false}
                      {...getHeaderProps('description')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('description')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('priority') && (
                    <SortableTableHead
                      label="Priority"
                      columnId="priority"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('priority')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('priority')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('due_date') && (
                    <SortableTableHead
                      label="Due Date"
                      columnId="due_date"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('due_date')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('due_date')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('status') && (
                    <SortableTableHead
                      label="Status"
                      columnId="status"
                      sortKey="is_completed"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('status')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('status')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('category') && (
                    <SortableTableHead
                      label="Entity"
                      columnId="category"
                      sortKey="entity_type"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('category')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('category')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('associate') && (
                    <SortableTableHead
                      label="Associate With"
                      columnId="associate"
                      sortKey="entity_name"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('associate')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('associate')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('created_by') && (
                    <SortableTableHead
                      label="Created By"
                      columnId="created_by"
                      sortKey="created_by_user.name"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('created_by')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('created_by')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('created_at') && (
                    <SortableTableHead
                      label="Created On"
                      columnId="created_at"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('created_at')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('created_at')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('updated_by') && (
                    <SortableTableHead
                      label="Last Updated By"
                      columnId="updated_by"
                      sortKey="updated_by_user.name"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('updated_by')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('updated_by')}
                      />
                    </SortableTableHead>
                  )}
                  <TableHead className="sticky-right-header z-10 w-12 px-1 text-center">
                    <Button
                      type="button"
                      size="icon"
                      className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-leadgaze-primary text-white hover:bg-leadgaze-primary/90 border-0 p-0 shadow-xs"
                      onClick={() => setAddColumnModalOpen(true)}
                      title="Toggle Columns"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[...Array(10)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell
                          className="h-[32px] px-4 py-2"
                          colSpan={
                            visibility
                              ? Object.values(visibility).filter(
                                  (v) => v !== false,
                                ).length + 1
                              : 7
                          }
                        >
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : paginatedReminders.length > 0 ? (
                  paginatedReminders.map(
                    (reminder: Reminder, index: number) => (
                      <TableRow key={reminder.id} className="hover:bg-muted/50">
                        {isVisible('sno') && (
                          <TableCell className="text-muted-foreground w-12">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                        )}
                        {isVisible('title') && (
                          <TableCell className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
                            <span>{reminder.title}</span>
                          </TableCell>
                        )}
                        {isVisible('description') && (
                          <TableCell className="text-muted-foreground">
                            {reminder.description ? (
                              <p
                                className="max-w-[200px] truncate"
                                title={reminder.description}
                              >
                                {reminder.description}
                              </p>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        )}
                        {isVisible('priority') && (
                          <TableCell>
                            {getPriorityBadge(reminder.priority)}
                          </TableCell>
                        )}
                        {isVisible('due_date') && (
                          <TableCell className="text-muted-foreground">
                            {reminder.due_date
                              ? `${formatDate(reminder.due_date)} ${new Date(reminder.due_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                              : '-'}
                          </TableCell>
                        )}
                        {isVisible('status') && (
                          <TableCell>
                            {getStatusBadge(reminder.is_completed)}
                          </TableCell>
                        )}
                        {isVisible('category') && (
                          <TableCell>
                            {getCategoryBadge(reminder.entity_type)}
                          </TableCell>
                        )}
                        {isVisible('associate') && (
                          <TableCell>
                            {reminder.entity_name && (
                              <Link
                                href={`/home/sales/${reminder.entity_type === 'opportunity' ? 'opportunities' : `${reminder.entity_type}s`}/${reminder.entity_id}`}
                                className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary text-xs font-medium hover:underline"
                                title={`${reminder.entity_type}: ${reminder.entity_name}`}
                              >
                                {reminder.entity_name}
                              </Link>
                            )}
                          </TableCell>
                        )}
                        {isVisible('created_by') && (
                          <TableCell className="text-muted-foreground">
                            {reminder.created_by_user?.name || '-'}
                          </TableCell>
                        )}
                        {isVisible('created_at') && (
                          <TableCell className="text-muted-foreground">
                            {reminder.created_at
                              ? formatDate(reminder.created_at)
                              : '-'}
                          </TableCell>
                        )}
                        {isVisible('updated_by') && (
                          <TableCell className="text-muted-foreground">
                            {reminder.updated_by || '-'}
                          </TableCell>
                        )}
                        <TableCell className="sticky right-0 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => handleEdit(reminder)}
                              >
                                <Pencil className="h-4 w-4" /> Edit Task
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-green-600"
                                onClick={() => toggleCompletion(reminder)}
                              >
                                <CheckCircle2 className="h-4 w-4" />{' '}
                                {reminder.is_completed
                                  ? 'Mark as Pending'
                                  : 'Mark as Completed'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-red-500"
                                onClick={() => handleDelete(reminder.id)}
                              >
                                <Trash2 className="h-4 w-4" /> Delete Reminder
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ),
                  )
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={
                        visibility
                          ? Object.values(visibility).filter((v) => v !== false)
                              .length + 1
                          : 10
                      }
                      className="text-muted-foreground h-24 text-center"
                    >
                      No reminders match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CustomTableContainer>
        </div>
      
      <AddColumnModal
        open={addColumnModalOpen}
        onOpenChange={setAddColumnModalOpen}
        columns={reminderColumns}
        visibility={visibility}
        onToggleColumn={toggleVisibility}
        onResetColumns={reset}
      />
      </PageBody>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col p-0">
          <DialogHeader>
            <DialogTitle>Add New Reminder</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-2 overflow-y-auto px-2">
            <div className="space-y-2">
              <Label>Associate with</Label>
              <RadioGroup
                value={formData.entity_type}
                onValueChange={(val) =>
                  setFormData({ ...formData, entity_type: val, entityId: '' })
                }
                className="flex flex-wrap gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lead" id="lead" />
                  <Label
                    htmlFor="lead"
                    className="flex cursor-pointer items-center gap-1"
                  >
                    <User className="h-3 w-3" /> Lead
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contact" id="contact" />
                  <Label
                    htmlFor="contact"
                    className="flex cursor-pointer items-center gap-1"
                  >
                    <Users className="h-3 w-3" /> Contact
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="account" id="account" />
                  <Label
                    htmlFor="account"
                    className="flex cursor-pointer items-center gap-1"
                  >
                    <Building2 className="h-3 w-3" /> Account
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="opportunity" id="opportunity" />
                  <Label
                    htmlFor="opportunity"
                    className="flex cursor-pointer items-center gap-1"
                  >
                    <Briefcase className="h-3 w-3" /> Opportunity
                  </Label>
                </div>
              </RadioGroup>

              <Select
                value={formData.entityId}
                onValueChange={(val) =>
                  setFormData({ ...formData, entityId: val })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={`Select ${formData.entity_type}...`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {formData.entity_type === 'lead' &&
                    leads?.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.first_name} {lead.last_name || ''}
                      </SelectItem>
                    ))}
                  {formData.entity_type === 'contact' &&
                    contacts?.map((contact: any) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name || ''}
                      </SelectItem>
                    ))}
                  {formData.entity_type === 'account' &&
                    accounts?.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name}
                      </SelectItem>
                    ))}
                  {formData.entity_type === 'opportunity' &&
                    opportunities?.map((opportunity: any) => (
                      <SelectItem key={opportunity.id} value={opportunity.id}>
                        {opportunity.opportunity_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Call client..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Add more details..."
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(val) =>
                  setFormData({ ...formData, priority: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <DateTimePicker
                  showTime
                  value={formData.due_date ? new Date(formData.due_date) : undefined}
                  onChange={(date) =>
                    setFormData({ ...formData, due_date: date ? format(date, "yyyy-MM-dd'T'HH:mm") : '' })
                  }
                />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !formData.title.trim() ||
                !formData.entityId ||
                !formData.due_date ||
                createMutation.isPending
              }
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col p-0">
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-2 px-6 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Call client..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Add more details..."
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(val) =>
                  setFormData({ ...formData, priority: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <DateTimePicker
                  showTime
                  value={formData.due_date ? new Date(formData.due_date) : undefined}
                  onChange={(date) =>
                    setFormData({ ...formData, due_date: date ? format(date, "yyyy-MM-dd'T'HH:mm") : '' })
                  }
                />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.title.trim() ||
                !formData.due_date ||
                updateMutation.isPending
              }
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
