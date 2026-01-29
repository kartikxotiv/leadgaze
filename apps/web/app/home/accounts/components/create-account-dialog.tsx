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
import { Separator } from '@kit/ui/separator';
import { Textarea } from '@kit/ui/textarea';
import { Checkbox } from '@kit/ui/checkbox';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { createAccountService } from '~/services/accounts.service';
import { IndustrySelect } from '../../_components/industry-select';

interface CreateAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (account: any) => void;
}

export function CreateAccountDialog({
    open,
    onOpenChange,
    onSuccess,
}: CreateAccountDialogProps) {
    const { currentWorkspace: workspace } = useRBAC();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        account_name: '',
        website: '',
        phone_number: '',
        industry_id: '',
        company_size: '',
        billing_street: '',
        billing_city: '',
        billing_state: '',
        billing_postal_code: '',
        billing_country: '',
        description: '',
        is_public: true,
    });


    const mutation = useMutation({
        mutationFn: async (payload: any) => {
            return createAccountService({
                ...payload,
                workspaceId: workspace?.id,
            });
        },
        onSuccess: (data) => {
            toast.success('Account created successfully');
            queryClient.invalidateQueries({ queryKey: ['accounts', workspace?.id] });
            resetForm();
            onOpenChange(false);
            if (onSuccess) onSuccess(data);
        },
        onError: (error: any) => {
            toast.error(error?.message || 'Failed to create account');
        },
    });

    const resetForm = () => {
        setFormData({
            account_name: '',
            website: '',
            phone_number: '',
            industry_id: '',
            company_size: '',
            billing_street: '',
            billing_city: '',
            billing_state: '',
            billing_postal_code: '',
            billing_country: '',
            description: '',
            is_public: true,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.account_name) {
            toast.error('Account name is required');
            return;
        }
        mutation.mutate(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Create New Account</DialogTitle>
                    <DialogDescription>
                        Add a new business account to your workspace.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Basic Information
                        </h3>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="account_name">Account Name *</Label>
                                <Input
                                    id="account_name"
                                    value={formData.account_name}
                                    onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                                    placeholder="Acme Corp"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <Input
                                    id="website"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    placeholder="https://acme.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone_number">Phone Number</Label>
                                <Input
                                    id="phone_number"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    placeholder="+1..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="industry_id">Industry</Label>
                                <IndustrySelect
                                    value={formData.industry_id}
                                    onValueChange={(value) => setFormData({ ...formData, industry_id: value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company_size">Company Size</Label>
                                <Select
                                    value={formData.company_size}
                                    onValueChange={(value) => setFormData({ ...formData, company_size: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1-10">1-10</SelectItem>
                                        <SelectItem value="11-50">11-50</SelectItem>
                                        <SelectItem value="51-200">51-200</SelectItem>
                                        <SelectItem value="201-500">201-500</SelectItem>
                                        <SelectItem value="501+">501+</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Address Information
                        </h3>
                        <Separator />
                        <div className="space-y-2">
                            <Label htmlFor="billing_street">Street Address</Label>
                            <Input
                                id="billing_street"
                                value={formData.billing_street}
                                onChange={(e) => setFormData({ ...formData, billing_street: e.target.value })}
                                placeholder="123 Main St"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="billing_city">City</Label>
                                <Input
                                    id="billing_city"
                                    value={formData.billing_city}
                                    onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="billing_state">State/Province</Label>
                                <Input
                                    id="billing_state"
                                    value={formData.billing_state}
                                    onChange={(e) => setFormData({ ...formData, billing_state: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="billing_postal_code">Postal Code</Label>
                                <Input
                                    id="billing_postal_code"
                                    value={formData.billing_postal_code}
                                    onChange={(e) => setFormData({ ...formData, billing_postal_code: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="billing_country">Country</Label>
                                <Input
                                    id="billing_country"
                                    value={formData.billing_country}
                                    onChange={(e) => setFormData({ ...formData, billing_country: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-4">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Add some details about the account..."
                            rows={3}
                        />
                    </div>

                    <div className="flex items-start gap-3 pt-4">
                        <Checkbox
                            id="is_public"
                            checked={formData.is_public}
                            onCheckedChange={(checked) => {
                                setFormData((prev) => ({
                                    ...prev,
                                    is_public: checked as boolean,
                                }));
                            }}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <Label
                                htmlFor="is_public"
                                className="cursor-pointer text-sm font-medium"
                            >
                                Make this account public
                            </Label>
                            <p className="mt-1 text-sm text-muted-foreground">
                                When public, this account will be visible to all team members
                                with "View accounts" access. When private, only you and
                                assigned team members can see it.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Create Account
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
