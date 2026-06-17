'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Building2,
  Edit,
  Loader2,
  MoreHorizontal,
  MoreVertical,
  Plus,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { formatDate } from '@kit/shared/utils';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
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
import { Textarea } from '@kit/ui/textarea';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';
import { Skeleton } from '@kit/ui/skeleton';
import { ListToolBar } from '@kit/ui/list-toolbar';
import CustomTableContainer from '@kit/ui/custom-table-container';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAccountsService } from '~/services/accounts.service';
import {
  Note,
  createNoteService,
  deleteNoteService,
  getNotesService,
  updateNoteService,
} from '~/services/activities.service';
import { getContactsService } from '~/services/contacts.service';
import { getLeadsService } from '~/services/leads.service';
import { getOpportunitiesService } from '~/services/opportunities.service';

function NotesPageSkeleton() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-52" />
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
            <Table className="w-max min-w-full border-separate border-spacing-0 text-sm">
              <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-12 whitespace-nowrap">S. No.</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Associate With</TableHead>
                  <TableHead>Note Content</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="sticky right-0 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(12)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-[52px] px-4 py-2" colSpan={6}>
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

export default function NotesPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [entityType, setEntityType] = useState('lead');
  const [entityId, setEntityId] = useState('');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState('');

  const noteColumns = useMemo(
    () => [
      { id: 'sno', label: 'S. No.' },
      { id: 'category', label: 'Category' },
      { id: 'associate', label: 'Associate With' },
      { id: 'content', label: 'Note Content' },
      { id: 'author', label: 'Author' },
      { id: 'updated_at', label: 'Updated At' },
      { id: 'created_by', label: 'Created By' },
      { id: 'created_at', label: 'Created On' },
      { id: 'updated_by', label: 'Last Updated By' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('notes', {
      sno: true,
      category: true,
      associate: true,
      content: true,
      author: true,
      updated_at: false,
      created_by: false,
      created_at: false,
      updated_by: false,
    });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const res = await getNotesService(workspace.id);
      return res;
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
    mutationFn: (payload: {
      content: string;
      entity_type: string;
      entity_id: string;
    }) =>
      createNoteService({
        workspace_id: workspace!.id,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        content: payload.content,
      }),
    onSuccess: () => {
      toast.success('Note added');
      setIsCreateDialogOpen(false);
      setNewNoteContent('');
      setEntityType('lead');
      setEntityId('');
      queryClient.invalidateQueries({ queryKey: ['notes', workspace?.id] });
    },
    onError: () => toast.error('Failed to add note'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateNoteService(id, { content }),
    onSuccess: () => {
      toast.success('Note updated');
      setIsEditDialogOpen(false);
      setEditingNote(null);
      queryClient.invalidateQueries({ queryKey: ['notes', workspace?.id] });
    },
    onError: () => toast.error('Failed to update note'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNoteService,
    onSuccess: () => {
      toast.success('Note deleted');
      queryClient.invalidateQueries({ queryKey: ['notes', workspace?.id] });
    },
    onError: () => toast.error('Failed to delete note'),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note: Note) => {
      const matchesSearch = note.content
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === 'all' ||
        note.entity_type?.toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [notes, searchTerm, categoryFilter]);

  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNotes.slice(start, start + itemsPerPage);
  }, [filteredNotes, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const totalCount = filteredNotes.length;

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setEditContent(note.content);
    setIsEditDialogOpen(true);
  };

  const handleCreate = () => {
    if (!newNoteContent.trim() || !entityId) return;
    createMutation.mutate({
      content: newNoteContent,
      entity_type: entityType,
      entity_id: entityId,
    });
  };

  const handleUpdate = () => {
    if (!editingNote || !editContent.trim()) return;
    updateMutation.mutate({ id: editingNote.id, content: editContent });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      deleteMutation.mutate(id);
    }
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
        key: 'entity',
        label: 'Entity',
        selectedValue: categoryFilter === 'all' ? '' : categoryFilter,
        selectedLabel: categoryFilter === 'all'
          ? 'All entities'
          : categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1) + 's',
        options: [
          { value: 'lead', label: 'Leads' },
          { value: 'contact', label: 'Contacts' },
          { value: 'account', label: 'Accounts' },
          { value: 'opportunity', label: 'Opportunities' },
        ],
        onSelect: (val: string) => setCategoryFilter(val || 'all'),
      },
    ];
  }, [categoryFilter]);

  if (!workspace) {
    return <NotesPageSkeleton />;
  }

  return (
    <>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          title={`Notes (${notes.length})`}
          description="Capture and organize your important thoughts and information"
        />
      </div>

      {/* Full-width search / filter / actions toolbar */}
      <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2 pt-2">
        <ListToolBar
          showSearch
          searchPlaceholder="Search notes..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          showFilter
          filterLabel="Show Filters"
          filterGroups={filterGroups}
          activeFilterCount={categoryFilter !== 'all' ? 1 : 0}
          onClearFilters={() => setCategoryFilter('all')}
          actions={[
            {
              key: 'add',
              label: 'New Note',
              icon: Plus,
              onClick: () => {
                setNewNoteContent('');
                setEntityType('lead');
                setEntityId('');
                setIsCreateDialogOpen(true);
              },
              show: true,
              buttonVariant: 'default',
            },
          ]}
          columnVisibilitySlot={
            <ColumnVisibilitySelector
              columns={noteColumns}
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
            pagination={totalCount > 0 && (
              <div className="primary-text-regular text-leadgaze-muted bg-sidebar sticky bottom-0 z-10 -mx-4 flex shrink-0 items-center justify-between border-t px-4 py-1.5 lg:-mx-8 lg:px-8">
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
                  notes
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
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {isVisible('sno') && (
                    <TableHead className="w-12 whitespace-nowrap">
                      S. No.
                    </TableHead>
                  )}
                  {isVisible('category') && <TableHead>Category</TableHead>}
                  {isVisible('associate') && <TableHead>Associate With</TableHead>}
                  {isVisible('content') && <TableHead className="min-w-[300px]">Note Content</TableHead>}
                  {isVisible('author') && <TableHead>Author</TableHead>}
                  {isVisible('updated_at') && <TableHead>Updated At</TableHead>}
                  {isVisible('created_by') && <TableHead>Created By</TableHead>}
                  {isVisible('created_at') && <TableHead>Created On</TableHead>}
                  {isVisible('updated_by') && <TableHead>Last Updated By</TableHead>}
                  <TableHead className="sticky-right-header">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {[...Array(10)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell
                          className="h-[52px] px-4 py-2"
                          colSpan={
                            visibility
                              ? Object.values(visibility).filter((v) => v !== false).length + 1
                              : 6
                          }
                        >
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : paginatedNotes.length > 0 ? (
                  paginatedNotes.map((note: Note, index: number) => (
                    <TableRow key={note.id} className="hover:bg-muted/50">
                      {isVisible('sno') && (
                        <TableCell className="text-muted-foreground w-12">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                      )}
                      {isVisible('category') && (
                        <TableCell>
                          {getCategoryBadge(note.entity_type)}
                        </TableCell>
                      )}
                      {isVisible('associate') && (
                        <TableCell>
                          {note.entity_id ? (
                            <Link
                              href={`/home/sales/${note.entity_type === 'opportunity' ? 'opportunities' : `${note.entity_type}s`}/${note.entity_id}`}
                              className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary inline-block max-w-[150px] truncate text-sm"
                              title={note.entity_name || 'General'}
                            >
                              {note.entity_name || '-'}
                            </Link>
                          ) : (
                            <span
                              className="inline-block max-w-[150px] truncate text-sm font-medium"
                              title={note.entity_name || 'General'}
                            >
                              {note.entity_name || '-'}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {isVisible('content') && (
                        <TableCell className="primary-text-medium">
                          <p className="line-clamp-2 max-w-[400px] text-sm whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </TableCell>
                      )}
                      {isVisible('author') && (
                        <TableCell className="text-muted-foreground text-sm">
                          {note.created_by_user?.name || '-'}
                        </TableCell>
                      )}
                      {isVisible('updated_at') && (
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(note.updated_at || note.created_at)}
                        </TableCell>
                      )}
                      {isVisible('created_by') && (
                        <TableCell className="text-muted-foreground text-sm">
                          {note.created_by_user?.name || '-'}
                        </TableCell>
                      )}
                      {isVisible('created_at') && (
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(note.created_at)}
                        </TableCell>
                      )}
                      {isVisible('updated_by') && (
                        <TableCell className="text-muted-foreground text-sm">
                          {note.updated_by || '-'}
                        </TableCell>
                      )}
                      <TableCell className="bg-card sticky right-0 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => handleEdit(note)}
                            >
                              <Edit className="h-4 w-4" /> Edit Note
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-red-500"
                              onClick={() => handleDelete(note.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Delete Note
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
                          ? Object.values(visibility).filter((v) => v !== false).length + 1
                          : 10
                      }
                      className="text-muted-foreground h-24 text-center"
                    >
                      {searchTerm || categoryFilter !== 'all'
                        ? 'No notes match your search.'
                        : 'No notes found for this workspace.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CustomTableContainer>
        </div>
      </PageBody>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col p-0 max-w-[600px]">
          <DialogHeader className="border-b p-6 pb-4">
            <DialogTitle>Add New Note</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-4">
              <Label>Associate with</Label>
              <RadioGroup
                value={entityType}
                onValueChange={(val) => {
                  setEntityType(val);
                  setEntityId('');
                }}
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

              <Select value={entityId} onValueChange={setEntityId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${entityType}...`} />
                </SelectTrigger>
                <SelectContent>
                  {entityType === 'lead' &&
                    leads?.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.first_name} {lead.last_name || ''} (
                        {lead.company_name || 'No Company'})
                      </SelectItem>
                    ))}
                  {entityType === 'contact' &&
                    contacts.map((contact: any) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name || ''}
                      </SelectItem>
                    ))}
                  {entityType === 'account' &&
                    accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name}
                      </SelectItem>
                    ))}
                  {entityType === 'opportunity' &&
                    opportunities.map((opportunity: any) => (
                      <SelectItem key={opportunity.id} value={opportunity.id}>
                        {opportunity.opportunity_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note Content</Label>
              <Textarea
                placeholder="Enter note content..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <div className="border-t p-6 mt-auto flex justify-end gap-2">
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
                createMutation.isPending ||
                !newNoteContent.trim() ||
                !entityId
              }
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col p-0">
          <DialogHeader className="border-b p-6 pb-4">
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <Textarea
              placeholder="Enter note content..."
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
            />
          </div>
          <div className="border-t p-6 mt-auto flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !editContent.trim()}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
