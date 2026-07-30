'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  CheckCheck,
  RotateCcw,
  UserPlus,
  StickyNote,
  UserCircle,
  Send,
  Loader2,
  Phone,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Skeleton } from '@kit/ui/skeleton';
import { Textarea } from '@kit/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';

import type { WhatsAppConversation, WhatsAppMessage } from '../types';

function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatFullDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimeOnly(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-500',
  pending: 'bg-amber-500',
  resolved: 'bg-zinc-400',
  closed: 'bg-zinc-300',
};

export interface WhatsAppInboxTabProps {
  workspaceId: string;
  onGetConversations: (workspaceId: string, params?: { status?: string; page?: number }) => Promise<{ conversations: WhatsAppConversation[]; total: number }>;
  onGetMessages: (workspaceId: string, conversationId: string, params?: { page?: number }) => Promise<{ messages: WhatsAppMessage[]; total: number }>;
  onSendMessage: (workspaceId: string, conversationId: string, body: string) => Promise<unknown>;
  onResolveConversation: (workspaceId: string, conversationId: string) => Promise<unknown>;
  onReopenConversation: (workspaceId: string, conversationId: string) => Promise<unknown>;
  onConvertToLead: (workspaceId: string, conversationId: string) => Promise<{ leadId: string }>;
}

