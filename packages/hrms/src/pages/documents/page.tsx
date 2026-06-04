'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';

import { DeleteDocumentDialog } from '../../components/documents/delete-document-dialog';
import { DocumentsDirectoryCard } from '../../components/documents/documents-directory-card';
import { DocumentsSummaryCards } from '../../components/documents/documents-summary-cards';
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

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const [isUpsertOpen, setIsUpsertOpen] = useState(false);
  const [editingDocument, setEditingDocument] =
    useState<EmployeeDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] =
    useState<EmployeeDocument | null>(null);
  const { hasPermission } = useRbac();
  const canCreateDocument = hasPermission('documents', 'create', 'team');

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
  const summary = useMemo(
    () => ({
      totalCount: documents.length,
    }),
    [documents.length],
  );

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
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <DocumentsSummaryCards summary={summary} />

        {canCreateDocument ? (
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={onCreateRequested}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Document
          </Button>
        ) : null}
      </div>

      <DocumentsDirectoryCard
        documents={documents}
        isLoading={documentsQuery.isLoading}
        onDeleteRequested={setDocumentToDelete}
        onEditRequested={(document) => {
          setEditingDocument(document);
          setIsUpsertOpen(true);
        }}
      />

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
    </section>
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
