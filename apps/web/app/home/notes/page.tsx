'use client';

import React, { useMemo, useState } from 'react';

import {
    FileText,
    Filter,
    Plus,
    Search,
    StickyNote,
    MoreHorizontal,
    Edit,
    Trash2,
    Pin,
    Calendar,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';

// Mock Data for Notes
const notes = [
    {
        id: '1',
        title: 'Ideas for Q2',
        content: 'Look into AI-driven lead scoring and automated follow-ups. Research competitors in the same niche.',
        category: 'Ideas',
        date: '2024-02-02',
        pinned: false,
    },
    {
        id: '2',
        title: 'Meeting Minutes - Team Sync',
        content: 'Discussed the roadmap for the next sprint. Assigned tasks for the new dashboard components.',
        category: 'Meeting',
        date: '2024-02-01',
        pinned: false,
    },

];

export default function NotesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const filteredNotes = useMemo(() => {
        return notes.filter((note) => {
            const matchesSearch =
                note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                note.content.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory =
                categoryFilter === 'all' || note.category.toLowerCase() === categoryFilter.toLowerCase();
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, categoryFilter]);

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'Work':
                return (
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                        Work
                    </Badge>
                );
            case 'Ideas':
                return (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                        Ideas
                    </Badge>
                );
            case 'Meeting':
                return (
                    <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                        Meeting
                    </Badge>
                );
            case 'Personal':
                return (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                        Personal
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{category}</Badge>;
        }
    };

    return (
        <>
            <PageHeader title="Notes" description="Capture and organize your important thoughts and information">
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Note
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
                                        placeholder="Search notes..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                        <SelectTrigger className="w-full md:w-[180px]">
                                            <Filter className="mr-2 h-4 w-4" />
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            <SelectItem value="work">Work</SelectItem>
                                            <SelectItem value="ideas">Ideas</SelectItem>
                                            <SelectItem value="meeting">Meeting</SelectItem>
                                            <SelectItem value="personal">Personal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredNotes.length > 0 ? (
                            filteredNotes.map((note) => (
                                <Card key={note.id} className="group hover:shadow-md transition-all duration-200">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                {note.pinned && <Pin className="h-4 w-4 text-amber-500 fill-amber-500" />}
                                                {getCategoryBadge(note.category)}
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem className="gap-2">
                                                        <Edit className="h-4 w-4" /> Edit Note
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="gap-2">
                                                        <Pin className="h-4 w-4" /> {note.pinned ? 'Unpin' : 'Pin to Top'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="gap-2 text-red-500">
                                                        <Trash2 className="h-4 w-4" /> Delete Note
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <h4 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                                            {note.title}
                                        </h4>
                                        <p className="text-sm text-muted-foreground line-clamp-3 mb-6 min-h-[4.5rem]">
                                            {note.content}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-4 border-t border-secondary">
                                            <Calendar className="h-3 w-3" />
                                            <span>Updated {note.date}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                                No notes found matching your search.
                            </div>
                        )}
                    </div>
                </div>
            </PageBody>
        </>
    );
}
