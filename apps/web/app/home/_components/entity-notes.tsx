import { MessageSquare, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Separator } from '@kit/ui/separator';

interface EntityNotesProps {
    notes?: string | null;
    updatedAt?: string;
    onAddNote?: () => void;
}

export function EntityNotes({ notes, updatedAt, onAddNote }: EntityNotesProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-lg">Notes</CardTitle>
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-xs"
                    onClick={() => onAddNote ? onAddNote() : toast.info('Note creation coming soon')}
                >
                    <Plus className="h-3 w-3" />
                    Add
                </Button>
            </CardHeader>
            <CardContent>
                {notes ? (
                    <div className="space-y-4">
                        <p className="rounded bg-gray-50 p-3 text-sm whitespace-pre-wrap text-gray-700 dark:bg-slate-900 dark:text-gray-300">
                            {notes}
                        </p>
                        {updatedAt && (
                            <>
                                <Separator />
                                <p className="text-xs text-gray-500">
                                    Updated: {new Date(updatedAt).toLocaleDateString()}
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="py-8 text-center">
                        <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-500">No notes yet</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
