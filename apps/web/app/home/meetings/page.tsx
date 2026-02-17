'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Building2,
  Calendar as CalendarIcon,
  Clock,
  Filter,
  Loader2,
  MapPin,
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
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAccountsService } from '~/services/accounts.service';
import {
  Meeting,
  createMeetingService,
  deleteMeetingService,
  getMeetingsService,
  updateMeetingService,
} from '~/services/activities.service';
import { getContactsService } from '~/services/contacts.service';
import { getLeadsService } from '~/services/leads.service';
import { getOpportunitiesService } from '~/services/opportunities.service';

export default function MeetingsPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    meeting_link: '',
    entity_type: 'lead',
    entityId: '',
  });

  const meetingColumns = useMemo(
    () => [
      { id: 'sno', label: 'S. No.' },
      { id: 'title', label: 'Meeting Title' },
      { id: 'description', label: 'Description' },
      { id: 'location', label: 'Location' },
      { id: 'meeting_link', label: 'Meeting Link' },
      { id: 'host', label: 'Host' },
      { id: 'created_at', label: 'Created On' },
      { id: 'updated_by', label: 'Last Updated By' },
      { id: 'date_time', label: 'Date & Time' },
      { id: 'status', label: 'Status' },
      { id: 'is_public', label: 'Public' },
      { id: 'entity', label: 'Entity' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('meetings', {
      sno: true,
      title: true,
      description: false,
      location: true,
      meeting_link: false,
      host: true,
      created_at: false,
      updated_by: false,
      date_time: true,
      status: true,
      is_public: false,
      entity: true,
    });

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings', workspace?.id],
    queryFn: () => {
      if (!workspace?.id) return [];
      return getMeetingsService(workspace.id);
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
      createMeetingService({
        workspace_id: workspace!.id,
        entity_type: payload.entity_type,
        entity_id: payload.entityId,
        title: payload.title,
        description: payload.description,
        start_time: new Date(payload.start_time).toISOString(),
        end_time: new Date(payload.end_time).toISOString(),
        location: payload.location,
        meeting_link: payload.meeting_link,
      }),
    onSuccess: () => {
      toast.success('Meeting scheduled');
      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        location: '',
        meeting_link: '',
        entity_type: 'lead',
        entityId: '',
      });
      queryClient.invalidateQueries({ queryKey: ['meetings', workspace?.id] });
    },
    onError: () => toast.error('Failed to schedule meeting'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) =>
      updateMeetingService(editingMeeting!.id, payload),
    onSuccess: () => {
      toast.success('Meeting updated');
      setIsEditDialogOpen(false);
      setEditingMeeting(null);
      queryClient.invalidateQueries({ queryKey: ['meetings', workspace?.id] });
    },
    onError: () => toast.error('Failed to update meeting'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMeetingService,
    onSuccess: () => {
      toast.success('Meeting deleted');
      queryClient.invalidateQueries({ queryKey: ['meetings', workspace?.id] });
    },
    onError: () => toast.error('Failed to delete meeting'),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting: Meeting) => {
      const matchesSearch =
        meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (meeting.created_by_user?.name || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const now = new Date();
      const endTime = new Date(meeting.end_time);
      const isCompleted = endTime < now;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && isCompleted) ||
        (statusFilter === 'scheduled' && !isCompleted);

      return matchesSearch && matchesStatus;
    });
  }, [meetings, searchTerm, statusFilter]);

  const paginatedMeetings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMeetings.slice(start, start + itemsPerPage);
  }, [filteredMeetings, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);
  const totalCount = filteredMeetings.length;

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
    if (
      !formData.title.trim() ||
      !formData.entityId ||
      !formData.start_time ||
      !formData.end_time
    ) {
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title,
      description: meeting.description || '',
      start_time: new Date(meeting.start_time).toISOString().slice(0, 16),
      end_time: new Date(meeting.end_time).toISOString().slice(0, 16),
      location: meeting.location || '',
      meeting_link: meeting.meeting_link || '',
      entity_type: meeting.entity_type || 'lead',
      entityId: meeting.entity_id,
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingMeeting || !formData.title.trim()) return;
    updateMutation.mutate({
      title: formData.title,
      description: formData.description,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString(),
      location: formData.location,
      meeting_link: formData.meeting_link,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this meeting?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end < now) {
      return (
        <Badge
          variant="outline"
          className="border-green-200 bg-green-50 text-green-500"
        >
          Completed
        </Badge>
      );
    }
    if (start <= now && end >= now) {
      return (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-500"
        >
          In Progress
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="border-blue-200 bg-blue-50 text-blue-500"
      >
        Scheduled
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
      <PageHeader
        title={`Meetings (${meetings.length})`}
        description="Manage and schedule your meetings with leads and clients"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-64 lg:w-72">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by title or host..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40">
              <Filter className="mr-2 h-4 w-4 text-gray-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="h-9 gap-2"
            onClick={() => {
              setFormData({
                title: '',
                description: '',
                start_time: '',
                end_time: '',
                location: '',
                meeting_link: '',
                entity_type: 'lead',
                entityId: '',
              });
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Meeting
          </Button>

          <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" />

          <ColumnVisibilitySelector
            columns={meetingColumns}
            visibility={visibility}
            onToggle={toggleVisibility}
            onReset={reset}
          />
        </div>
      </PageHeader>

      <PageBody>
        <div className="space-y-6">
          {/* Meetings List Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isVisible('sno') && (
                      <TableHead className="w-12 whitespace-nowrap">
                        S. No.
                      </TableHead>
                    )}
                    {isVisible('title') && <TableHead>Meeting Title</TableHead>}
                    {isVisible('description') && (
                      <TableHead>Description</TableHead>
                    )}
                    {isVisible('location') && <TableHead>Location</TableHead>}
                    {isVisible('meeting_link') && (
                      <TableHead>Meeting Link</TableHead>
                    )}
                    {isVisible('host') && <TableHead>Host</TableHead>}
                    {isVisible('created_at') && (
                      <TableHead>Created On</TableHead>
                    )}
                    {isVisible('updated_by') && (
                      <TableHead>Last Updated By</TableHead>
                    )}
                    {isVisible('date_time') && (
                      <TableHead>Date & Time</TableHead>
                    )}
                    {isVisible('status') && <TableHead>Status</TableHead>}
                    {isVisible('is_public') && <TableHead>Public</TableHead>}
                    {isVisible('entity') && <TableHead>Entity</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
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
                  ) : paginatedMeetings.length > 0 ? (
                    paginatedMeetings.map((meeting: Meeting, index: number) => (
                      <TableRow key={meeting.id}>
                        {isVisible('sno') && (
                          <TableCell className="text-muted-foreground w-12">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                        )}
                        {isVisible('title') && (
                          <TableCell className="font-medium">
                            <div className="">
                              <p>{meeting.title}</p>
                            </div>
                          </TableCell>
                        )}
                        {isVisible('description') && (
                          <TableCell className="text-muted-foreground">
                            {meeting.description ? (
                              <p
                                className="max-w-[200px] truncate"
                                title={meeting.description}
                              >
                                {meeting.description}
                              </p>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        )}
                        {isVisible('location') && (
                          <TableCell className="text-muted-foreground">
                            {meeting.location ? (
                              <p className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{' '}
                                {meeting.location}
                              </p>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        )}
                        {isVisible('meeting_link') && (
                          <TableCell className="text-muted-foreground">
                            {meeting.meeting_link ? (
                              <a
                                href={meeting.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                Link
                              </a>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        )}
                        {isVisible('host') && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="bg-secondary flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold">
                                {(meeting.created_by_user?.name || 'U')
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </div>
                              <span className="text-sm">
                                {meeting.created_by_user?.name || 'System'}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        {isVisible('created_at') && (
                          <TableCell className="text-muted-foreground">
                            {meeting.created_at
                              ? new Date(
                                  meeting.created_at,
                                ).toLocaleDateString()
                              : '-'}
                          </TableCell>
                        )}
                        {isVisible('updated_by') && (
                          <TableCell className="text-muted-foreground">
                            {meeting.updated_by || '-'}
                          </TableCell>
                        )}
                        {isVisible('date_time') && (
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {new Date(
                                  meeting.start_time,
                                ).toLocaleDateString()}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {new Date(
                                  meeting.start_time,
                                ).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                -{' '}
                                {new Date(meeting.end_time).toLocaleTimeString(
                                  [],
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  },
                                )}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        {isVisible('status') && (
                          <TableCell>
                            {getStatusBadge(
                              meeting.start_time,
                              meeting.end_time,
                            )}
                          </TableCell>
                        )}
                        {isVisible('is_public') && (
                          <TableCell className="text-muted-foreground text-center">
                            {meeting.is_public ? (
                              <Badge
                                variant="outline"
                                className="border-green-200 bg-green-50 text-green-600"
                              >
                                Public
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-amber-200 bg-amber-50 text-amber-600"
                              >
                                Private
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        {isVisible('entity') && (
                          <TableCell>
                            {meeting.entity_name && (
                              <span
                                className="text-muted-foreground text-xs"
                                title={`${meeting.entity_type}: ${meeting.entity_name}`}
                              >
                                {meeting.entity_name}
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="gap-2"
                                onClick={() => handleEdit(meeting)}
                              >
                                <Pencil className="h-4 w-4" /> Edit Meeting
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-red-500"
                                onClick={() => handleDelete(meeting.id)}
                              >
                                <Trash2 className="h-4 w-4" /> Cancel/Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
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
                        No meetings found matching your filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-6 py-4">
                  <div className="text-muted-foreground text-sm">
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
                    meetings
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
            </CardContent>
          </Card>
        </div>
      </PageBody>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
                    leads.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.first_name} {lead.last_name || ''}
                      </SelectItem>
                    ))}
                  {formData.entity_type === 'contact' &&
                    contacts.map((contact: any) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name || ''}
                      </SelectItem>
                    ))}
                  {formData.entity_type === 'account' &&
                    accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name}
                      </SelectItem>
                    ))}
                  {formData.entity_type === 'opportunity' &&
                    opportunities.map((opportunity: any) => (
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
                placeholder="Demo meeting..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Meeting agenda..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start</Label>
                <div className="relative">
                  <CalendarIcon className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="datetime-local"
                    onClick={(e) => e.currentTarget.showPicker()}
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <div className="relative">
                  <CalendarIcon className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="datetime-local"
                    onClick={(e) => e.currentTarget.showPicker()}
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location / Link</Label>
              <Input
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Zoom, Google Meet, or Office..."
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={
                !formData.title.trim() ||
                !formData.entityId ||
                !formData.start_time ||
                !formData.end_time ||
                createMutation.isPending
              }
              className="w-full"
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Schedule Meeting'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Demo meeting..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Meeting agenda..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start</Label>
                <div className="relative">
                  <CalendarIcon className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="datetime-local"
                    onClick={(e) => e.currentTarget.showPicker()}
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <div className="relative">
                  <CalendarIcon className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="datetime-local"
                    onClick={(e) => e.currentTarget.showPicker()}
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location / Link</Label>
              <Input
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Zoom, Google Meet, or Office..."
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={
                !formData.title.trim() ||
                !formData.start_time ||
                !formData.end_time ||
                updateMutation.isPending
              }
              className="w-full"
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Update Meeting'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
