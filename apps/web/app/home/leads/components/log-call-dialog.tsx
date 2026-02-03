'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@kit/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';



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
    const [callStatus, setCallStatus] = useState<
        'completed' | 'no_answer' | 'busy' | 'left_voicemail'
    >('completed');
    const [contactName, setContactName] = useState(defaultContactName);
    const [callDatetime, setCallDatetime] = useState(
        new Date().toISOString().slice(0, 16),
    );
    const [durationMinutes, setDurationMinutes] = useState<string>('');
    const [notes, setNotes] = useState('');

    const resetForm = () => {
        setSubject('');
        setCallType('outbound');
        setCallStatus('completed');
        setContactName(defaultContactName);
        setCallDatetime(new Date().toISOString().slice(0, 16));
        setDurationMinutes('');
        setNotes('');
    };

    const handleSave = async () => {
        if (!subject.trim()) {
            toast.error('Subject is required');
            return;
        }

        // No API delay

        const newCall = {
            id: Math.random().toString(36).substr(2, 9),
            subject,
            call_type: callType,
            call_status: callStatus,
            call_datetime: callDatetime,
            duration_minutes: durationMinutes ? parseInt(durationMinutes) : 0,
            notes,
            contact_name: contactName,
        };

        toast.success('Call logged successfully');
        resetForm();
        onSuccess(newCall);
        onOpenChange(false);
        setIsSaving(false);
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
                                value={callStatus}
                                onValueChange={(
                                    value: 'completed' | 'no_answer' | 'busy' | 'left_voicemail',
                                ) => setCallStatus(value)}
                            >
                                <SelectTrigger id="callStatus">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="no_answer">No Answer</SelectItem>
                                    <SelectItem value="busy">Busy</SelectItem>
                                    <SelectItem value="left_voicemail">Left Voicemail</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Contact Name and Phone */}
                    <div>
                        <div className="grid gap-2">
                            <Label htmlFor="contactName">Name</Label>
                            <Input
                                id="contactName"
                                placeholder="Person contacted"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                            />
                        </div>

                    </div>

                    {/* Call Date/Time and Duration */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="callDatetime">Date & Time</Label>
                            <Input
                                id="callDatetime"
                                type="datetime-local"
                                value={callDatetime}
                                onChange={(e) => setCallDatetime(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="duration">Duration (min)</Label>
                            <Input
                                id="duration"
                                type="number"
                                min="0"
                                placeholder="15"
                                value={durationMinutes}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="grid gap-2">
                        <Label htmlFor="notes">Comments</Label>
                        <Textarea
                            id="notes"
                            placeholder="Additional details about the call..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
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
