'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Building2, User, Users, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@kit/ui/button';
import { DialogHeader, DialogTitle, DialogFooter } from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { DateTimePicker } from '@kit/ui/datetime-picker';
import { useRBAC } from '~/lib/rbac/rbac-provider';

// Services
import { getLeadsService } from '~/services/leads.service';
import { getContactsService } from '~/services/contacts.service';
import { getAccountsService } from '~/services/accounts.service';
import { getOpportunitiesService } from '~/services/opportunities.service';
import { createReminderService } from '~/services/activities.service';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  asFormOnly: boolean
}

export function GlobalCreateReminderForm({ onSuccess, onCancel, asFormOnly = false }: Props) {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    entity_type: 'lead',
    entityId: '',
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
  });

  const { data: leadsData } = useQuery({ queryKey: ['leads', workspace?.id], queryFn: () => getLeadsService({ workspaceId: workspace!.id }), enabled: !!workspace?.id && formData.entity_type === 'lead' });
  const { data: contactsData } = useQuery({ queryKey: ['contacts', workspace?.id], queryFn: () => getContactsService({ workspaceId: workspace!.id }), enabled: !!workspace?.id && formData.entity_type === 'contact' });
  const { data: accountsData } = useQuery({ queryKey: ['accounts', workspace?.id], queryFn: () => getAccountsService({ workspaceId: workspace!.id }), enabled: !!workspace?.id && formData.entity_type === 'account' });
  const { data: opportunitiesData } = useQuery({ queryKey: ['opportunities', workspace?.id], queryFn: () => getOpportunitiesService({ workspaceId: workspace!.id }), enabled: !!workspace?.id && formData.entity_type === 'opportunity' });

  const leads = (leadsData as any)?.data || [];
  const contacts = (contactsData as any)?.data || [];
  const accounts = (accountsData as any)?.data || [];
  const opportunities = (opportunitiesData as any)?.data || [];

  const mutation = useMutation({
    mutationFn: async () => {
      if (!formData.entityId) throw new Error('Please select an entity');
      if (!formData.title) throw new Error('Title is required');
      if (!formData.due_date) throw new Error('Due date is required');
      
      return createReminderService({
        workspace_id: workspace!.id,
        entity_type: formData.entity_type,
        entity_id: formData.entityId,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date,
      });
    },
    onSuccess: () => {
      toast.success('Reminder created');
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create reminder'),
  });

  return (
    <div className="flex h-full flex-col overflow-auto">
      
      <div className="flex-1 space-y-2 overflow-y-auto px-2 gap-2">
        <div className="space-y-2">
          <Label>Associate with</Label>
          <RadioGroup
            value={formData.entity_type}
            onValueChange={(val) => setFormData({ ...formData, entity_type: val, entityId: '' })}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lead" id="lead" />
              <Label htmlFor="lead" className="!flex cursor-pointer items-center gap-1"><User className="h-3 w-3" /> Lead</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="contact" id="contact" />
              <Label htmlFor="contact" className="!flex cursor-pointer items-center gap-1"><Users className="h-3 w-3" /> Contact</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="account" id="account" />
              <Label htmlFor="account" className="!flex cursor-pointer items-center gap-1"><Building2 className="h-3 w-3" /> Account</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="opportunity" id="opportunity" />
              <Label htmlFor="opportunity" className="!flex cursor-pointer items-center gap-1"><Briefcase className="h-3 w-3" /> Opportunity</Label>
            </div>
          </RadioGroup>

          <Select value={formData.entityId} onValueChange={(val) => setFormData({ ...formData, entityId: val })}>
            <SelectTrigger><SelectValue placeholder={`Select ${formData.entity_type}...`} /></SelectTrigger>
            <SelectContent>
              {formData.entity_type === 'lead' && leads.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.first_name} {l.last_name || ''}</SelectItem>)}
              {formData.entity_type === 'contact' && contacts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ''}</SelectItem>)}
              {formData.entity_type === 'account' && accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}
              {formData.entity_type === 'opportunity' && opportunities.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.opportunity_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div><Label>Title</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Call client..." /></div>
        <div><Label>Description</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Add more details..." /></div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Priority</Label>
            <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
              <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Due Date</Label>
            <DateTimePicker showTime value={formData.due_date ? new Date(formData.due_date) : undefined} onChange={(date) => setFormData({ ...formData, due_date: date ? format(date, "yyyy-MM-dd'T'HH:mm") : '' })} />
          </div>
        </div>
      </div>
      
      <DialogFooter className="mt-2">
        <Button variant="outline" onClick={onCancel} disabled={mutation.isPending}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (!asFormOnly ? <Plus className="h-4 w-4" />: '')}
          Add Reminder
        </Button>
      </DialogFooter>
    </div>
  );
}
