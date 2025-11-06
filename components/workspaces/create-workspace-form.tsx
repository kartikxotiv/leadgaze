"use client";

import React, { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useCreateWorkspace } from '@/hooks/use-workspaces';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from 'sonner';

interface CreateWorkspaceFormProps {
  onSuccess?: (workspace: any) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
  cancelButtonText?: string;
  submitButtonText?: string;
  title?: string;
  className?: string;
}

export function CreateWorkspaceForm({
  onSuccess,
  onCancel,
  showCancelButton = false,
  cancelButtonText = "Cancel",
  submitButtonText = "Submit",
  title = "Create Workspace",
  className = "",
}: CreateWorkspaceFormProps) {
  const createWorkspaceMutation = useCreateWorkspace();
  const { currentOrganization } = useAuthStore();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback(
    (fieldName: string, value: string): string => {
      switch (fieldName) {
        case "name":
          return !value.trim() ? "Workspace name is required" : "";
        default:
          return "";
      }
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    newErrors.name = validateField("name", formData.name);
    
    const filteredErrors = Object.fromEntries(
      Object.entries(newErrors).filter(([_, value]) => value !== "")
    );
    
    setErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  }, [formData.name, validateField]);

  const handleFormChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!currentOrganization?.organizationId) {
      toast.error("Organization not found. Please select an organization.");
      return;
    }

    try {
      const workspaceData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        organizationId: currentOrganization.organizationId,
      };

      const result = await createWorkspaceMutation.mutateAsync(workspaceData);
      toast.success("Workspace created successfully!");
      
      // Reset form
      setFormData({
        name: "",
        description: "",
      });
      setErrors({});

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to create workspace");
    }
  }, [validateForm, formData, createWorkspaceMutation, currentOrganization, onSuccess]);

  return (
    <form onSubmit={handleSubmit} className={className}>
      {title && (
        <h2 className="text-2xl font-bold mb-8 text-center">{title}</h2>
      )}
      
      <div className="mb-8">
        <Label htmlFor="name" className="mb-2 block">Name *</Label>
        <Input
          id="name"
          placeholder="Workspace Name"
          value={formData.name}
          onChange={(e) => handleFormChange("name", e.target.value)}
          className={errors.name ? "border-red-500 focus:border-red-500" : ""}
          disabled={createWorkspaceMutation.isPending}
        />
        {errors.name && (
          <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
            <AlertCircle className="h-3 w-3" />
            {errors.name}
          </p>
        )}
      </div>

      <div className="mb-8">
        <Label htmlFor="description" className="mb-2 block">Description</Label>
        <Textarea
          id="description"
          placeholder="Description"
          value={formData.description}
          onChange={(e) => handleFormChange("description", e.target.value)}
          disabled={createWorkspaceMutation.isPending}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {showCancelButton && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={createWorkspaceMutation.isPending}
          >
            {cancelButtonText}
          </button>
        )}
        <button 
          type="submit" 
          className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          disabled={createWorkspaceMutation.isPending}
        >
          {createWorkspaceMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            submitButtonText
          )}
        </button>
      </div>
    </form>
  );
}


