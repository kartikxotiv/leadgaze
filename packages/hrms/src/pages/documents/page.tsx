'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';

import { DeleteDocumentDialog } from '../../components/documents/delete-document-dialog';
import { DocumentsDirectoryCard } from '../../components/documents/documents-directory-card';
import { UpsertDocumentDialog } from '../../components/documents/upsert-document-dialog';
import { showToast } from '../../components/global/ToastAlert';
import { useRbac } from '../../components/rbac/rbac-context';
import {
  createDocumentService,
  deleteDocumentService,
  listDocumentsService,
  updateDocumentService,
} from '../../server/services/document.service';
import { listEmployeesService } from '../../server/services/employee.service';
import type {
  DocumentFormPayload,
  EmployeeDocument,
} from '../../types/document.type';
import { handleApiResponse } from '../../utils/api-response-handler';

const documentsQueryKey = ['hrms', 'employee_documents'];
const documentEmployeesQueryKey = ['hrms', 'document-employees'];

const documentColumns: Array<{ id: string; label: string }> = [
  { id: 'sno', label: 'S. No.' },
  { id: 'document', label: 'Document' },
  { id: 'employee', label: 'Employee' },
  { id: 'employee_code', label: 'Employee Code' },
  { id: 'uploaded', label: 'Uploaded' },
  { id: 'status', label: 'Status' },
  { id: 'view', label: 'View' },
];

function buildDocumentSearchText(document: EmployeeDocument) {
  return [
    document.name,
    document.status,
    document.employee?.employee_code ?? '',
    document.employee?.first_name ?? '',
    document.employee?.last_name ?? '',
    document.employee?.work_email ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

export function DocumentsPage(props: {
  headerActions?: ReactNode;
  workspaceName?: string;
}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpsertOpen, setIsUpsertOpen] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<EmployeeDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] =
    useState<EmployeeDocument | null>(null);
  const { hasPermission } = useRbac();
  const canCreateDocument = hasPermission('documents', 'create', 'team');
  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('hrms-documents', {
      sno: true,
      document: true,
      employee: true,
      employee_code: false,
      uploaded: true,
      status: false,
      view: true,
    });

  const documentsQuery = useQuery({
    queryKey: documentsQueryKey,
    queryFn: listDocumentsService,
  });

  const employeesQuery = useQuery({
    queryKey: documentEmployeesQueryKey,
    queryFn: listEmployeesService,
  });

  const documents = useMemo<Array<EmployeeDocument>>(
    () => documentsQuery.data?.data ?? [],
    [documentsQuery.data?.data],
  );
  const employees = useMemo(
    () =>
      (employeesQuery.data?.data ?? []).filter(
        (employee) => employee.status !== 'invited',
      ),
    [employeesQuery.data?.data],
  );
  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return documents;
    }

    return documents.filter((document) =>
      buildDocumentSearchText(document).includes(query),
    );
  }, [documents, searchTerm]);
  const linkedCount = useMemo(
    () => documents.filter((document) => document.employee_id).length,
    [documents],
  );
  const unlinkedCount = documents.length - linkedCount;

  const createDocument = useMutation({
    mutationFn: createDocumentService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      setIsUpsertOpen(false);
      await invalidateDocumentQueries(queryClient);
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to create document', 'error');
    },
  });

  const updateDocument = useMutation({
    mutationFn: (payload: {
      data: Partial<DocumentFormPayload>;
      documentId: string;
    }) => updateDocumentService(payload.documentId, payload.data),
    onSuccess: async (response) => {
      handleApiResponse(response);
      setEditingDocument(null);
      setIsUpsertOpen(false);
      await invalidateDocumentQueries(queryClient);
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to update document', 'error');
    },
  });

  const deleteDocument = useMutation({
    mutationFn: deleteDocumentService,
    onSuccess: async (response) => {
      handleApiResponse(response);
      setDocumentToDelete(null);
      await invalidateDocumentQueries(queryClient);
    },
    onError: (error: { message?: string }) => {
      showToast(error.message ?? 'Unable to delete document', 'error');
    },
  });

  const onCreateRequested = () => {
    setEditingDocument(null);
    setIsUpsertOpen(true);
  };

  const onSubmitDocument = (payload: DocumentFormPayload) => {
    if (editingDocument) {
      updateDocument.mutate({
        data: payload,
        documentId: editingDocument.id,
      });
      return;
    }

    createDocument.mutate(payload);
  };

  return (
    <>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden">
        <PageHeader
          className="bg-sidebar shrink-0"
          title={`Documents (${filteredDocuments.length})`}
          description={
            props.workspaceName
              ? `${props.workspaceName} employee documents`
              : 'Employee documents'
          }
        >
          {props.headerActions}
        </PageHeader>
      </div>

        <div className="w-full max-w-full min-w-0 overflow-x-auto pb-2 pt-2">
            <div className="flex flex-wrap items-center gap-2">
            <TableStatusMetricTab
              id="all"
              color="#4eacff"
              statusName="All Documents"
              count={documents.length}
              isSelected
            />
            <TableStatusMetricTab
              id="linked"
              color="#22c55e"
              statusName="Linked Employees"
              count={linkedCount}
              className="cursor-default"
            />
            <TableStatusMetricTab
              id="unlinked"
              color="#f59e0b"
              statusName="Needs Assignment"
              count={unlinkedCount}
              className="cursor-default"
            />
          </div>
        </div>

        <div className="w-full max-w-full min-w-0 shrink-0 border-b">
          <ListToolBar
            showSearch
            searchPlaceholder="Search documents..."
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            actions={[
              {
                key: 'add',
                label: 'Add Document',
                icon: Plus,
                onClick: onCreateRequested,
                show: canCreateDocument,
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
      

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
          <DocumentsDirectoryCard
            documents={documents}
            filteredDocuments={filteredDocuments}
            hasFilters={Boolean(searchTerm.trim())}
            isColumnVisible={isVisible}
            isLoading={documentsQuery.isLoading}
            onDeleteRequested={setDocumentToDelete}
            onEditRequested={(document) => {
              setEditingDocument(document);
              setIsUpsertOpen(true);
            }}
            visibility={visibility}
          />
        </div>
      </PageBody>

      <UpsertDocumentDialog
        document={editingDocument}
        employees={employees}
        isPending={createDocument.isPending || updateDocument.isPending}
        onOpenChange={(open) => {
          setIsUpsertOpen(open);

          if (!open) {
            setEditingDocument(null);
          }
        }}
        onSubmit={onSubmitDocument}
        open={isUpsertOpen}
      />

      <DeleteDocumentDialog
        document={documentToDelete}
        isPending={deleteDocument.isPending}
        onConfirm={() => {
          if (!documentToDelete) {
            return;
          }

          deleteDocument.mutate(documentToDelete.id);
        }}
        onOpenChange={(open) => {
          if (!open) {
            setDocumentToDelete(null);
          }
        }}
        open={Boolean(documentToDelete)}
      />
    </>
  );
}

async function invalidateDocumentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: documentsQueryKey }),
    queryClient.invalidateQueries({ queryKey: documentEmployeesQueryKey }),
  ]);
}
