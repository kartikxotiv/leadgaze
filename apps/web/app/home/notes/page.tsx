/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Edit,
  Filter,
  Loader2,
  MoreHorizontal,
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
import { Textarea } from '@kit/ui/textarea';
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
  Note,
  createNoteService,
  deleteNoteService,
  getNotesService,
  updateNoteService,
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

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function NotesPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [filterView, setFilterView] = useState<'main' | 'entity'>('main');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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
        <div className="bg-sidebar flex shrink-0 flex-col gap-2">
          <PageHeader
            title={`Notes (${notes.length})`}
            description="Capture and organize your important thoughts and information"
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
                        placeholder="Search notes..."
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
                        {categoryFilter !== 'all' && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#4eacff] text-[10px] font-bold text-white">
                            1
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
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <span className="text-sm font-semibold">
                        {filterView === 'main' ? 'Filters' : 'Filter by Entity'}
                      </span>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-foreground text-xs underline"
                      onClick={() => {
                        setCategoryFilter('all');
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
                          onClick={() => setFilterView('entity')}
                        >
                          <div className="flex flex-col gap-1">
                            <span>Entity</span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {categoryFilter === 'all'
                                ? 'All entities'
                                : categoryFilter.charAt(0).toUpperCase() +
                                  categoryFilter.slice(1) +
                                  's'}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    )}

                    {filterView === 'entity' && (
                      <div className="flex flex-col gap-1 p-1">
                        {[
                          { id: 'all', label: 'All Entities' },
                          { id: 'lead', label: 'Leads' },
                          { id: 'contact', label: 'Contacts' },
                          { id: 'account', label: 'Accounts' },
                          { id: 'opportunity', label: 'Opportunities' },
                        ].map((e) => {
                          const isChecked = categoryFilter === e.id;
                          return (
                            <label
                              key={e.id}
                              className={`group hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${
                                isChecked ? 'bg-muted/40' : ''
                              }`}
                            >
                              <input
                                type="radio"
                                name="entity-filter"
                                className="sr-only"
                                checked={isChecked}
                                onChange={() => setCategoryFilter(e.id)}
                              />
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                  isChecked
                                    ? 'border-white bg-transparent'
                                    : 'border-white/30 bg-transparent group-hover:border-white/50'
                                }`}
                              >
                                {isChecked && (
                                  <div className="animate-in fade-in zoom-in h-2 w-2 rounded-full bg-white duration-200" />
                                )}
                              </div>
                              <span className="truncate font-medium text-gray-200">
                                {e.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {/* <Button
                className="h-9 gap-2"
                onClick={() => {
                  setNewNoteContent('');
                  setEntityType('lead');
                  setEntityId('');
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                New Note
              </Button> */}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="h-9 w-9 bg-[#4eacff] p-0 text-white hover:bg-[none]"
                    onClick={() => {
                      setNewNoteContent('');
                      setEntityType('lead');
                      setEntityId('');
                      setIsCreateDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>

                <TooltipContent side="bottom">
                  <p>New Note</p>
                </TooltipContent>
              </Tooltip>

              <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" />

              <ColumnVisibilitySelector
                columns={noteColumns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            </div>
          </PageHeader>
        </div>
        <PageBody className="sticky -mt-6 flex min-h-0 flex-1 shrink-0 flex-col overflow-hidden pt-6">
          <div className="flex min-h-0 flex-1 flex-col space-y-6">
            {/* Notes Table */}
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
                        {isVisible('category') && (
                          <TableHead>Category</TableHead>
                        )}
                        {isVisible('associate') && (
                          <TableHead>Associate With</TableHead>
                        )}
                        {isVisible('content') && (
                          <TableHead className="min-w-[300px]">
                            Note Content
                          </TableHead>
                        )}
                        {isVisible('author') && <TableHead>Author</TableHead>}
                        {isVisible('updated_at') && (
                          <TableHead>Updated At</TableHead>
                        )}
                        {isVisible('created_by') && (
                          <TableHead>Created By</TableHead>
                        )}
                        {isVisible('created_at') && (
                          <TableHead>Created On</TableHead>
                        )}
                        {isVisible('updated_by') && (
                          <TableHead>Last Updated By</TableHead>
                        )}
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
                      ) : paginatedNotes.length > 0 ? (
                        paginatedNotes.map((note: Note, index: number) => (
                          <TableRow key={note.id}>
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
                                <span
                                  className="inline-block max-w-[150px] truncate text-sm font-medium"
                                  title={note.entity_name || 'General'}
                                >
                                  {note.entity_name || '-'}
                                </span>
                              </TableCell>
                            )}
                            {isVisible('content') && (
                              <TableCell>
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
                                {new Date(
                                  note.updated_at || note.created_at,
                                ).toLocaleDateString()}
                              </TableCell>
                            )}
                            {isVisible('created_by') && (
                              <TableCell className="text-muted-foreground text-sm">
                                {note.created_by_user?.name || '-'}
                              </TableCell>
                            )}
                            {isVisible('created_at') && (
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(note.created_at).toLocaleDateString()}
                              </TableCell>
                            )}
                            {isVisible('updated_by') && (
                              <TableCell className="text-muted-foreground text-sm">
                                {note.updated_by || '-'}
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
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
                                ? Object.values(visibility).filter(
                                    (v) => v !== false,
                                  ).length + 1
                                : 6
                            }
                            className="text-muted-foreground h-24 text-center"
                          >
                            {searchTerm || categoryFilter !== 'all'
                              ? 'No notes found matching your filters.'
                              : 'No notes found for this workspace.'}
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
          </div>
        </PageBody>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
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
            <div className="flex justify-end gap-2">
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Textarea
              placeholder="Enter note content..."
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={6}
            />
            <div className="flex justify-end gap-2">
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
