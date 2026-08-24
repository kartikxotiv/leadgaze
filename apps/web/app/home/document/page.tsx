'use client';

import React, { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Briefcase,
  Building2,
  Edit,
  FileImage,
  FileText,
  FileType,
  FileUp,
  Loader2,
  File as LucideFile,
  MoreHorizontal,
  MoreVertical,
  Trash2,
  User,
  Users,
  Plus,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { AddColumnModal } from '@kit/ui/add-column-modal';
import { Badge } from '@kit/ui/badge';
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
import { CustomDeleteDialog } from '@kit/ui/custom-delete-dialog';

import { useLocalization } from '~/lib/localization/localization-provider';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { useDebounce } from '~/lib/hooks/use-debounce';
import { usePackageMembers } from '~/lib/hooks/use-package-members';
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

function DocumentPageSkeleton() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <Skeleton className="h-6 w-36" />
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
                  <TableHead className="w-12 whitespace-nowrap">
                    S. No.
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded By</TableHead>
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
                {[...Array(12)].map((_, i) => (
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

export default function DocumentPage() {
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const { currentWorkspace: workspace } = useRBAC();
  const { formatDate } = useLocalization();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
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

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [newName, setNewName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState('lead');
  const [entityId, setEntityId] = useState('');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const documentColumns = useMemo(
    () => [
      { id: 'sno', label: 'S. No.' },
      { id: 'name', label: 'Name' },
      { id: 'type', label: 'Type' },
      { id: 'size', label: 'Size' },
      { id: 'uploader', label: 'Uploaded By' },
      { id: 'category', label: 'Entity' },
      { id: 'associate', label: 'Associate With' },
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
      category: true,
      associate: true,
      last_modified: false,
      created_by: false,
      created_at: false,
      updated_by: false,
    });

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('documents');

  const { data: documentsResponse, isLoading } = useQuery({
    queryKey: [
      'documents',
      workspace?.id,
      currentPage,
      pageSize,
      typeFilter,
      entityTypeFilter,
      debouncedSearchTerm,
      selectedCreatedByIds,
      computedCreatedOnDates,
      computedUpdatedOnDates,
    ],
    queryFn: () => {
      if (!workspace?.id) return { data: [], total: 0 };
      return getDocumentsService(
        workspace.id,
        entityTypeFilter === 'all' ? undefined : entityTypeFilter,
        undefined,
        {
          page: currentPage,
          limit: pageSize,
          type: typeFilter === 'all' ? undefined : typeFilter,
          searchTerm: debouncedSearchTerm || undefined,
          createdAtFrom: computedCreatedOnDates?.from,
          createdAtTo: computedCreatedOnDates?.to,
          updatedAtFrom: computedUpdatedOnDates?.from,
          updatedAtTo: computedUpdatedOnDates?.to,
          createdByIds: selectedCreatedByIds.length > 0 ? selectedCreatedByIds : undefined,
        },
      );
    },
    enabled: !!workspace?.id,
  });

  const documents = useMemo(() => {
    if (!documentsResponse) return [];
    if (Array.isArray(documentsResponse)) return documentsResponse;
    return documentsResponse?.data || [];
  }, [documentsResponse]);

  const totalCount = useMemo(() => {
    if (!documentsResponse) return 0;
    if (Array.isArray(documentsResponse)) return documentsResponse.length;
    return (documentsResponse as any)?.total ?? documents.length;
  }, [documentsResponse, documents]);

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
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => toast.error('Failed to upload document'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateDocumentService(id, { name }),
    onSuccess: () => {
      toast.success('Document renamed');
      setIsEditDialogOpen(false);
      setEditingDoc(null);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: () => toast.error('Failed to rename document'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocumentService,
    onSuccess: () => {
      toast.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
    },
    onError: () => {
      toast.error('Failed to delete document');
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
    },
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    typeFilter,
    entityTypeFilter,
    selectedCreatedByIds,
    pageSize,
    createdOnRange,
    updatedOnRange,
  ]);

  const { sortColumn, sortDirection, toggleSort, sortedData } =
    useTableSort<Document>('documents', documents, {
      onSortChange: () => setCurrentPage(1),
    });

  const paginatedDocs = sortedData;

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

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
    updateMutation.mutate({ id: editingDoc.id, name: newName });
  };

  const handleDelete = (id: string) => {
    setDocumentToDelete(id);
    setIsDeleteDialogOpen(true);
  };

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
        key: 'type',
        label: 'File Type',
        selectedValue: typeFilter === 'all' ? '' : typeFilter,
        selectedLabel:
          typeFilter === 'all' ? 'All types' : typeFilter.toUpperCase(),
        options: [
          { value: 'pdf', label: 'PDF' },
          { value: 'image', label: 'Images' },
          { value: 'sheet', label: 'Spreadsheets' },
          { value: 'document', label: 'Documents' },
        ],
        onSelect: (val: string) => setTypeFilter(val || 'all'),
      },
      {
        key: 'entity',
        label: 'Entity',
        selectedValue: entityTypeFilter === 'all' ? '' : entityTypeFilter,
        selectedLabel:
          entityTypeFilter === 'all'
            ? 'All entities'
            : entityTypeFilter.charAt(0).toUpperCase() +
              entityTypeFilter.slice(1) +
              's',
        options: [
          { value: 'lead', label: 'Leads' },
          { value: 'contact', label: 'Contacts' },
          { value: 'account', label: 'Accounts' },
          { value: 'opportunity', label: 'Opportunities' },
        ],
        onSelect: (val: string) => setEntityTypeFilter(val || 'all'),
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
  }, [typeFilter, entityTypeFilter, createdOnRange, updatedOnRange, selectedCreatedByIds, members]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (entityTypeFilter !== 'all') count++;
    if (selectedCreatedByIds.length > 0) count++;
    if (createdOnRange) count++;
    if (updatedOnRange) count++;
    return count;
  }, [typeFilter, entityTypeFilter, selectedCreatedByIds, createdOnRange, updatedOnRange]);

  const handleClearFilters = () => {
    setTypeFilter('all');
    setEntityTypeFilter('all');
    setSelectedCreatedByIds([]);
    clearCreatedOnRange();
    clearUpdatedOnRange();
  };

  if (!workspace) {
    return <DocumentPageSkeleton />;
  }

  return (
    <>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden border-bottom-gray">
        <PageHeader
          title={`Documents`}          
        >
          <div className="p-[2px]">
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
          actions={[
            {
              key: 'add',
              label: 'Upload File',
              icon: Download,
              onClick: () => {
                setFile(null);
                setEntityType('lead');
                setEntityId('');
                setIsUploadDialogOpen(true);
              },
              show: true,
              buttonVariant: 'default',
            },
          ]}
          columnVisibilitySlot={
            <ColumnVisibilitySelector
              columns={documentColumns}
              visibility={visibility}
              onToggle={toggleVisibility}
              onReset={reset}
            />
          }
        />
          </div>
        </PageHeader>
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
                entityLabel="documents"
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
                  {isVisible('name') && (
                    <SortableTableHead
                      label="Name"
                      columnId="name"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      sortable={false}
                      className="relative"
                      {...getHeaderProps('name')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('name')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('type') && (
                    <SortableTableHead
                      label="Type"
                      columnId="type"
                      sortKey="file_type"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('type')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('type')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('size') && (
                    <SortableTableHead
                      label="Size"
                      columnId="size"
                      sortKey="size_bytes"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('size')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('size')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('uploader') && (
                    <SortableTableHead
                      label="Uploaded By"
                      columnId="uploader"
                      sortKey="created_by_user.name"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('uploader')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('uploader')}
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
                  {isVisible('last_modified') && (
                    <SortableTableHead
                      label="Last Modified At"
                      columnId="last_modified"
                      sortKey="updated_at"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('last_modified')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('last_modified')}
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
                              : 6
                          }
                        >
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : paginatedDocs.length > 0 ? (
                  paginatedDocs.map((doc: Document, index: number) => (
                    <TableRow key={doc.id} className="hover:bg-muted/50">
                      {isVisible('sno') && (
                        <TableCell className="text-muted-foreground w-12">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                      )}
                      {isVisible('name') && (
                        <TableCell className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary">
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
                      {isVisible('category') && (
                        <TableCell>
                          {getCategoryBadge(doc.entity_type)}
                        </TableCell>
                      )}
                      {isVisible('associate') && (
                        <TableCell>
                          {doc.entity_name && (
                            <Link
                              href={`/home/sales/${doc.entity_type === 'opportunity' ? 'opportunities' : `${doc.entity_type}s`}/${doc.entity_id}?tab=documents`}
                              className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary text-xs font-medium hover:underline"
                              title={`${doc.entity_type}: ${doc.entity_name}`}
                            >
                              {doc.entity_name}
                            </Link>
                          )}
                        </TableCell>
                      )}
                      {isVisible('last_modified') && (
                        <TableCell className="text-muted-foreground">
                          {formatDate(doc.updated_at || doc.created_at)}
                        </TableCell>
                      )}
                      {isVisible('created_by') && (
                        <TableCell className="text-muted-foreground">
                          {doc.created_by_user?.name || '-'}
                        </TableCell>
                      )}
                      {isVisible('created_at') && (
                        <TableCell className="text-muted-foreground">
                          {formatDate(doc.created_at)}
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
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => handleEdit(doc)}
                            >
                              <Edit className="h-4 w-4" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" asChild>
                              <a
                                href={`/api/documents/${doc.id}/download?mode=view`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <FileUp className="h-4 w-4" /> View
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" asChild>
                              <a
                                href={`/api/documents/${doc.id}/download?mode=download`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <FileUp className="h-4 w-4" /> Download
                              </a>
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
                          ? Object.values(visibility).filter((v) => v !== false)
                              .length + 1
                          : 10
                      }
                      className="text-muted-foreground h-24 text-center"
                    >
                      No documents match your search.
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
        columns={documentColumns}
        visibility={visibility}
        onToggleColumn={toggleVisibility}
        onResetColumns={reset}
      />
      </PageBody>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col p-0">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-2 overflow-y-auto px-2">
            <div className="space-y-2">
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
                    className="!flex cursor-pointer items-center gap-1"
                  >
                    <User className="h-3 w-3" /> Lead
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="contact" id="contact" />
                  <Label
                    htmlFor="contact"
                    className="!flex cursor-pointer items-center gap-1"
                  >
                    <Users className="h-3 w-3" /> Contact
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="account" id="account" />
                  <Label
                    htmlFor="account"
                    className="!flex cursor-pointer items-center gap-1"
                  >
                    <Building2 className="h-3 w-3" /> Account
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="opportunity" id="opportunity" />
                  <Label
                    htmlFor="opportunity"
                    className="!flex cursor-pointer items-center gap-1"
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
            <div>
              <Label>Select File</Label>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="selectFileDetails file:text-leadgaze-primary file:cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUploadDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !entityId || createMutation.isPending}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col p-0">
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-2 px-2">
            <div className="space-y-2">
              <Label>Document Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
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
              disabled={!newName.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <CustomDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        onConfirm={() => {
          if (documentToDelete) {
            deleteMutation.mutate(documentToDelete);
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </>
  );
}
