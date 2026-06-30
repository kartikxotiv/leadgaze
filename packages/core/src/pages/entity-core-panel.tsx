'use client';

import React, { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';

import {
  completeReminderService,
  createMeetingService,
  createNoteService,
  createReminderService,
  deleteDocumentService,
  deleteMeetingService,
  deleteNoteService,
  deleteReminderService,
  getActivitiesService,
  getDocumentsService,
  getEmailsService,
  getMeetingsService,
  getNotesService,
  getRemindersService,
  sendEmailService,
  uploadDocumentService,
} from '../services';
import { useLocalization } from '@kit/shared/localization';


type CoreEntityPanelProps = {
  workspaceId: string;
  entityType: string;
  entityId: string;
  capabilities?: Array<'notes' | 'meetings' | 'emails' | 'documents' | 'activities' | 'reminders'>;
};

const defaultCapabilities: NonNullable<CoreEntityPanelProps['capabilities']> = [
  'notes',
  'meetings',
  'emails',
  'documents',
  'activities',
  'reminders',
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label>{label}</Label>{children}</div>;
}

function entityPayload({ workspaceId, entityType, entityId }: Omit<CoreEntityPanelProps, 'capabilities'>) {
  return {
    workspace_id: workspaceId,
    entity_type: entityType,
    entity_id: entityId,
  };
}

export function CoreEntityPanel(props: CoreEntityPanelProps) {
  const capabilities = props.capabilities ?? defaultCapabilities;
  const first = capabilities[0] ?? 'notes';

  return (
    <Tabs defaultValue={first} className="grid gap-4">
      {capabilities.length > 1 && (
        <TabsList className="flex h-auto flex-wrap justify-start">
          {capabilities.includes('notes') && <TabsTrigger value="notes">Notes</TabsTrigger>}
          {capabilities.includes('meetings') && <TabsTrigger value="meetings">Meetings</TabsTrigger>}
          {capabilities.includes('emails') && <TabsTrigger value="emails">Emails</TabsTrigger>}
          {capabilities.includes('documents') && <TabsTrigger value="documents">Documents</TabsTrigger>}
          {capabilities.includes('activities') && <TabsTrigger value="activities">Activities</TabsTrigger>}
          {capabilities.includes('reminders') && <TabsTrigger value="reminders">Follow-Ups</TabsTrigger>}
        </TabsList>
      )}

      {capabilities.includes('notes') && <TabsContent value="notes"><NotesPanel {...props} /></TabsContent>}
      {capabilities.includes('meetings') && <TabsContent value="meetings"><MeetingsPanel {...props} /></TabsContent>}
      {capabilities.includes('emails') && <TabsContent value="emails"><EmailsPanel {...props} /></TabsContent>}
      {capabilities.includes('documents') && <TabsContent value="documents"><DocumentsPanel {...props} /></TabsContent>}
      {capabilities.includes('activities') && <TabsContent value="activities"><ActivitiesPanel {...props} /></TabsContent>}
      {capabilities.includes('reminders') && <TabsContent value="reminders"><RemindersPanel {...props} /></TabsContent>}
    </Tabs>
  );
}

function NotesPanel(props: CoreEntityPanelProps) {
  const queryClient = useQueryClient();
  const { formatDateTime } = useLocalization();
  const [note, setNote] = useState('');
  const queryKey = ['core', 'notes', props.workspaceId, props.entityType, props.entityId];
  const { data: notes = [] } = useQuery<any[]>({ queryKey, queryFn: () => getNotesService(props.workspaceId, props.entityType, props.entityId), enabled: !!props.workspaceId && !!props.entityId });
  const createMutation = useMutation({ mutationFn: createNoteService, onSuccess: () => { setNote(''); queryClient.invalidateQueries({ queryKey }); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteNoteService(props.workspaceId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey }) });

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <Label>New Note</Label>
        <Textarea placeholder="Add context, decisions, or next steps" value={note} onChange={(event) => setNote(event.target.value)} />
        <div className="flex justify-end"><Button disabled={!note.trim() || createMutation.isPending} onClick={() => createMutation.mutate({ ...entityPayload(props), note })}><Plus className="mr-2 h-4 w-4" /> Add Note</Button></div>
      </div>
      <List empty="No notes yet.">{notes.map((item) => <Row key={item.id} title={item.note} meta={formatDateTime(item.created_at)} onDelete={() => deleteMutation.mutate(item.id)} />)}</List>
    </section>
  );
}

