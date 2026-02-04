'use client';

import React, { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Download,
    Edit,
    File,
    FileCode,
    FileImage,
    FileText,
    FileType,
    Filter,
    Loader2,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
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

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
    Document,
    createDocumentService,
    deleteDocumentService,
    getDocumentsService,
    updateDocumentService,
} from '~/services/activities.service';
import { getLeadsService } from '~/services/leads.service';

export default function DocumentPage() {
    const { currentWorkspace: workspace } = useRBAC();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState<Document | null>(null);
    const [newName, setNewName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [targetLeadId, setTargetLeadId] = useState('');

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
        queryFn: () => {
            if (!workspace?.id) return [];
            return getLeadsService(workspace.id);
        },
        enabled: !!workspace?.id,
    });

    const createMutation = useMutation({
        mutationFn: (payload: { file: File; leadId: string }) =>
            createDocumentService({
                workspace_id: workspace!.id,
                entity_type: 'lead',
                entity_id: payload.leadId,
                file: payload.file,
            }),
        onSuccess: () => {
            toast.success('Document uploaded');
            setIsUploadDialogOpen(false);
            setFile(null);
            setTargetLeadId('');
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

    const filteredDocuments = useMemo(() => {
        return documents.filter((doc: Document) => {
            const matchesSearch = doc.name
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
            const matchesType =
                typeFilter === 'all' ||
                (doc.file_type || '').toLowerCase().includes(typeFilter.toLowerCase());
            return matchesSearch && matchesType;
        });
    }, [documents, searchTerm, typeFilter]);

    const handleUpload = () => {
        if (!file || !targetLeadId) return;
        createMutation.mutate({ file, leadId: targetLeadId });
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
        const t = type?.toLowerCase() || '';
        if (t.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
        if (t.includes('image') || t.includes('png') || t.includes('jpg'))
            return <FileImage className="h-4 w-4 text-blue-500" />;
        if (t.includes('sheet') || t.includes('xlsx') || t.includes('csv'))
            return <FileType className="h-4 w-4 text-green-500" />;
        if (t.includes('markdown') || t.includes('md'))
            return <FileCode className="h-4 w-4 text-purple-500" />;
        return <File className="h-4 w-4 text-gray-500" />;
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '-';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
                title="Documents"
                description="Manage and organize your files and documents"
            >

            </PageHeader>
            <PageBody>
                <div className="space-y-6">
                    {/* Search and Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center gap-4 md:flex-row">
                                <div className="relative w-full flex-1">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                    <Input
                                        placeholder="Search documents..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex w-full items-center gap-2 md:w-auto">
                                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                                        <SelectTrigger className="w-full md:w-[180px]">
                                            <Filter className="mr-2 h-4 w-4" />
                                            <SelectValue placeholder="File Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                            <SelectItem value="image">Image</SelectItem>
                                            <SelectItem value="sheet">Spreadsheet</SelectItem>
                                            <SelectItem value="document">Document</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Documents List Table */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Entity</TableHead>
                                        <TableHead>Last Modified</TableHead>
                                        <TableHead className="pr-6 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredDocuments.length > 0 ? (
                                        filteredDocuments.map((doc: Document) => (
                                            <TableRow key={doc.id}>
                                                <TableCell className="pl-6 font-medium">
                                                    <div className="flex items-center gap-3">
                                                        {getFileIcon(doc.file_type || '')}
                                                        <span className="truncate max-w-[200px]" title={doc.name}>{doc.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {doc.file_type || 'Unknown'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {formatSize(doc.size_bytes)}
                                                </TableCell>
                                                <TableCell>
                                                    {doc.entity_name && (
                                                        <span className="text-muted-foreground text-xs" title={`${doc.entity_type}: ${doc.entity_name}`}>
                                                            {doc.entity_name}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
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
                                                colSpan={6}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                No documents found matching your filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </PageBody>



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
