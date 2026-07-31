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
    createIndustryService,
    getIndustriesService,
} from '~/services/industries.service';

interface IndustrySelectProps {
    value?: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

export function IndustrySelect({
    value,
    onValueChange,
    disabled = false,
    placeholder = 'Select industry',
    className,
}: IndustrySelectProps) {
    const { currentWorkspace: workspace } = useRBAC();
    const queryClient = useQueryClient();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newIndustryName, setNewIndustryName] = useState('');

    const { data: industries = [], isLoading } = useQuery({
        queryKey: ['industries', workspace?.id],
        queryFn: () => getIndustriesService(workspace?.id || ''),
        enabled: !!workspace?.id,
    });

    const createMutation = useMutation({
        mutationFn: (industryName: string) =>
            createIndustryService(workspace!.id, industryName),
        onSuccess: (newIndustry) => {
            toast.success('Industry created successfully');
            queryClient.invalidateQueries({ queryKey: ['industries', workspace?.id] });
            setIsAddDialogOpen(false);
            setNewIndustryName('');
            // Automatically select the newly created industry
            if (newIndustry?.id) {
                onValueChange(newIndustry.id);
            }
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.message || 'Failed to create industry';
            toast.error(message);
        },
    });

    const handleAddNew = () => {
        if (!newIndustryName.trim()) {
            toast.error('Industry name is required');
            return;
        }
        createMutation.mutate(newIndustryName.trim());
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
                    {industries.map((industry: any) => (
                        <SelectItem key={industry.id} value={industry.id}>
                            {industry.industry_name}
                        </SelectItem>
                    ))}
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
                            Add New Industry
                        </Button>
                    </div>
                </SelectContent>
            </Select>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="flex max-h-[90vh] flex-col p-0">
                    <DialogHeader>
                        <DialogTitle>Add New Industry</DialogTitle>
                        <DialogDescription>
                            Create a new industry for this workspace
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 space-y-4 px-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="industry-name">Industry Name</Label>
                            <Input
                                id="industry-name"
                                value={newIndustryName}
                                onChange={(e) => setNewIndustryName(e.target.value)}
                                placeholder="e.g., Technology, Healthcare, Finance"
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
                                setNewIndustryName('');
                            }}
                            disabled={createMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddNew}
                            disabled={!newIndustryName.trim() || createMutation.isPending}
                        >
                            {createMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Industry'
                            )}
                        </Button>
                    </DialogFooter>
      </DialogContent>
            </Dialog>
        </>
    );
}