function MeetingsPanel(props: CoreEntityPanelProps) {
  const queryClient = useQueryClient();
  const { formatDateTime } = useLocalization();
  const [form, setForm] = useState({ title: '', description: '', start_time: '', end_time: '', location: '' });
  const queryKey = ['core', 'meetings', props.workspaceId, props.entityType, props.entityId];
  const { data: meetings = [] } = useQuery<any[]>({ queryKey, queryFn: () => getMeetingsService(props.workspaceId, props.entityType, props.entityId), enabled: !!props.workspaceId && !!props.entityId });
  const createMutation = useMutation({ mutationFn: createMeetingService, onSuccess: () => { setForm({ title: '', description: '', start_time: '', end_time: '', location: '' }); queryClient.invalidateQueries({ queryKey }); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteMeetingService(props.workspaceId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey }) });

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
        <Field label="Title"><Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Investor pitch call" /></Field>
        <Field label="Location"><Input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} placeholder="Zoom / office / phone" /></Field>
        <Field label="Start Time"><Input type="datetime-local" value={form.start_time} onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))} /></Field>
        <Field label="End Time"><Input type="datetime-local" value={form.end_time} onChange={(event) => setForm((prev) => ({ ...prev, end_time: event.target.value }))} /></Field>
        <div className="sm:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></Field></div>
        <div className="flex justify-end sm:col-span-2"><Button disabled={!form.title || createMutation.isPending} onClick={() => createMutation.mutate({ ...entityPayload(props), ...form, start_time: form.start_time || null, end_time: form.end_time || null, location: form.location || null, description: form.description || null })}><Plus className="mr-2 h-4 w-4" /> Add Meeting</Button></div>
      </div>
      <List empty="No meetings scheduled.">{meetings.map((item) => <Row key={item.id} title={item.title} meta={`${item.status} · ${formatDateTime(item.start_time)}`} description={item.description} onDelete={() => deleteMutation.mutate(item.id)} />)}</List>
    </section>
  );
}

function EmailsPanel(props: CoreEntityPanelProps) {
  const queryClient = useQueryClient();
  const { formatDateTime } = useLocalization();
  const [form, setForm] = useState({ to_email: '', subject: '', body: '' });
  const queryKey = ['core', 'emails', props.workspaceId, props.entityType, props.entityId];
  const { data: emails = [] } = useQuery<any[]>({ queryKey, queryFn: () => getEmailsService(props.workspaceId, props.entityType, props.entityId), enabled: !!props.workspaceId && !!props.entityId });
  const sendMutation = useMutation({ mutationFn: sendEmailService, onSuccess: () => { setForm({ to_email: '', subject: '', body: '' }); queryClient.invalidateQueries({ queryKey }); } });

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-md border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="To"><Input type="email" value={form.to_email} onChange={(event) => setForm((prev) => ({ ...prev, to_email: event.target.value }))} placeholder="investor@example.com" /></Field>
          <Field label="Subject"><Input value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))} placeholder="Follow-up on our call" /></Field>
        </div>
        <Field label="Body"><Textarea value={form.body} onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))} placeholder="Email body" /></Field>
        <div className="flex justify-end"><Button disabled={!form.to_email || !form.subject || !form.body || sendMutation.isPending} onClick={() => sendMutation.mutate({ ...entityPayload(props), ...form })}><Plus className="mr-2 h-4 w-4" /> Log Email</Button></div>
      </div>
      <List empty="No emails logged.">{emails.map((item) => <Row key={item.id} title={item.subject} meta={`${item.to_email} · ${item.status} · ${formatDateTime(item.sent_at)}`} description={item.body} />)}</List>
    </section>
  );
}

function DocumentsPanel(props: CoreEntityPanelProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', file: null as File | null, file_url: '', category: '', description: '' });
  const queryKey = ['core', 'documents', props.workspaceId, props.entityType, props.entityId];
  const { data: documents = [] } = useQuery<any[]>({ queryKey, queryFn: () => getDocumentsService(props.workspaceId, props.entityType, props.entityId), enabled: !!props.workspaceId && !!props.entityId });
  const uploadMutation = useMutation({ mutationFn: uploadDocumentService, onSuccess: () => { setForm({ name: '', file: null, file_url: '', category: '', description: '' }); queryClient.invalidateQueries({ queryKey }); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteDocumentService(props.workspaceId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey }) });
  const canUpload = form.name.trim() && (form.file || form.file_url.trim());

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
        <Field label="Document Name"><Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Pitch deck" /></Field>
        <Field label="Category"><Input value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Pitch Deck / Term Sheet" /></Field>
        <div className="sm:col-span-2"><Field label="File"><Input type="file" onChange={(event) => setForm((prev) => ({ ...prev, file: event.target.files?.[0] ?? null, name: prev.name || event.target.files?.[0]?.name || '' }))} /></Field></div>
        <div className="sm:col-span-2"><Field label="External URL"><Input value={form.file_url} onChange={(event) => setForm((prev) => ({ ...prev, file_url: event.target.value }))} placeholder="https://..." /></Field></div>
        <div className="sm:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></Field></div>
        <div className="flex justify-end sm:col-span-2"><Button disabled={!canUpload || uploadMutation.isPending} onClick={() => {
          const payload = new FormData();
          payload.set('workspace_id', props.workspaceId);
          payload.set('entity_type', props.entityType);
          payload.set('entity_id', props.entityId);
          payload.set('name', form.name);
          if (form.category) payload.set('category', form.category);
          if (form.description) payload.set('description', form.description);
          if (form.file_url) payload.set('file_url', form.file_url);
          if (form.file) payload.set('file', form.file);
          uploadMutation.mutate(payload);
        }}><Plus className="mr-2 h-4 w-4" /> Add Document</Button></div>
      </div>
      <List empty="No documents added.">{documents.map((item) => <Row key={item.id} title={item.name} meta={item.category ?? 'Document'} description={item.description} href={item.file_url ?? item.file_path} onDelete={() => deleteMutation.mutate(item.id)} />)}</List>
    </section>
  );
}