export function WhatsAppInboxTab({
  workspaceId,
  onGetConversations,
  onGetMessages,
  onSendMessage,
  onResolveConversation,
  onReopenConversation,
  onConvertToLead,
}: WhatsAppInboxTabProps) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [search, setSearch] = useState('');

  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [reply, setReply] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  const loadConversations = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingConvs(true);
    try {
      const data = await onGetConversations(workspaceId, { status: statusFilter });
      setConversations(data?.conversations ?? []);
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setIsLoadingConvs(false);
    }
  }, [workspaceId, statusFilter, onGetConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    if (!workspaceId) return;
    setIsLoadingMsgs(true);
    try {
      const data = await onGetMessages(workspaceId, convId);
      setMessages(data?.messages ?? []);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setIsLoadingMsgs(false);
    }
  }, [workspaceId, onGetMessages]);

  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!reply.trim() || !activeConvId || isSending) return;
    const body = reply.trim();
    setReply('');
    setIsSending(true);

    try {
      await onSendMessage(workspaceId, activeConvId, body);
      await loadMessages(activeConvId);
      await loadConversations();
    } catch {
      toast.error('Failed to send message');
      setReply(body);
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (convId: string, newStatus: 'resolved' | 'open') => {
    try {
      if (newStatus === 'resolved') {
        await onResolveConversation(workspaceId, convId);
        toast.success('Conversation resolved');
      } else {
        await onReopenConversation(workspaceId, convId);
        toast.success('Conversation reopened');
      }
      await loadConversations();
      if (activeConvId === convId) await loadMessages(convId);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleConvertToLeadAction = async () => {
    if (!activeConvId) return;
    try {
      const res = await onConvertToLead(workspaceId, activeConvId);
      toast.success('Converted conversation to Lead!');
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, lead_id: res.leadId } : c)),
      );
    } catch (e) {
      toast.error(`Convert failed: ${(e as Error).message}`);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.customer_phone.toLowerCase().includes(q) ||
      (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
      (c.first_message && c.first_message.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex h-full min-h-0 border rounded-lg overflow-hidden bg-background">
      {/* LEFT LIST - Compact list (240px) */}
      <div className="w-60 shrink-0 border-r flex flex-col h-full bg-muted/10">
        <div className="p-2.5 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {filteredConversations.length} {statusFilter}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 px-2">
                  <Filter className="h-3 w-3" />
                  <span className="capitalize">{statusFilter}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {['open', 'pending', 'resolved', 'closed', 'all'].map((st) => (
                  <DropdownMenuItem
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className="capitalize text-xs"
                  >
                    {st}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y min-h-0">
          {isLoadingConvs ? (
            <div className="p-3 space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="flex gap-3 items-center">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground px-4">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full text-left p-3 flex gap-3 transition-colors hover:bg-accent/10 ${
                    isActive ? 'bg-primary/5 border-l-2 border-primary' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {(conv.customer_name || conv.customer_phone).slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${
                        STATUS_COLORS[conv.status] ?? 'bg-zinc-400'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="text-xs font-semibold truncate text-foreground">
                        {conv.customer_name || conv.customer_phone}
                      </span>
                      {conv.last_message_at && (
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                          {formatMessageTime(conv.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {conv.first_message || conv.customer_phone}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT VIEW */}
      {!activeConv ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/5">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold text-sm">Select a conversation</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Choose a customer chat from the list to view messages and respond.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col min-w-0 bg-muted/5 h-full">
            {/* Header */}
            <div className="p-3 border-b bg-background flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {(activeConv.customer_name || activeConv.customer_phone).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold">
                      {activeConv.customer_name || activeConv.customer_phone}
                    </h3>
                    <Badge variant="outline" className="text-[9px] px-1.5 capitalize">
                      {activeConv.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {activeConv.customer_phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {activeConv.status === 'open' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleStatusChange(activeConv.id, 'resolved')}
                  >
                    <CheckCheck className="h-3 w-3 text-emerald-500" />
                    Resolve
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleStatusChange(activeConv.id, 'open')}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reopen
                  </Button>
                )}
              </div>
            </div>

            {/* Messages body - Expanded bubble container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {isLoadingMsgs ? (
                <div className="space-y-3 max-w-2xl mx-auto w-full">
                  <Skeleton className="h-10 w-48 rounded-2xl" />
                  <Skeleton className="h-10 w-56 ml-auto rounded-2xl" />
                  <Skeleton className="h-12 w-64 rounded-2xl" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No messages yet.
                </div>
              ) : (
                <div className="space-y-3 max-w-3xl mx-auto w-full">
                  {messages.map((msg) => {
                    const isOutgoing = msg.direction === 'outgoing';
                    return (
                      <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                            isOutgoing
                              ? 'bg-[#DCF8C6] dark:bg-green-900/40 text-zinc-900 dark:text-green-100 rounded-br-sm'
                              : 'bg-white dark:bg-zinc-800 text-foreground rounded-bl-sm'
                          }`}
                        >
                          {msg.body && <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>}
                          {msg.message_type !== 'text' && !msg.body && (
                            <p className="italic text-muted-foreground text-[10px]">[{msg.message_type}]</p>
                          )}
                          <div className={`flex items-center gap-1 mt-1 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[9px] text-muted-foreground">
                              {formatTimeOnly(msg.created_at)}
                            </span>
                            {isOutgoing && msg.status === 'read' && (
                              <CheckCheck className="h-2.5 w-2.5 text-blue-500" />
                            )}
                            {isOutgoing && msg.status === 'delivered' && (
                              <CheckCheck className="h-2.5 w-2.5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply area */}
            <div className="p-3 border-t bg-background shrink-0">
              <div className="flex items-end gap-2 max-w-3xl mx-auto w-full">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message... (Enter to send)"
                  className="min-h-[50px] max-h-28 text-xs resize-none"
                  disabled={isSending || activeConv.status === 'closed'}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!reply.trim() || isSending || activeConv.status === 'closed'}
                  className="h-9 w-9 shrink-0 bg-[#25D366] hover:bg-[#20b858] text-white"
                >
                  {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Contact Info - Compact 192px (w-48) */}
          <div className="w-48 shrink-0 border-l bg-background overflow-y-auto h-full p-3 space-y-4 text-xs">
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contact</h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{activeConv.customer_name ?? '—'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-[11px]">{activeConv.customer_phone}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">CRM Lead</h4>
              {activeConv.lead_id ? (
                <a
                  href={`/home/sales/leads/${activeConv.lead_id}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Lead
                </a>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1 text-xs h-7"
                  onClick={handleConvertToLeadAction}
                >
                  <UserPlus className="h-3 w-3" />
                  Convert to Lead
                </Button>
              )}
            </div>

            <div className="border-t pt-3">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Stats</h4>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Messages</span>
                  <span className="font-medium">{activeConv.message_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started</span>
                  <span className="font-medium">{formatFullDate(activeConv.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
