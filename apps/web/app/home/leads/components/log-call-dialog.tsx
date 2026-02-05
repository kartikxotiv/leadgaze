'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@kit/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';
import { createCallService } from '~/services/calls.service';


interface LogCallDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (call: any) => void;
    entityType: string;
    entityId: string;
    workspaceId: string;
    defaultContactName?: string;
    defaultPhoneNumber?: string;
}

export function LogCallDialog({
    open,
    onOpenChange,
    onSuccess,
    entityType,
    entityId,
    workspaceId,
    defaultContactName = '',
}: LogCallDialogProps) {
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [subject, setSubject] = useState('');
    const [callType, setCallType] = useState<'inbound' | 'outbound'>('outbound');
    const [status, setStatus] = useState<
        'completed' | 'no_answer' | 'busy' | 'left_voicemail' | 'missed' | 'failed' | 'voicemail'
    >('completed');
    const [contactName, setContactName] = useState(defaultContactName);
    const [callDatetime, setCallDatetime] = useState(
        new Date().toISOString().slice(0, 16),
    );
    // const [durationMinutes, setDurationMinutes] = useState<string>(''); // Removed as per schema
    const [comments, setComments] = useState('');

    const resetForm = () => {
        setSubject('');
        setCallType('outbound');
        setStatus('completed');
        setContactName(defaultContactName);
        setCallDatetime(new Date().toISOString().slice(0, 16));
        // setDurationMinutes('');
        setComments('');
    };

    const handleSave = async () => {
        if (!subject.trim()) {
            toast.error('Subject is required');
            return;
        }

        setIsSaving(true);
        try {
            const newCall = await createCallService({
                workspace_id: workspaceId,
                entity_type: entityType,
                entity_id: entityId,
                subject,
                call_type: callType,
                status,
                contact_name: contactName,
                date_time: new Date(callDatetime).toISOString(),
                comments,
            });

            toast.success('Call logged successfully');
            resetForm();
            onSuccess(newCall);
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to log call');
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            resetForm();
        }
        onOpenChange(open);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Call Log</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Subject */}
                    <div className="grid gap-2">
                        <Label htmlFor="subject">
                            Subject <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="subject"
                            placeholder="Brief description of the call"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>

                    {/* Call Type and Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="callType">Call Type</Label>
                            <Select
                                value={callType}
                                onValueChange={(value: 'inbound' | 'outbound') =>
                                    setCallType(value)
                                }
                            >
                                <SelectTrigger id="callType">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="outbound">Outbound</SelectItem>
                                    <SelectItem value="inbound">Inbound</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="callStatus">Status</Label>
                            <Select
                                value={status}
                                onValueChange={(
                                    value: 'completed' | 'no_answer' | 'busy' | 'left_voicemail' | 'missed' | 'failed' | 'voicemail',
                                ) => setStatus(value)}
                            >
                                <SelectTrigger id="callStatus">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="missed">Missed</SelectItem>
                                    <SelectItem value="no_answer">No Answer</SelectItem>
                                    <SelectItem value="busy">Busy</SelectItem>
                                    <SelectItem value="left_voicemail">Left Voicemail</SelectItem>
                                    <SelectItem value="voicemail">Voicemail</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Contact Name */}
                    <div className="grid gap-2">
                        <Label htmlFor="contactName">Name</Label>
                        <Input
                            id="contactName"
                            placeholder="Person contacted"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                        />
                    </div>

                    {/* Call Date/Time */}
                    <div className="grid gap-2">
                        <Label htmlFor="callDatetime">Date & Time</Label>
                        <Input
                            id="callDatetime"
                            type="datetime-local"
                            value={callDatetime}
                            onChange={(e) => setCallDatetime(e.target.value)}
                        />
                    </div>

                    {/* Comments */}
                    <div className="grid gap-2">
                        <Label htmlFor="comments">Comments</Label>
                        <Textarea
                            id="comments"
                            placeholder="Additional details about the call..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Log Call'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
