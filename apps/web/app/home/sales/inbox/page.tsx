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
  ChevronDown,
  Phone,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isYesterday } from 'date-fns';

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
import { PageBody } from '@kit/ui/page';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getWhatsAppConversationsService,
  getWhatsAppMessagesService,
  sendWhatsAppMessageService,
  resolveWhatsAppConversationService,
  reopenWhatsAppConversationService,
  convertToLeadService,
} from '~/services/whatsapp.service';
import type { WhatsAppConversation, WhatsAppMessage } from '@kit/integration-whatsapp';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-500',
  pending: 'bg-amber-500',
  resolved: 'bg-zinc-400',
  closed: 'bg-zinc-300',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WhatsAppInboxPage() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id ?? '';

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

  // ---- Load conversations ----
  const loadConversations = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingConvs(true);
    try {
      const data = await getWhatsAppConversationsService(workspaceId, { status: statusFilter });
      setConversations(data?.conversations ?? []);
    } catch {
      toast.error('Failed to load conversations');
    } finally {
      setIsLoadingConvs(false);
    }
  }, [workspaceId, statusFilter]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ---- Load messages ----
  useEffect(() => {
    if (!activeConvId || !workspaceId) return;
    setIsLoadingMsgs(true);
    getWhatsAppMessagesService(workspaceId, activeConvId)
      .then((data) => setMessages(data?.messages ?? []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setIsLoadingMsgs(false));
  }, [activeConvId, workspaceId]);

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---- Send ----
  const handleSend = async () => {
    if (!reply.trim() || !activeConvId || !workspaceId) return;
    setIsSending(true);
    const body = reply.trim();
    setReply('');
    try {
      const data = await sendWhatsAppMessageService(workspaceId, activeConvId, body);
      if (data?.message) {
        setMessages((prev) => [...prev, data.message as WhatsAppMessage]);
      }
    } catch {
      toast.error('Failed to send message');
      setReply(body);
    } finally {
      setIsSending(false);
    }
  };

  // ---- Status actions ----
  const handleResolve = async () => {
    if (!activeConvId || !workspaceId) return;
    await resolveWhatsAppConversationService(workspaceId, activeConvId);
    setConversations((prev) => prev.map((c) => c.id === activeConvId ? { ...c, status: 'resolved' } : c));
    toast.success('Conversation resolved');
  };

  const handleReopen = async () => {
    if (!activeConvId || !workspaceId) return;
    await reopenWhatsAppConversationService(workspaceId, activeConvId);
    setConversations((prev) => prev.map((c) => c.id === activeConvId ? { ...c, status: 'open' } : c));
    toast.success('Conversation reopened');
  };

  const handleConvertToLead = async () => {
    if (!activeConvId || !workspaceId) return;
    try {
      const data = await convertToLeadService(workspaceId, activeConvId);
      toast.success(`Lead created: ${data.leadId}`);
      loadConversations();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  // ---- Filtered conversations ----
  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.customer_phone.includes(q) ||
      (c.customer_name ?? '').toLowerCase().includes(q) ||
      (c.first_message ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <PageBody className="flex flex-col h-[calc(100vh-64px)] overflow-hidden p-0">
      <div className="flex h-full min-h-0">

        {/* ===== LEFT PANEL — Conversation List ===== */}
        <div className="w-80 shrink-0 flex flex-col border-r bg-background h-full min-h-0">
          {/* Header */}
          <div className="p-3 border-b space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span className="text-sm font-semibold">WhatsApp Inbox</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Filter className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {['all', 'open', 'pending', 'resolved', 'closed'].map((s) => (
                    <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className={statusFilter === s ? 'font-semibold' : ''}>
                      <span className={`mr-2 h-2 w-2 rounded-full inline-block ${STATUS_COLORS[s] ?? 'bg-zinc-400'}`} />
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoadingConvs ? (
              <div className="p-3 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No conversations found
              </div>
            ) : (
              filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full text-left p-3 border-b last:border-b-0 hover:bg-accent/40 transition-colors ${
                    activeConvId === conv.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative shrink-0">
                      <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-semibold text-sm">
                        {(conv.customer_name ?? conv.customer_phone).charAt(0).toUpperCase()}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${STATUS_COLORS[conv.status] ?? 'bg-zinc-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold truncate">{conv.customer_name ?? conv.customer_phone}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                          {conv.last_message_at ? formatMessageTime(conv.last_message_at) : ''}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {(conv as unknown as { last_message?: { body?: string; message_type: string } }).last_message?.body
                          ?? (conv as unknown as { last_message?: { body?: string; message_type: string } }).last_message?.message_type
                          ?? conv.first_message
                          ?? 'No messages yet'}
                      </p>
                      {conv.lead_id && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 mt-0.5 h-3.5">Lead</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ===== CENTER PANEL — Chat Thread ===== */}
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center text-center text-muted-foreground">
            <div className="space-y-3">
              <MessageSquare className="h-12 w-12 mx-auto opacity-20" />
              <p className="text-sm">Select a conversation to start</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              {/* Thread header */}
              <div className="p-3 border-b flex items-center justify-between shrink-0 bg-background">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-semibold text-sm">
                    {(activeConv.customer_name ?? activeConv.customer_phone).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{activeConv.customer_name ?? activeConv.customer_phone}</p>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground font-mono">{activeConv.customer_phone}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[activeConv.status] ?? 'bg-zinc-400'}`} />
                      <span className="text-[10px] capitalize text-muted-foreground">{activeConv.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeConv.status !== 'resolved' ? (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleResolve}>
                      <CheckCheck className="h-3 w-3" />
                      Resolve
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={handleReopen}>
                      <RotateCcw className="h-3 w-3" />
                      Reopen
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleConvertToLead} disabled={!!activeConv.lead_id}>
                        <UserPlus className="h-3.5 w-3.5 mr-2" />
                        Convert to Lead
                      </DropdownMenuItem>
                      {activeConv.lead_id && (
                        <DropdownMenuItem>
                          <ExternalLink className="h-3.5 w-3.5 mr-2" />
                          Open Lead Record
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-zinc-50 dark:bg-zinc-950/30">
                {isLoadingMsgs ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                        <Skeleton className="h-10 w-48 rounded-2xl" />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground py-8">No messages yet</div>
                ) : (
                  messages.map((msg) => {
                    const isOutgoing = msg.direction === 'outgoing';
                    return (
                      <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm ${
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
                              {format(new Date(msg.created_at), 'HH:mm')}
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
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="p-3 border-t bg-background shrink-0">
                <div className="flex items-end gap-2">
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
                    className="min-h-[60px] max-h-32 text-xs resize-none"
                    disabled={isSending || activeConv.status === 'closed'}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!reply.trim() || isSending || activeConv.status === 'closed'}
                    className="h-9 w-9 shrink-0 bg-[#25D366] hover:bg-[#20b858] text-white"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                {activeConv.status === 'closed' && (
                  <p className="text-[10px] text-muted-foreground mt-1">This conversation is closed. Reopen to reply.</p>
                )}
              </div>
            </div>

            {/* ===== RIGHT PANEL — Conversation Info ===== */}
            <div className="w-64 shrink-0 border-l bg-background overflow-y-auto h-full p-4 space-y-5">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contact</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{activeConv.customer_name ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono">{activeConv.customer_phone}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">CRM</h4>
                {activeConv.lead_id ? (
                  <a
                    href={`/home/sales/leads/${activeConv.lead_id}`}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Lead
                  </a>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">No lead linked.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs h-7"
                      onClick={handleConvertToLead}
                    >
                      <UserPlus className="h-3 w-3" />
                      Convert to Lead
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" />
                  Internal Notes
                </h4>
                <p className="text-xs text-muted-foreground">Notes feature coming soon.</p>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Stats</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Messages</span>
                    <span className="font-medium">{activeConv.message_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span className="font-medium">{format(new Date(activeConv.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="capitalize font-medium">{activeConv.status}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageBody>
  );
}