function ActivitiesPanel(props: CoreEntityPanelProps) {
  const { formatDateTime } = useLocalization();
  const { data: activities = [] } = useQuery<any[]>({ queryKey: ['core', 'activities', props.workspaceId, props.entityType, props.entityId], queryFn: () => getActivitiesService(props.workspaceId, props.entityType, props.entityId), enabled: !!props.workspaceId && !!props.entityId });
  return <List empty="No activities logged.">{activities.map((item) => <Row key={item.id} title={item.title} meta={`${item.activity_type} · ${formatDateTime(item.created_at)}`} description={item.description} />)}</List>;
}

function RemindersPanel(props: CoreEntityPanelProps) {
  const queryClient = useQueryClient();
  const { formatDateTime } = useLocalization();
  const [form, setForm] = useState({ title: '', description: '', due_at: '', priority: 'medium' });
  const queryKey = ['core', 'reminders', props.workspaceId, props.entityType, props.entityId];
  const { data: reminders = [] } = useQuery<any[]>({ queryKey, queryFn: () => getRemindersService(props.workspaceId, props.entityType, props.entityId), enabled: !!props.workspaceId && !!props.entityId });
  const createMutation = useMutation({ mutationFn: createReminderService, onSuccess: () => { setForm({ title: '', description: '', due_at: '', priority: 'medium' }); queryClient.invalidateQueries({ queryKey }); } });
  const completeMutation = useMutation({ mutationFn: (id: string) => completeReminderService(props.workspaceId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey }) });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteReminderService(props.workspaceId, id), onSuccess: () => queryClient.invalidateQueries({ queryKey }) });

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
        <Field label="Title"><Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Follow up with investor" /></Field>
        <Field label="Due At"><Input type="datetime-local" value={form.due_at} onChange={(event) => setForm((prev) => ({ ...prev, due_at: event.target.value }))} /></Field>
        <Field label="Priority"><Select value={form.priority} onValueChange={(priority) => setForm((prev) => ({ ...prev, priority }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></Field>
        <div className="sm:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></Field></div>
        <div className="flex justify-end sm:col-span-2"><Button disabled={!form.title || createMutation.isPending} onClick={() => createMutation.mutate({ ...entityPayload(props), ...form, due_at: form.due_at || null, description: form.description || null })}><Plus className="mr-2 h-4 w-4" /> Add Follow-Up</Button></div>
      </div>
      <List empty="No follow-ups scheduled.">{reminders.map((item) => <Row key={item.id} title={item.title} meta={`${item.priority} · ${formatDateTime(item.due_at)}`} description={item.description} badge={item.status} onDelete={() => deleteMutation.mutate(item.id)} action={item.status !== 'completed' ? <Button variant="ghost" size="sm" onClick={() => completeMutation.mutate(item.id)}><Check className="h-4 w-4" /></Button> : null} />)}</List>
    </section>
  );
}

function List({ children, empty }: { children: React.ReactNode; empty: string }) {
  return <div className="rounded-md border">{React.Children.count(children) === 0 ? <div className="p-4 text-sm text-muted-foreground">{empty}</div> : children}</div>;
}

function Row({ title, meta, description, href, badge, onDelete, action }: { title: string; meta?: string; description?: string | null; href?: string | null; badge?: string; onDelete?: () => void; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b p-3 text-sm last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 font-medium">
          {href ? <a className="underline-offset-4 hover:underline" href={href} target="_blank" rel="noreferrer">{title}</a> : title}
          {badge && <Badge variant="outline">{badge}</Badge>}
        </div>
        {meta && <div className="text-muted-foreground">{meta}</div>}
        {description && <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{description}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {action}
        {onDelete && <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}
