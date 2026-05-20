'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import Image from 'next/image';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  FileCode,
  FileImage,
  FileText,
  FileType,
  FileUp,
  Filter,
  Loader2,
  File as LucideFile,
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
  Document,
  createDocumentService,
  deleteDocumentService,
  getDocumentsService,
  updateDocumentService,
} from '~/services/activities.service';
import { getContactsService } from '~/services/contacts.service';
import { getLeadsService } from '~/services/leads.service';
import { getOpportunitiesService } from '~/services/opportunities.service';

export default function DocumentPage() {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [filterView, setFilterView] = useState<'main' | 'type' | 'entity'>(
    'main',
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [newName, setNewName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState('lead');
  const [entityId, setEntityId] = useState('');

  const documentColumns = useMemo(
    () => [
      { id: 'sno', label: 'S. No.' },
      { id: 'name', label: 'Name' },
      { id: 'type', label: 'Type' },
      { id: 'size', label: 'Size' },
      { id: 'uploader', label: 'Uploaded By' },
      { id: 'entity', label: 'Entity' },
      { id: 'last_modified', label: 'Last Modified' },
      { id: 'created_by', label: 'Created By' },
      { id: 'created_at', label: 'Created On' },
      { id: 'updated_by', label: 'Last Updated By' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('documents', {
      sno: true,
      name: true,
      type: true,
      size: true,
      uploader: true,
      entity: true,
      last_modified: false,
      created_by: false,
      created_at: false,
      updated_by: false,
    });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', workspace?.id],
    queryFn: () => {
      if (!workspace?.id) return [];
      return getDocumentsService(workspace.id);
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
      file: File;
      entity_type: string;
      entity_id: string;
    }) =>
      createDocumentService({
        workspace_id: workspace!.id,
        entity_type: payload.entity_type,
        entity_id: payload.entity_id,
        file: payload.file,
      }),
    onSuccess: () => {
      toast.success('Document uploaded');
      setIsUploadDialogOpen(false);
      setFile(null);
      setEntityType('lead');
      setEntityId('');
      queryClient.invalidateQueries({ queryKey: ['documents', workspace?.id] });
    },
    onError: () => toast.error('Failed to upload document'),
  });

  const updateMutation = useMutation({
    mutationFn: (name: string) =>
      updateDocumentService(editingDoc!.id, { name }),
    onSuccess: () => {
      toast.success('Document renamed');
      setIsEditDialogOpen(false);
      setEditingDoc(null);
      queryClient.invalidateQueries({ queryKey: ['documents', workspace?.id] });
    },
    onError: () => toast.error('Failed to rename document'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocumentService,
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['documents', workspace?.id] });
    },
    onError: () => toast.error('Failed to delete document'),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, entityTypeFilter]);

  const getFileTypeCategory = (fileType: string): string => {
    const t = (fileType || '').toLowerCase();
    if (t.includes('pdf')) return 'pdf';
    if (
      t.includes('image') ||
      t.includes('png') ||
      t.includes('jpg') ||
      t.includes('jpeg')
    )
      return 'image';
    if (
      t.includes('sheet') ||
      t.includes('excel') ||
      t.includes('xlsx') ||
      t.includes('xls') ||
      t.includes('csv')
    )
      return 'sheet';
    return 'document';
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc: Document) => {
      const matchesSearch = doc.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const category = getFileTypeCategory(doc.file_type || '');
      const matchesType = typeFilter === 'all' || category === typeFilter;

      const matchesEntityType =
        entityTypeFilter === 'all' ||
        doc.entity_type?.toLowerCase() === entityTypeFilter.toLowerCase();

      return matchesSearch && matchesType && matchesEntityType;
    });
  }, [documents, searchTerm, typeFilter, entityTypeFilter]);

  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(start, start + itemsPerPage);
  }, [filteredDocuments, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const totalCount = filteredDocuments.length;

  const handleUpload = () => {
    if (!file || !entityId) return;
    createMutation.mutate({
      file,
      entity_type: entityType,
      entity_id: entityId,
    });
  };

  const handleEdit = (doc: Document) => {
    setEditingDoc(doc);
    setNewName(doc.name);
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingDoc || !newName.trim()) return;
    updateMutation.mutate(newName);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      deleteMutation.mutate(id);
    }
  };

  const getFileIcon = (type: string) => {
    const category = getFileTypeCategory(type);
    if (category === 'pdf')
      return <FileText className="h-4 w-4 text-red-500" />;
    if (category === 'image')
      return <FileImage className="h-4 w-4 text-blue-500" />;
    if (category === 'sheet')
      return <FileType className="h-4 w-4 text-green-500" />;
    return <LucideFile className="h-4 w-4 text-gray-500" />;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeDisplay = (fileType: string): string => {
    const t = (fileType || '').toLowerCase();
    const category = getFileTypeCategory(t);

    if (category === 'image') {
      return fileType || 'Image';
    }

    if (category === 'pdf') return 'PDF';
    if (category === 'sheet') {
      if (t.includes('csv')) return 'CSV';
      return 'Sheet';
    }

    return 'Document';
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
            className='bg-sidebar'
            title={`Documents (${documents.length})`}
            description="Manage and organize your files and documents"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <div
                  className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${isSearchOpen ? 'w-64 lg:w-72' : 'w-9'
                    }`}
                >
                  {isSearchOpen ? (
                    <div className="relative w-full">
                      <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-400" />
                      <Input
                        ref={searchInputRef}
                        placeholder="Search by document name"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-8 pl-10"
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
                          className="border-input hover:bg-accent -mr-6 flex h-8 w-8 items-center justify-center rounded-md border bg-transparent bg-white text-gray-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                          onClick={() => setIsSearchOpen(true)}
                        >
                          <Search className="h-4 w-4 text-gray-500 dark:text-white" />
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
                        className={`border-input hover:bg-accent relative flex h-8 w-8 items-center justify-center rounded-md border bg-transparent bg-white dark:border-zinc-700 dark:bg-zinc-900 ${isFilterOpen ? 'bg-accent' : ''
                          }`}
                      >
                        <Filter className="h-4 w-4 text-gray-500 dark:text-white" />
                        {(typeFilter !== 'all' ||
                          entityTypeFilter !== 'all') && (
                            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#4eacff] text-[10px] font-bold text-white">
                              {(typeFilter !== 'all' ? 1 : 0) +
                                (entityTypeFilter !== 'all' ? 1 : 0)}
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
                        {filterView === 'main'
                          ? 'Filters'
                          : filterView === 'type'
                            ? 'Filter by Type'
                            : 'Filter by Entity'}
                      </span>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-foreground text-xs underline"
                      onClick={() => {
                        setTypeFilter('all');
                        setEntityTypeFilter('all');
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
                          onClick={() => setFilterView('type')}
                        >
                          <div className="flex flex-col gap-1">
                            <span>File Type</span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {typeFilter === 'all'
                                ? 'All types'
                                : typeFilter.toUpperCase()}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </button>
                        <button
                          className="hover:bg-muted/50 flex w-full items-center justify-between rounded-md p-3 text-left text-sm font-medium transition-colors"
                          onClick={() => setFilterView('entity')}
                        >
                          <div className="flex flex-col gap-1">
                            <span>Entity</span>
                            <span className="text-muted-foreground text-xs font-normal">
                              {entityTypeFilter === 'all'
                                ? 'All entities'
                                : entityTypeFilter.charAt(0).toUpperCase() +
                                entityTypeFilter.slice(1) +
                                's'}
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                    )}

                    {filterView === 'type' && (
                      <div className="flex flex-col gap-1 p-1">
                        {[
                          { id: 'all', label: 'All Types' },
                          { id: 'pdf', label: 'PDF' },
                          { id: 'image', label: 'Images' },
                          { id: 'sheet', label: 'Spreadsheets' },
                          { id: 'document', label: 'Documents' },
                        ].map((t) => {
                          const isChecked = typeFilter === t.id;
                          return (
                            <label
                              key={t.id}
                              className={`group hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${isChecked ? 'bg-muted/40' : ''
                                }`}
                            >
                              <input
                                type="radio"
                                name="type-filter"
                                className="sr-only"
                                checked={isChecked}
                                onChange={() => setTypeFilter(t.id)}
                              />
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${isChecked
                                    ? 'border-[#4eacff] bg-[#4eacff]'
                                    : 'border-gray-300 group-hover:border-gray-400'
                                  }`}
                              >
                                {isChecked && (
                                  <div className="animate-in fade-in zoom-in h-1.5 w-1.5 rounded-full bg-white duration-200" />
                                )}
                              </div>
                              <span
                                className={`truncate font-medium transition-colors ${isChecked
                                    ? 'text-[#4eacff]'
                                    : 'text-foreground'
                                  }`}
                              >
                                {t.label}
                              </span>
                            </label>
                          );
                        })}
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
                          const isChecked = entityTypeFilter === e.id;
                          return (
                            <label
                              key={e.id}
                              className={`group hover:bg-muted/80 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-all ${isChecked ? 'bg-muted/40' : ''
                                }`}
                            >
                              <input
                                type="radio"
                                name="entity-filter"
                                className="sr-only"
                                checked={isChecked}
                                onChange={() => setEntityTypeFilter(e.id)}
                              />
                              <div
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${isChecked
                                    ? 'border-[#4eacff] bg-[#4eacff]'
                                    : 'border-gray-300 group-hover:border-gray-400'
                                  }`}
                              >
                                {isChecked && (
                                  <div className="animate-in fade-in zoom-in h-1.5 w-1.5 rounded-full bg-white duration-200" />
                                )}
                              </div>
                              <span
                                className={`truncate font-medium transition-colors ${isChecked
                                    ? 'text-[#4eacff]'
                                    : 'text-foreground'
                                  }`}
                              >
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
                  setFile(null);
                  setEntityType('lead');
                  setEntityId('');
                  setIsUploadDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                
              </Button> */}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="-mr-2 h-8 w-8 bg-white p-0 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
                    onClick={() => {
                      setFile(null);
                      setEntityType('lead');
                      setEntityId('');
                      setIsUploadDialogOpen(true);
                    }}
                  >
                    <Image
                      src="/images/upload-file.png"
                      alt="Upload"
                      width={16}
                      height={16}
                      className="h-4.5 w-4.5 dark:invert"
                    />
                  </Button>
                </TooltipTrigger>

                <TooltipContent side="bottom">
                  <p>Upload File</p>
                </TooltipContent>
              </Tooltip>

              <div />

              {/* <div className="mx-1 hidden h-6 w-px bg-gray-200 lg:block" /> */}

              <ColumnVisibilitySelector
                columns={documentColumns}
                visibility={visibility}
                onToggle={toggleVisibility}
                onReset={reset}
              />
            </div>
          </PageHeader>
        </div>
        <PageBody className="bg-sidebar sticky flex min-h-0 flex-1 shrink-0 flex-col overflow-hidden pt-6 pb-6">
          <div className="flex min-h-0 flex-1 flex-col space-y-6">
            {/* Documents List Table */}
            <Card className="flex min-h-0 flex-1 flex-col border-none shadow-none">
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <div className="listing-table-container min-w-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg pb-6">
                  <table className="w-max min-w-full caption-bottom border-separate border-spacing-0 text-sm">
                    <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                      <TableRow>
                        {isVisible('sno') && (
                          <TableHead className="w-12 whitespace-nowrap">
                            S. No.
                          </TableHead>
                        )}
                        {isVisible('name') && <TableHead>Name</TableHead>}
                        {isVisible('type') && <TableHead>Type</TableHead>}
                        {isVisible('size') && <TableHead>Size</TableHead>}
                        {isVisible('uploader') && (
                          <TableHead>Uploaded By</TableHead>
                        )}
                        {isVisible('entity') && <TableHead>Entity</TableHead>}
                        {isVisible('last_modified') && (
                          <TableHead>Last Modified At</TableHead>
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
                        <TableHead className="bg-card sticky right-0 px-4 text-right">
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
                      ) : paginatedDocs.length > 0 ? (
                        paginatedDocs.map((doc: Document, index: number) => (
                          <TableRow key={doc.id} className="hover:bg-muted/50">
                            {isVisible('sno') && (
                              <TableCell className="text-muted-foreground w-12">
                                {(currentPage - 1) * itemsPerPage + index + 1}
                              </TableCell>
                            )}
                            {isVisible('name') && (
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  {getFileIcon(doc.file_type || '')}
                                  <span
                                    className="max-w-[200px] truncate"
                                    title={doc.name}
                                  >
                                    {doc.name}
                                  </span>
                                </div>
                              </TableCell>
                            )}
                            {isVisible('type') && (
                              <TableCell className="text-muted-foreground">
                                {getFileTypeDisplay(doc.file_type || '')}
                              </TableCell>
                            )}
                            {isVisible('size') && (
                              <TableCell className="text-muted-foreground">
                                {formatSize(doc.size_bytes)}
                              </TableCell>
                            )}
                            {isVisible('uploader') && (
                              <TableCell className="text-muted-foreground">
                                {doc.created_by_user?.name || '-'}
                              </TableCell>
                            )}
                            {isVisible('entity') && (
                              <TableCell>
                                {doc.entity_name && (
                                  <span
                                    className="text-muted-foreground text-xs"
                                    title={`${doc.entity_type}: ${doc.entity_name}`}
                                  >
                                    {doc.entity_name}
                                  </span>
                                )}
                              </TableCell>
                            )}
                            {isVisible('last_modified') && (
                              <TableCell className="text-muted-foreground">
                                {new Date(
                                  doc.updated_at || doc.created_at,
                                ).toLocaleDateString()}
                              </TableCell>
                            )}
                            {isVisible('created_by') && (
                              <TableCell className="text-muted-foreground">
                                {doc.created_by_user?.name || '-'}
                              </TableCell>
                            )}
                            {isVisible('created_at') && (
                              <TableCell className="text-muted-foreground">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </TableCell>
                            )}
                            {isVisible('updated_by') && (
                              <TableCell className="text-muted-foreground">
                                {doc.updated_by || '-'}
                              </TableCell>
                            )}
                            <TableCell className="bg-card sticky right-0 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => handleEdit(doc)}
                                  >
                                    <Edit className="h-4 w-4" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="gap-2 text-red-500"
                                    onClick={() => handleDelete(doc.id)}
                                  >
                                    <Trash2 className="h-4 w-4" /> Delete
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
                            No documents match your search.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalCount > 0 && (
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
                  documents
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

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
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
                    leads.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.first_name} {lead.last_name || ''}
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
              <Label>Select File</Label>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button
              onClick={handleUpload}
              disabled={!file || !entityId || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Upload'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={!newName.trim() || updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Rename'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
