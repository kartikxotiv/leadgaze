"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PermissionManager } from "@/lib/permissions";

interface InviteUserDialogProps {
  currentUserOrganization: any;
  organizationId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function InviteUserDialog({
  currentUserOrganization,
  organizationId,
  onSuccess,
  trigger,
}: InviteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "viewer",
    message: "",
  });

  // Check if user can invite users
  const canInvite = PermissionManager.canInviteUsers(currentUserOrganization);

  if (!canInvite) {
    return null;
  }

  const availableRoles = PermissionManager.getAssignableRoles(
    currentUserOrganization
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: formData.email,
          role: formData.role,
          organizationId,
          message: formData.message,
        }),
      });

      const data = await response.json();
      console.log("Invite API response:", data);

      if (data.success) {
        toast.success("Invitation sent successfully!");
        setFormData({ email: "", role: "viewer", message: "" });
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(data.error || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Invitation error:", error);
      toast.error("Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const defaultTrigger = (
    <Button className="flex items-center space-x-2">
      <UserPlus className="h-4 w-4" />
      <span>Invite User</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to add a new member to your organization. They'll
            receive an email with instructions to join.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">
                        {PermissionManager.getRoleDisplayName(role)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {PermissionManager.getRoleDescription(role)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, message: e.target.value }))
              }
              placeholder="Welcome to our team! We're excited to have you join us..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
