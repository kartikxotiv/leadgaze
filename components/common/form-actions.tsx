"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormActionsProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  submitIcon?: React.ReactNode;
  cancelIcon?: React.ReactNode;
  className?: string;
  submitVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  disabled?: boolean;
}

export function FormActions({
  onCancel,
  onSubmit,
  submitText = "Save",
  cancelText = "Cancel",
  isLoading = false,
  submitIcon = <Save className="h-4 w-4 mr-2" />,
  cancelIcon = <X className="h-4 w-4 mr-2" />,
  className,
  submitVariant = "default",
  disabled = false,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 pt-4 border-t",
        className
      )}
    >
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {cancelIcon}
          {cancelText}
        </Button>
      )}
      <Button
        type="submit"
        variant={submitVariant}
        onClick={onSubmit}
        disabled={isLoading || disabled}
        className={cn(
          submitVariant === "default" &&
            "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          submitIcon
        )}
        {submitText}
      </Button>
    </div>
  );
}

// Common button groups for different contexts
export function CRMFormActions({
  onCancel,
  actionText,
  isLoading = false,
  actionIcon,
}: {
  onCancel?: () => void;
  actionText: string;
  isLoading?: boolean;
  actionIcon?: React.ReactNode;
}) {
  return (
    <FormActions
      onCancel={onCancel}
      submitText={actionText}
      isLoading={isLoading}
      submitIcon={actionIcon || <Save className="h-4 w-4 mr-2" />}
    />
  );
}
