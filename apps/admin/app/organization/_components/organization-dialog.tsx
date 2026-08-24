'use client';

import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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

import { createWorkspaceService, updateWorkspaceService, WorkspaceItem } from '~/services/workspaces.service';

interface OrganizationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: WorkspaceItem | null; // If provided, it's edit mode
}

export function OrganizationDialog({
  isOpen,
  onOpenChange,
  organization,
}: OrganizationDialogProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!organization;

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });

  // Populate form on edit
  useEffect(() => {
    if (isOpen) {
      if (organization) {
        setFormData({
          name: organization.name || '',
          slug: organization.slug || '',
        });
      } else {
        setFormData({ name: '', slug: '' });
      }
    }
  }, [isOpen, organization]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug from name if in create mode and slug hasn't been manually heavily edited
      // Or just make it simple: auto-generate slug on name change if it's create mode
      if (field === 'name' && !isEditMode) {
        updated.slug = value.toLowerCase().replace(/[^a-z0-9]/g, '-');
      }
      return updated;
    });
  };

  const createMutation = useMutation({
    mutationFn: createWorkspaceService,
    onSuccess: () => {
      toast.success('Organization created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create organization');
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateWorkspaceService,
    onSuccess: () => {
      toast.success('Organization updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update organization');
    },
  });

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }

    if (isEditMode && organization) {
      updateMutation.mutate({
        id: organization.id,
        name: formData.name,
        slug: formData.slug,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        slug: formData.slug,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Organization' : 'New Organization'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the details for this organization.'
              : 'Enter the details to create a new organization.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-2 px-2 my-2">
            <div>
              <Label htmlFor="name">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Acme Corp"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="slug">
                Workspace Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="slug"
                placeholder="acme-corp"
                value={formData.slug}
                onChange={(e) => handleInputChange('slug', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="default" 
              disabled={isLoading} 
              className="bg-leadgaze-primary text-primary-foreground hover:bg-leadgaze-primary dark:text-white secondary-text-small-bold gap-1.5 px-2"
              onClick={handleSubmit}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
