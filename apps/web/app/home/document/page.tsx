'use client';

import React, { useMemo, useState } from 'react';

import {
    FileText,
    Filter,
    MoreHorizontal,
    Plus,
    Search,
    Download,
    Trash2,
    Edit,
    File,
    FileCode,
    FileImage,
    FileType,
} from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';

// Mock Data for Documents
const documents = [
    {
        id: '1',
        name: 'Project_Proposal.pdf',
        type: 'PDF',
        size: '2.4 MB',
        date: '2024-02-01',
    },
    {
        id: '2',
        name: 'Dashboard_Mockup.png',
        type: 'Image',
        size: '1.8 MB',
        date: '2024-02-02',
    },
    {
        id: '3',
        name: 'Quarterly_Report.xlsx',
        type: 'Spreadsheet',
        size: '850 KB',
        date: '2024-02-03',
    },
    {
        id: '4',
        name: 'Team_Contracts.docx',
        type: 'Document',
        size: '1.2 MB',
        date: '2024-01-28',
    },
    {
        id: '5',
        name: 'API_Documentation.md',
        type: 'Markdown',
        size: '45 KB',
        date: '2024-01-30',
    },
];

export default function DocumentPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const filteredDocuments = useMemo(() => {
        return documents.filter((doc) => {
            const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = typeFilter === 'all' || doc.type.toLowerCase() === typeFilter.toLowerCase();
            return matchesSearch && matchesType;
        });
    }, [searchTerm, typeFilter]);

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'PDF':
                return <FileText className="h-4 w-4 text-red-500" />;
            case 'Image':
                return <FileImage className="h-4 w-4 text-blue-500" />;
            case 'Spreadsheet':
                return <FileType className="h-4 w-4 text-green-500" />;
            case 'Markdown':
                return <FileCode className="h-4 w-4 text-purple-500" />;
            default:
                return <File className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <>
            <PageHeader title="Documents" description="Manage and organize your files and documents">
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Upload Document
                </Button>
            </PageHeader>

            <PageBody>
                <div className="space-y-6">
                    {/* Search and Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row items-center gap-4">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search documents..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                                        <SelectTrigger className="w-full md:w-[180px]">
                                            <Filter className="mr-2 h-4 w-4" />
                                            <SelectValue placeholder="File Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                            <SelectItem value="image">Image</SelectItem>
                                            <SelectItem value="spreadsheet">Spreadsheet</SelectItem>
                                            <SelectItem value="document">Document</SelectItem>
                                            <SelectItem value="markdown">Markdown</SelectItem>
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
                                        <TableHead>Last Modified</TableHead>
                                        <TableHead className="text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDocuments.length > 0 ? (
                                        filteredDocuments.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell className="font-medium pl-6">
                                                    <div className="flex items-center gap-3">
                                                        {getFileIcon(doc.type)}
                                                        <span>{doc.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{doc.type}</TableCell>
                                                <TableCell className="text-muted-foreground">{doc.size}</TableCell>
                                                <TableCell className="text-muted-foreground">{doc.date}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem className="gap-2">
                                                                <Download className="h-4 w-4" /> Download
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="gap-2">
                                                                <Edit className="h-4 w-4" /> Rename
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="gap-2 text-red-500">
                                                                <Trash2 className="h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No documents found matching your search.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </PageBody>
        </>
    );
}
