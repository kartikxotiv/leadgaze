'use client';

import { useMemo, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, FileText, Loader2, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { cn } from '@kit/ui/utils';

interface EntityEmailsProps {
  leadId: string;
  onOpenDraft: (draft: any) => void;
}

export function EntityEmails({ leadId, onOpenDraft }: EntityEmailsProps) {
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useMemo(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  // Ensure we are on client
  const isClient = typeof window !== 'undefined';

  // Unified Local Storage Query
  const { data: combinedItems = [], isLoading } = useQuery({
    queryKey: ['lead-drafts', leadId],
    queryFn: () => {
      if (typeof window === 'undefined') return [];
      const local = localStorage.getItem(`email_activities_${leadId}`);
      const activities = local ? JSON.parse(local) : [];

      return activities.sort((a: any, b: any) => {
        const dateA = new Date(
          a.timestamp || a.sent_at || a.updated_at || a.created_at || 0,
        ).getTime();
        const dateB = new Date(
          b.timestamp || b.sent_at || b.updated_at || b.created_at || 0,
        ).getTime();
        return dateB - dateA;
      });
    },
  });

  // Handle local delete
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const local = localStorage.getItem(`email_activities_${leadId}`);
    if (local) {
      const activities = JSON.parse(local);
      const filtered = activities.filter((item: any) => item.id !== id);
      localStorage.setItem(
        `email_activities_${leadId}`,
        JSON.stringify(filtered),
      );
      queryClient.invalidateQueries({ queryKey: ['lead-drafts', leadId] });
      toast.success('Record removed');
    }
  };

  if (!mounted) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-lg">Emails</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (combinedItems.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-400" />
            <CardTitle className="text-lg">Emails</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Mail className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No email activity yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-lg">Emails</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {combinedItems.map((item: any) => (
              <div
                key={item.id}
                className={cn(
                  'group relative rounded-lg border border-gray-100 bg-gray-50 p-3 transition-all dark:border-gray-800 dark:bg-slate-900',
                  item.type !== 'sent'
                    ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800'
                    : 'cursor-default',
                )}
                onClick={() => item.type !== 'sent' && onOpenDraft(item)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 rounded-full p-2 ${
                      item.type === 'sent'
                        ? 'bg-green-100 text-green-600'
                        : item.type === 'scheduled'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-amber-100 text-amber-600'
                    }`}
                  >
                    {item.type === 'sent' ? (
                      <Mail className="h-4 w-4" />
                    ) : item.type === 'scheduled' ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.subject || '(No Subject)'}
                      </p>
                      <Badge
                        variant="outline"
                        className={`h-4 px-1 text-[10px] ${
                          item.type === 'sent'
                            ? 'border-green-200 bg-green-50 text-green-600'
                            : item.type === 'scheduled'
                              ? 'border-blue-200 bg-blue-50 text-blue-600'
                              : 'border-amber-200 bg-amber-50 text-amber-600'
                        }`}
                      >
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Badge>
                      {item.type !== 'sent' && (
                        <span className="text-[10px] text-blue-500 italic opacity-0 transition-opacity group-hover:opacity-100">
                          • Click to Edit
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-400"
                      dangerouslySetInnerHTML={{ __html: item.body }}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(
                            item.timestamp ||
                              item.sent_at ||
                              item.updated_at ||
                              item.created_at ||
                              new Date(),
                          ).toLocaleString()}
                        </span>
                      </div>
                      {item.recipients && (
                        <span className="max-w-[150px] truncate">
                          To: {item.recipients}
                        </span>
                      )}
                      {(item.cc || item.cc_recipients) && (
                        <span className="max-w-[100px] truncate">
                          CC:{' '}
                          {Array.isArray(item.cc || item.cc_recipients)
                            ? (item.cc || item.cc_recipients).join(', ')
                            : item.cc || item.cc_recipients}
                        </span>
                      )}
                      {item.type === 'scheduled' && (
                        <span className="font-semibold text-blue-600">
                          Due: {new Date(item.scheduled_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {item.type !== 'sent' && (
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="absolute top-3 right-3 p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
