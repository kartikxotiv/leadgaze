'use client';

import React, { useMemo, useState } from 'react';

import {
    Bell,
    Filter,
    Plus,
    Search,
    Clock,
    AlertCircle,
    CheckCircle2,
    MoreHorizontal,
    Calendar as CalendarIcon,
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

// Mock Data for Reminders
const reminders = [
    {
        id: '1',
        task: 'Follow up with Leadgaze team',
        priority: 'High',
        dueDate: '2024-02-05',
        status: 'Pending',
    },
    {
        id: '2',
        task: 'Send proposal to Michael',
        priority: 'Medium',
        dueDate: '2024-02-03', // Today
        status: 'Pending',
    },
    {
        id: '3',
        task: 'Update CRM records',
        priority: 'Low',
        dueDate: '2024-02-01',
        status: 'Completed',
    },
    {
        id: '4',
        task: 'Prepare monthly sales report',
        priority: 'High',
        dueDate: '2024-02-10',
        status: 'Pending',
    },
];

export default function RemindersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredReminders = useMemo(() => {
        return reminders.filter((reminder) => {
            const matchesSearch = reminder.task.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesPriority = priorityFilter === 'all' || reminder.priority.toLowerCase() === priorityFilter.toLowerCase();
            const matchesStatus = statusFilter === 'all' || reminder.status.toLowerCase() === statusFilter.toLowerCase();
            return matchesSearch && matchesPriority && matchesStatus;
        });
    }, [searchTerm, priorityFilter, statusFilter]);

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'High':
                return (
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                        High
                    </Badge>
                );
            case 'Medium':
                return (
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                        Medium
                    </Badge>
                );
            case 'Low':
                return (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                        Low
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{priority}</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending':
                return (
                    <Badge variant="outline" className="text-blue-500 border-blue-200 bg-blue-50">
                        <Clock className="mr-1 h-3 w-3" /> Pending
                    </Badge>
                );
            case 'Completed':
                return (
                    <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <>
            <PageHeader title="Reminders" description="Keep track of your important tasks and reminders">
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Reminder
                </Button>
            </PageHeader>

            <PageBody>
                <div className="space-y-6">
                    {/* Stats Overview */}

                    {/* Search and Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row items-center gap-4">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search tasks..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                        <SelectTrigger className="w-full md:w-[150px]">
                                            <Filter className="mr-2 h-4 w-4" />
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Priorities</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full md:w-[150px]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reminders List Table */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Task Title</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReminders.length > 0 ? (
                                        filteredReminders.map((reminder) => (
                                            <TableRow key={reminder.id}>
                                                <TableCell className="font-medium pl-6">{reminder.task}</TableCell>
                                                <TableCell>{getPriorityBadge(reminder.priority)}</TableCell>
                                                <TableCell className="text-muted-foreground">{reminder.dueDate}</TableCell>
                                                <TableCell>{getStatusBadge(reminder.status)}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>View Details</DropdownMenuItem>
                                                            <DropdownMenuItem>Edit Task</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-green-600">Mark as Completed</DropdownMenuItem>
                                                            <DropdownMenuItem className="text-red-500">Delete Reminder</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No reminders found matching your filters.
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
