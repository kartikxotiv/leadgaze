'use client';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Globe, Phone, Mail, Calendar, User, Briefcase, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { PageBody } from '@kit/ui/page';
import { Separator } from '@kit/ui/separator';

import { getContactByIdService } from '~/services/contacts.service';
import { EntityNotes } from '../../_components/entity-notes';
import { EntityDocuments, EntityMeetings, EntityReminders } from '../../_components/entity-activity';
import { EditContactDialog } from '../components/edit-contact-dialog';

export default function ContactDetailsPage() {
    const params = useParams();
    const id = params?.id as string;
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const {
        data: contact,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['contact', id],
        queryFn: () => getContactByIdService(id),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (error || !contact) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Contact Not Found</h1>
                <p className="text-muted-foreground">
                    The contact you're looking for doesn't exist or you don't have permission to view it.
                </p>
                <Button asChild variant="outline">
                    <Link href="/home/contacts">Back to Contacts</Link>
                </Button>
            </div>
        );
    }

    return (
        <>
            <div className="border-b bg-background px-6 py-4">
                <div className="mb-4 flex items-center justify-between">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link href="/home/contacts">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                        Edit Contact
                    </Button>
                </div>

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-lg font-semibold text-white">
                            {contact.first_name.charAt(0)}{contact.last_name?.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">{contact.first_name} {contact.last_name}</h1>
                            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                                {contact.job_title && (
                                    <span className="flex items-center gap-1">
                                        <Briefcase className="h-3 w-3" />
                                        {contact.job_title}
                                    </span>
                                )}
                                {contact.account && (
                                    <Link href={`/home/accounts/${contact.account.id}`} className="flex items-center gap-1 text-primary hover:underline">
                                        <Building2 className="h-3 w-3" />
                                        {contact.account.account_name}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {contact.status && (
                            <Badge
                                variant="secondary"
                                style={{
                                    backgroundColor: `${contact.status.color}20`,
                                    color: contact.status.color,
                                    borderColor: contact.status.color,
                                }}
                            >
                                {contact.status.status_name}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            <PageBody>
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Details</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <a href={`mailto:${contact.email}`} className="text-sm hover:underline">{contact.email || '-'}</a>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Alt Email</p>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{contact.alt_email || '-'}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <a href={`tel:${contact.phone_number}`} className="text-sm hover:underline">{contact.phone_number || '-'}</a>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Mobile</p>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <a href={`tel:${contact.mobile_number}`} className="text-sm hover:underline">{contact.mobile_number || '-'}</a>
                                    </div>
                                </div>

                                <div className="space-y-1 col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            {[contact.location, contact.timezone].filter(Boolean).join(' • ') || '-'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">Department</p>
                                    <span className="text-sm">{contact.department || '-'}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Notes Section */}
                        <EntityNotes
                            entityType="contact"
                            entityId={id}
                        />

                        {/* Activity Sections */}
                        <EntityReminders entityType="contact" entityId={id} />
                        <EntityMeetings entityType="contact" entityId={id} />
                        <EntityDocuments entityType="contact" entityId={id} />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm font-medium">System Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Owner</p>
                                    <div className="flex items-center gap-2">
                                        <User className="h-3 w-3" />
                                        <span className="text-sm">{contact.owner?.name || '-'}</span>
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Created At</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3" />
                                        <span className="text-sm">{new Date(contact.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                {contact.linkedin_url && (
                                    <>
                                        <Separator />
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium text-muted-foreground">Social</p>
                                            <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                                LinkedIn Profile
                                            </a>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </PageBody>

            <EditContactDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                contact={contact}
            />
        </>
    );
}
