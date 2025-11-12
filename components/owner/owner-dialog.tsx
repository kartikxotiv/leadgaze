"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OwnerSelector } from "./owner-selector";
import { OwnerAvatar, type Owner } from "./owner-avatar";
import { Button } from "@/components/ui/button";
import { UserCog } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth-store";

interface OwnerDialogProps {
  leadId: string;
  trigger?: React.ReactNode;
  onOwnerUpdated?: (owner: Owner | null) => void;
}

/**
 * Dialog component for managing lead owner
 */
export function OwnerDialog({
  leadId,
  trigger,
  onOwnerUpdated,
}: OwnerDialogProps) {
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (open && leadId) {
      fetchOwner();
    }
  }, [open, leadId]);

  const fetchOwner = async () => {
    try {
      setIsLoading(true);
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`/api/sales-leads/${leadId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.data?.owner) {
        setOwner(data.data.owner);
      } else {
        setOwner(null);
      }
    } catch (error) {
      console.error("Failed to fetch owner:", error);
      toast.error("Failed to fetch owner");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    setOpen(false);
    onOwnerUpdated?.(owner);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <UserCog className="h-4 w-4 mr-2" />
      Change Owner
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Change Owner</DialogTitle>
          <DialogDescription>
            Select a team member to be the owner of this lead. The owner is
            primarily responsible for this lead.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <OwnerSelector
              leadId={leadId}
              selectedOwner={owner}
              onOwnerChange={setOwner}
              onSave={handleSave}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline component that shows owner and allows editing via dialog
 */
interface OwnerInlineEditorProps {
  leadId: string;
  owner?: Owner | null;
  onOwnerUpdated?: (owner: Owner | null) => void;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function OwnerInlineEditor({
  leadId,
  owner: initialOwner,
  onOwnerUpdated,
  size = "md",
  showLabel = false,
}: OwnerInlineEditorProps) {
  const [owner, setOwner] = useState<Owner | null>(initialOwner || null);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (initialOwner !== undefined) {
      setOwner(initialOwner || null);
    } else if (leadId) {
      fetchOwner();
    }
  }, [leadId, initialOwner]);

  const fetchOwner = async () => {
    try {
      setIsLoading(true);
      if (!token) {
        return;
      }

      const response = await fetch(`/api/sales-leads/${leadId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.data?.owner) {
        setOwner(data.data.owner);
      } else {
        setOwner(null);
      }
    } catch (error) {
      console.error("Failed to fetch owner:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOwnerUpdated = (newOwner: Owner | null) => {
    setOwner(newOwner);
    onOwnerUpdated?.(newOwner);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <OwnerAvatar owner={owner} size={size} showLabel={showLabel} />
      <OwnerDialog
        leadId={leadId}
        onOwnerUpdated={handleOwnerUpdated}
        trigger={
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <UserCog className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
}

