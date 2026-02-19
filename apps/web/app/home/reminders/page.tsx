'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Calendar } from '@kit/ui/calendar';
import { Card, CardContent } from '@kit/ui/card';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@kit/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { useRBAC } from '~/lib/rbac/rbac-provider';
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

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function RemindersPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterView, setFilterView] = useState<
    'main' | 'status' | 'date_range' | 'priority'
  >('main');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
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
      { id: 'entity', label: 'Entity' },
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
      entity: true,
      created_by: false,
      created_at: false,
      updated_by: false,
    });

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', workspace?.id],
    queryFn: () => {
      if (!workspace?.id) return [];
      return getRemindersService(workspace.id);
    },
    enabled: !!workspace?.id,
  });

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
    mutationFn: (payload: any) =>
      createReminderService({
        workspace_id: workspace!.id,
        entity_type: payload.entity_type,
        entity_id: payload.entityId,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        due_date: payload.due_date
          ? new Date(payload.due_date).toISOString()
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
      queryClient.invalidateQueries({ queryKey: ['reminders', workspace?.id] });
    },
    onError: () => toast.error('Failed to add reminder'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) =>
      updateReminderService(editingReminder!.id, payload),
    onSuccess: () => {
      toast.success('Reminder updated');
      setIsEditDialogOpen(false);
      setEditingReminder(null);
      queryClient.invalidateQueries({ queryKey: ['reminders', workspace?.id] });
    },
    onError: () => toast.error('Failed to update reminder'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReminderService,
    onSuccess: () => {
      toast.success('Reminder deleted');
      queryClient.invalidateQueries({ queryKey: ['reminders', workspace?.id] });
    },
    onError: () => toast.error('Failed to delete reminder'),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, priorityFilter, statusFilter]);

  const filteredReminders = useMemo(() => {
    return reminders.filter((reminder: Reminder) => {
      const matchesSearch =
        reminder.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reminder.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPriority =
        priorityFilter === 'all' ||
        (reminder.priority || '').toLowerCase() === priorityFilter;

      const STATUS_COMPLETED = 'completed';
      const STATUS_PENDING = 'pending';

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === STATUS_COMPLETED && reminder.is_completed) ||
        (statusFilter === STATUS_PENDING && !reminder.is_completed);

      const reminderDate = reminder.due_date
        ? new Date(reminder.due_date)
        : null;
      const matchesDateRange =
        !reminderDate ||
        ((!dateRange.from || reminderDate >= dateRange.from) &&
          (!dateRange.to || reminderDate <= dateRange.to));

      return (
        matchesSearch && matchesPriority && matchesStatus && matchesDateRange
      );
    });
  }, [reminders, searchTerm, priorityFilter, statusFilter, dateRange]);

  const paginatedReminders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReminders.slice(start, start + itemsPerPage);
  }, [filteredReminders, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredReminders.length / itemsPerPage);
  const totalCount = filteredReminders.length;

  const safeShowPicker = (
    e: React.MouseEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
  ) => {
    try {
      if ('showPicker' in e.currentTarget) {
        (e.currentTarget as any).showPicker();
      }
    } catch (error) {
      console.warn('showPicker not supported or failed:', error);
    }
  };

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

  if (!workspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-[100dvh] flex-col">
        <div className="flex shrink-0 flex-col gap-2">
          <PageHeader
            title={`Reminders (${reminders.length})`}
            description="Keep track of your important tasks and reminders"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <div
                  className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${
                    isSearchOpen ? 'w-64 lg:w-72' : 'w-9'
                  }`}
                >
                  {isSearchOpen ? (
                    <div className="relative w-full">
                      <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                      <Input
                        ref={searchInputRef}
                        placeholder="Search tasks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 pl-10"
                        onBlur={() => {
                          if (!searchTerm) setIsSearchOpen(false);
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="border-input hover:bg-accent flex h-9 w-9 items-center justify-center rounded-md border bg-transparent"
                          onClick={() => setIsSearchOpen(true)}
                        >
                          <Search className="h-4 w-4 text-gray-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Search</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
              <Popover
                open={isFilterOpen}
                onOpenChange={(open) => {
                  setIsFilterOpen(open);
                  if (!open) setFilterView('main');
                }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        className={`border-input hover:bg-accent relative flex h-9 w-9 items-center justify-center rounded-md border bg-transparent ${
                          isFilterOpen ? 'bg-accent' : ''
                        }`}
                      >
                        <Filter className="h-4 w-4 text-gray-400" />
                        {(statusFilter !== 'all' ||
                          priorityFilter !== 'all' ||
                          dateRange.from ||
                          dateRange.to) && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#4eacff] text-[10px] font-bold text-white">
                            {(statusFilter !== 'all' ? 1 : 0) +
                              (priorityFilter !== 'all' ? 1 : 0) +
                              (dateRange.from || dateRange.to ? 1 : 0)}
                          </span>
                        )}
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Filter</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                      {filterView !== 'main' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setFilterView('main')}
                        >
                          <ChevronLeftIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <span className="text-sm font-semibold">
                        {filterView === 'main'
                          ? 'Filters'
                          : filterView === 'status'
                            ? 'Filter by Status'
                            : filterView === 'priority'
                              ? 'Filter by Priority'
                              : 'Filter by Date Range'}
                      </span>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-foreground text-xs underline"
                      onClick={() => {
                        setStatusFilter('all');
                        setPriorityFilter('all');
                        setDateRange({ from: undefined, to: undefined });
                      }}
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="p-2">
                    {filterView === 'main' && (
                      <div className="flex flex-col gap-1">
                        <button
                          className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md p-3 text-left text-sm font-medium transition-colors"
                          onClick={() => setFilterView('status')}
                        >
                          <div className="flex flex-col gap-1">
                            <span>Status</span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {statusFilter === 'all'
                                ? 'All statuses'
                                : statusFilter.charAt(0).toUpperCase() +
                                  statusFilter.slice(1)}
                            </span>
                          </div>
                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        </button>
                        <button
                          className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md p-3 text-left text-sm font-medium transition-colors"
                          onClick={() => setFilterView('priority')}
                        >
                          <div className="flex flex-col gap-1">
                            <span>Priority</span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {priorityFilter === 'all'
                                ? 'All priorities'
                                : priorityFilter.charAt(0).toUpperCase() +
                                  priorityFilter.slice(1)}
                            </span>
                          </div>
                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        </button>
                        <button
                          className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md p-3 text-left text-sm font-medium transition-colors"
                          onClick={() => setFilterView('date_range')}
                        >
                          <div className="flex flex-col gap-1">
                            <span>Date Range</span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {dateRange.from || dateRange.to
                                ? `${dateRange.from?.toLocaleDateString() || ''} - ${dateRange.to?.toLocaleDateString() || ''}`
                                : 'All time'}
                            </span>
                          </div>
                          <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    )}

                    {filterView === 'status' && (
                      <div className="flex flex-col gap-1 p-1">
                        {[
                          { id: 'all', label: 'All Statuses' },
                          { id: 'pending', label: 'Pending' },
                          { id: 'completed', label: 'Completed' },
                        ].map((s) => {
                          const isChecked = statusFilter === s.id;
                          return (
                            <label
                              key={s.id}
                              className={`group hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${
                                isChecked ? 'bg-muted/40' : ''
                              }`}
                            >
                              <input
                                type="radio"
                                name="status-filter"
                                className="sr-only"
                                checked={isChecked}
                                onChange={() => setStatusFilter(s.id)}
                              />
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                  isChecked
                                    ? 'border-primary bg-transparent'
                                    : 'border-white/30 bg-transparent group-hover:border-white/50'
                                }`}
                              >
                                {isChecked && (
                                  <div className="bg-primary animate-in fade-in zoom-in h-2 w-2 rounded-full duration-200" />
                                )}
                              </div>
                              <span className="truncate font-medium text-gray-200">
                                {s.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {filterView === 'priority' && (
                      <div className="flex flex-col gap-1 p-1">
                        {[
                          { id: 'all', label: 'All Priorities' },
                          { id: 'high', label: 'High' },
                          { id: 'medium', label: 'Medium' },
                          { id: 'low', label: 'Low' },
                        ].map((p) => {
                          const isChecked = priorityFilter === p.id;
                          return (
                            <label
                              key={p.id}
                              className={`group hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${
                                isChecked ? 'bg-muted/40' : ''
                              }`}
                            >
                              <input
                                type="radio"
                                name="priority-filter"
                                className="sr-only"
                                checked={isChecked}
                                onChange={() => setPriorityFilter(p.id)}
                              />
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                  isChecked
                                    ? 'border-primary bg-transparent'
                                    : 'border-white/30 bg-transparent group-hover:border-white/50'
                                }`}
                              >
                                {isChecked && (
                                  <div className="bg-primary animate-in fade-in zoom-in h-2 w-2 rounded-full duration-200" />
                                )}
                              </div>
                              <span className="truncate font-medium text-gray-200">
                                {p.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {filterView === 'date_range' && (
                      <div className="flex flex-col gap-4 p-2">
                        <Calendar
                          mode="range"
                          selected={{
                            from: dateRange.from,
                            to: dateRange.to,
                          }}
                          onSelect={(range) =>
                            setDateRange({
                              from: range?.from,
                              to: range?.to,
                            })
                          }
                          initialFocus
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              setDateRange({ from: today, to: today });
                            }}
                          >
                            Today
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              const today = new Date();
                              const lastWeek = new Date();
                              lastWeek.setDate(today.getDate() - 7);
                              setDateRange({ from: lastWeek, to: today });
                            }}
                          >
                            Last 7 Days
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {/* <Button
                className="h-9 gap-2"
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
              >
                <Plus className="h-4 w-4" />
                New Reminder
              </Button> */}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="h-9 w-9 bg-[#4eacff] p-0 text-white hover:bg-[none]"
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
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>

                <TooltipContent side="bottom">
                  <p>New Reminder</p>
                </TooltipContent>
              </Tooltip>

              <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" />

              <ColumnVisibilitySelector
                columns={reminderColumns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            </div>
          </PageHeader>
        </div>

        <PageBody className="sticky -mt-6 flex min-h-0 flex-1 shrink-0 flex-col overflow-hidden pt-6">
          <div className="flex min-h-0 flex-1 flex-col space-y-6">
            {/* Reminders List Table */}
            <Card className="flex min-h-0 flex-1 flex-col border-none shadow-none">
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <div className="sticky flex flex-1 overflow-auto rounded-lg">
                  <Table>
                    <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                      <TableRow>
                        {isVisible('sno') && (
                          <TableHead className="w-12 whitespace-nowrap">
                            S. No.
                          </TableHead>
                        )}
                        {isVisible('title') && (
                          <TableHead>Task Title</TableHead>
                        )}
                        {isVisible('description') && (
                          <TableHead>Description</TableHead>
                        )}
                        {isVisible('priority') && (
                          <TableHead>Priority</TableHead>
                        )}
                        {isVisible('due_date') && (
                          <TableHead>Due Date</TableHead>
                        )}
                        {isVisible('status') && <TableHead>Status</TableHead>}
                        {isVisible('entity') && <TableHead>Entity</TableHead>}
                        {isVisible('created_by') && (
                          <TableHead>Created By</TableHead>
                        )}
                        {isVisible('created_at') && (
                          <TableHead>Created On</TableHead>
                        )}
                        {isVisible('updated_by') && (
                          <TableHead>Last Updated By</TableHead>
                        )}
                        <TableHead className="bg-card sticky right-0 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell
                            colSpan={
                              visibility
                                ? Object.values(visibility).filter(
                                    (v) => v !== false,
                                  ).length + 1
                                : 6
                            }
                            className="h-24 text-center"
                          >
                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                          </TableCell>
                        </TableRow>
                      ) : paginatedReminders.length > 0 ? (
                        paginatedReminders.map(
                          (reminder: Reminder, index: number) => (
                            <TableRow key={reminder.id}>
                              {isVisible('sno') && (
                                <TableCell className="text-muted-foreground w-12">
                                  {(currentPage - 1) * itemsPerPage + index + 1}
                                </TableCell>
                              )}
                              {isVisible('title') && (
                                <TableCell className="font-medium">
                                  <div className="">{reminder.title}</div>
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
                                    ? new Date(
                                        reminder.due_date,
                                      ).toLocaleString()
                                    : '-'}
                                </TableCell>
                              )}
                              {isVisible('status') && (
                                <TableCell>
                                  {getStatusBadge(reminder.is_completed)}
                                </TableCell>
                              )}
                              {isVisible('entity') && (
                                <TableCell>
                                  {reminder.entity_name && (
                                    <span
                                      className="text-muted-foreground text-xs"
                                      title={`${reminder.entity_type}: ${reminder.entity_name}`}
                                    >
                                      {reminder.entity_name}
                                    </span>
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
                                    ? new Date(
                                        reminder.created_at,
                                      ).toLocaleDateString()
                                    : '-'}
                                </TableCell>
                              )}
                              {isVisible('updated_by') && (
                                <TableCell className="text-muted-foreground">
                                  {reminder.updated_by || '-'}
                                </TableCell>
                              )}
                              <TableCell className="bg-card sticky right-0 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
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
                                      <Trash2 className="h-4 w-4" /> Delete
                                      Reminder
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
                                ? Object.values(visibility).filter(
                                    (v) => v !== false,
                                  ).length + 1
                                : 6
                            }
                            className="text-muted-foreground h-24 text-center"
                          >
                            No reminders found matching your filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalCount > 1 && (
              <div className="text-muted-foreground bg-sidebar sticky bottom-0 z-10 -mx-4 -mb-4 flex shrink-0 items-center justify-between border-t p-4 px-4 lg:-mx-8 lg:-mb-8 lg:px-8">
                <div>
                  Showing{' '}
                  <span className="text-foreground font-medium">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{' '}
                  to{' '}
                  <span className="text-foreground font-medium">
                    {Math.min(currentPage * itemsPerPage, totalCount)}
                  </span>{' '}
                  of{' '}
                  <span className="text-foreground font-medium">
                    {totalCount}
                  </span>{' '}
                  reminders
                </div>
                <Pagination className="w-auto">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        className={
                          currentPage === 1
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          isActive={currentPage === i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className="cursor-pointer"
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        className={
                          currentPage === totalPages
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </PageBody>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-4">
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
              <div className="relative">
                <CalendarIcon className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                <Input
                  type="datetime-local"
                  onClick={(e) => e.currentTarget.showPicker()}
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              onClick={handleCreate}
              disabled={
                !formData.title.trim() ||
                !formData.entityId ||
                !formData.due_date ||
                createMutation.isPending
              }
              className="w-full"
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Save Reminder'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
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
              <div className="relative">
                <CalendarIcon className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                <Input
                  type="datetime-local"
                  onClick={(e) => e.currentTarget.showPicker()}
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={
                !formData.title.trim() ||
                !formData.due_date ||
                updateMutation.isPending
              }
              className="w-full"
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Update Reminder'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
