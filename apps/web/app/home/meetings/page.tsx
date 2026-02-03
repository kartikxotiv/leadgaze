'use client';

import React, { useMemo, useState } from 'react';

import {
    Calendar as CalendarIcon,
    Filter,
    Plus,
    Search,
    Clock,
    User,
    MoreHorizontal,
    CheckCircle2,
    XCircle,
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

// Mock Data for Meetings
const meetings = [
    {
        id: '1',
        title: 'Leadgaze',
        host: 'John Doe',
        date: '2024-02-15',
        time: '10:00 AM',
        duration: '45 min',
        status: 'Scheduled',
    },
    {
        id: '2',
        title: 'Leadgaze',
        host: 'John Doe',
        date: '2024-02-15',
        time: '10:00 AM',
        duration: '35 min',
        status: 'Completed',
    },
    {
        id: '3',
        title: 'Leadgaze',
        host: 'John Doe',
        date: '2024-02-15',
        time: '10:00 AM',
        duration: '25 min',
        status: 'Cancelled',
    },

];

export default function MeetingsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredMeetings = useMemo(() => {
        return meetings.filter((meeting) => {
            const matchesSearch =
                meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                meeting.host.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' || meeting.status.toLowerCase() === statusFilter.toLowerCase();
            return matchesSearch && matchesStatus;
        });
    }, [searchTerm, statusFilter]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Scheduled':
                return (
                    <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50">
                        <Clock className="mr-1 h-3 w-3" /> Scheduled
                    </Badge>
                );
            case 'Completed':
                return (
                    <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                    </Badge>
                );
            case 'Cancelled':
                return (
                    <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">
                        <XCircle className="mr-1 h-3 w-3" /> Cancelled
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <>
            <PageHeader title="Meetings" description="Manage and schedule your meetings with leads and clients">
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Meeting
                </Button>
            </PageHeader>

            <PageBody>
                <div className="space-y-6">
                    {/* Stats Section */}

                    {/* Search and Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row items-center gap-4">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by title or host..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full md:w-[180px]">
                                            <Filter className="mr-2 h-4 w-4" />
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Meetings List Table */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Meeting Title</TableHead>
                                        <TableHead>Host</TableHead>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMeetings.length > 0 ? (
                                        filteredMeetings.map((meeting) => (
                                            <TableRow key={meeting.id}>
                                                <TableCell className="font-medium pl-6">{meeting.title}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                                                            {meeting.host.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        {meeting.host}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{meeting.date}</span>
                                                        <span className="text-xs text-muted-foreground">{meeting.time}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{meeting.duration}</TableCell>
                                                <TableCell>{getStatusBadge(meeting.status)}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>View Details</DropdownMenuItem>
                                                            <DropdownMenuItem>Reschedule</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-500">Cancel Meeting</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell className="h-24 text-center text-muted-foreground">
                                                No meetings found matching your filters.
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
