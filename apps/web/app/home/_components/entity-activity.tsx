import { AlertCircle, Calendar, Download, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

export function EntityReminders() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-base">Reminders</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="py-8 text-center">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="mb-4 text-sm text-gray-500">No reminders set</p>
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2 text-xs"
                        onClick={() => toast.info('Reminder creation coming soon')}
                    >
                        <Plus className="h-3 w-3" />
                        Set Reminder
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function EntityMeetings() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-base">Meetings</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="py-8 text-center">
                    <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="mb-4 text-sm text-gray-500">No meetings scheduled</p>
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2 text-xs"
                        onClick={() => toast.info('Meeting creation coming soon')}
                    >
                        <Plus className="h-3 w-3" />
                        Schedule
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function EntityDocuments() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-base">Documents</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="py-8 text-center">
                    <Download className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="mb-4 text-sm text-gray-500">No documents</p>
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2 text-xs"
                        onClick={() => toast.info('Document upload coming soon')}
                    >
                        <Plus className="h-3 w-3" />
                        Upload
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
