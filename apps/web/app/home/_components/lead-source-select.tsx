'use client';

import React, { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@kit/ui/select';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
    createLeadSourceService,
    getLeadSourcesService,
} from '~/services/leads.service';

interface LeadSourceSelectProps {
    value?: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

export function LeadSourceSelect({
    value,
    onValueChange,
    disabled = false,
    placeholder = 'Select a source',
    className,
}: LeadSourceSelectProps) {
    const { currentWorkspace: workspace } = useRBAC();
    const queryClient = useQueryClient();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newSourceName, setNewSourceName] = useState('');

    const { data: sources = [], isLoading } = useQuery({
        queryKey: ['lead-sources', workspace?.id],
        queryFn: () => getLeadSourcesService(workspace?.id || ''),
        enabled: !!workspace?.id,
    });

    const createMutation = useMutation({
        mutationFn: (sourceName: string) =>
            createLeadSourceService(workspace!.id, sourceName),
        onSuccess: (newSource) => {
            toast.success('Lead source created successfully');
            queryClient.invalidateQueries({ queryKey: ['lead-sources', workspace?.id] });
            setIsAddDialogOpen(false);
            setNewSourceName('');
            // Automatically select the newly created source
            if (newSource?.id) {
                onValueChange(newSource.id);
            }
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.message || 'Failed to create lead source';
            toast.error(message);
        },
    });

    const handleAddNew = () => {
        if (!newSourceName.trim()) {
            toast.error('Source name is required');
            return;
        }
        createMutation.mutate(newSourceName.trim());
    };

    return (
        <>
            <Select
                value={value}
                onValueChange={onValueChange}
                disabled={disabled || isLoading}
            >
                <SelectTrigger className={className}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {sources && sources.length > 0 ? (
                        sources.map((source: any) => (
                            <SelectItem key={source.id} value={source.id}>
                                {source.source_name}
                            </SelectItem>
                        ))
                    ) : (
                        <SelectItem value="placeholder" disabled>
                            No sources available
                        </SelectItem>
                    )}
                    <div className="border-t p-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={(e) => {
                                e.preventDefault();
                                setIsAddDialogOpen(true);
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Source
                        </Button>
                    </div>
                </SelectContent>
            </Select>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Lead Source</DialogTitle>
                        <DialogDescription>
                            Create a new lead source for this workspace
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 space-y-2 px-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="source-name">Source Name</Label>
                            <Input
                                id="source-name"
                                value={newSourceName}
                                onChange={(e) => setNewSourceName(e.target.value)}
                                placeholder="e.g., Website, Referral, Social Media"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddNew();
                                    }
                                }}
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAddDialogOpen(false);
                                setNewSourceName('');
                            }}
                            disabled={createMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddNew}
                            disabled={!newSourceName.trim() || createMutation.isPending}
                        >
                            {createMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Source'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
