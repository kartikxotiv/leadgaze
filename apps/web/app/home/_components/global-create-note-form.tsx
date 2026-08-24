'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Building2, User, Users, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { DialogHeader, DialogTitle, DialogFooter } from '@kit/ui/dialog';
import { Label } from '@kit/ui/label';
import { Textarea } from '@kit/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { useRBAC } from '~/lib/rbac/rbac-provider';

// Services
import { getLeadsService } from '~/services/leads.service';
import { getContactsService } from '~/services/contacts.service';
import { getAccountsService } from '~/services/accounts.service';
import { getOpportunitiesService } from '~/services/opportunities.service';
import { createNoteService } from '~/services/activities.service';

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  asFormOnly: boolean
}

export function GlobalCreateNoteForm({ onSuccess, onCancel, asFormOnly = false }: Props) {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    entity_type: 'lead',
    entityId: '',
    content: '',
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
      if (!formData.content) throw new Error('Note content is required');
      
      return createNoteService({
        workspace_id: workspace!.id,
        entity_type: formData.entity_type,
        entity_id: formData.entityId,
        content: formData.content,
      });
    },
    onSuccess: () => {
      toast.success('Note added');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      onSuccess();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add note'),
  });

  return (
    <div className="flex h-full flex-col overflow-auto">
      
      <div className="flex-1 space-y-2 overflow-y-auto px-2">
        <div>
          <Label>Associate with</Label>
          <RadioGroup
            value={formData.entity_type}
            onValueChange={(val) => setFormData({ ...formData, entity_type: val, entityId: '' })}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lead" id="note-lead" />
              <Label htmlFor="note-lead" className="!flex cursor-pointer items-center gap-1"><User className="h-3 w-3" /> Lead</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="contact" id="note-contact" />
              <Label htmlFor="note-contact" className="!flex cursor-pointer items-center gap-1"><Users className="h-3 w-3" /> Contact</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="account" id="note-account" />
              <Label htmlFor="note-account" className="!flex cursor-pointer items-center gap-1"><Building2 className="h-3 w-3" /> Account</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="opportunity" id="note-opportunity" />
              <Label htmlFor="note-opportunity" className="!flex cursor-pointer items-center gap-1"><Briefcase className="h-3 w-3" /> Opportunity</Label>
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

        <div>
          <Label>Note Content</Label>
          <Textarea 
            rows={5}
            value={formData.content} 
            onChange={(e) => setFormData({ ...formData, content: e.target.value })} 
            placeholder="Write your note here..." 
          />
        </div>
      </div>
      
      <DialogFooter className="mt-2">
        <Button variant="outline" onClick={onCancel} disabled={mutation.isPending}>Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (!asFormOnly ? <Plus className="h-4 w-4" />: '')}
          Add Note
        </Button>
      </DialogFooter>
    </div>
  );
}
