"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, MessageSquarePlus, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { TenantOpsGate } from "@/components/auth/role-gates";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import {
  chatApi,
  type ChatColleague,
  type ChatConversation,
  type ChatMessage
} from "@/features/chat/chat-api";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export default function ChatPage() {
  return (
    <TenantOpsGate>
      <ChatPageInner />
    </TenantOpsGate>
  );
}

function ChatPageInner() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const myId = user?.id;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [composerFocus, setComposerFocus] = useState(false);

  const conversations = useQuery({
    queryKey: ["chat-conversations", "ADMIN"],
    queryFn: () => chatApi.conversations({ type: "ADMIN", pageSize: 100 })
  });

  const colleagues = useQuery({
    queryKey: ["chat-colleagues", pickerSearch],
    queryFn: () => chatApi.colleagues({ q: pickerSearch || undefined, pageSize: 100 }),
    enabled: pickerOpen
  });

  const messages = useQuery({
    queryKey: ["chat-messages", selectedId],
    queryFn: () => chatApi.messages(selectedId!, { pageSize: 100 }),
    enabled: !!selectedId
  });

  const selected = useMemo(
    () => conversations.data?.items.find((c) => c.id === selectedId) ?? null,
    [conversations.data?.items, selectedId]
  );

  useEffect(() => {
    if (!selectedId) return;
    void chatApi.markRead(selectedId).then(() => {
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    });
  }, [selectedId, messages.dataUpdatedAt, qc]);

  const openAdmin = useMutation({
    mutationFn: (userId: string) => chatApi.openAdmin(userId),
    onSuccess: (conversation) => {
      setSelectedId(conversation.id);
      setPickerOpen(false);
      setPickerSearch("");
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  const send = useMutation({
    mutationFn: () => {
      if (!selectedId || !draft.trim()) throw new Error("Type a message");
      return chatApi.send(selectedId, draft.trim());
    },
    onSuccess: () => {
      setDraft("");
      void qc.invalidateQueries({ queryKey: ["chat-messages", selectedId] });
      void qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onError: (e: Error) => toast.error(e.message)
  });

  if (conversations.isLoading) return <PageSkeleton />;

  const items = conversations.data?.items ?? [];
  const employees = colleagues.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chat"
        description="Message employees directly. Conversations appear in their Admin tab."
        action={
          <Button onClick={() => setPickerOpen(true)}>
            <MessageSquarePlus className="size-4" />
            New message
          </Button>
        }
      />

      <div className="grid min-h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Conversations</p>
            <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
              <MessageSquarePlus className="size-3.5" />
              New
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-16 text-center text-slate-500">
                <MessageSquare className="size-8 text-slate-300" />
                <p className="text-sm">No admin chats yet.</p>
                <Button size="sm" onClick={() => setPickerOpen(true)}>
                  Choose an employee
                </Button>
              </div>
            ) : (
              items.map((c) => (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  active={c.id === selectedId}
                  onSelect={() => setSelectedId(c.id)}
                />
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-[420px] flex-col">
          {!selectedId || !selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500">
              <MessageSquare className="size-10 text-slate-300" />
              <p className="text-sm">Select a conversation or start a new one.</p>
              <Button variant="outline" onClick={() => setPickerOpen(true)}>
                <MessageSquarePlus className="size-4" />
                Message an employee
              </Button>
            </div>
          ) : (
            <>
              <header className="border-b border-slate-100 px-4 py-3">
                <h2 className="font-semibold text-slate-900">{selected.title}</h2>
                {selected.peer?.jobTitle || selected.peer?.officeName ? (
                  <p className="text-xs text-slate-500">
                    {[selected.peer.jobTitle, selected.peer.officeName].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 px-4 py-4">
                {messages.isLoading ? (
                  <p className="text-sm text-slate-500">Loading messages…</p>
                ) : (messages.data?.items ?? []).length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">No messages yet. Say hello.</p>
                ) : (
                  (messages.data?.items ?? []).map((m) => (
                    <MessageBubble key={m.id} message={m} mine={m.senderId === myId} />
                  ))
                )}
              </div>

              <form
                className="flex gap-2 border-t border-slate-100 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim() || send.isPending) return;
                  send.mutate();
                }}
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={() => setComposerFocus(true)}
                  onBlur={() => setComposerFocus(false)}
                  placeholder="Write a message…"
                  className={cn(composerFocus && "ring-2 ring-blue-100")}
                />
                <Button type="submit" disabled={!draft.trim() || send.isPending}>
                  <Send className="size-4" />
                  Send
                </Button>
              </form>
            </>
          )}
        </section>
      </div>

      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          setPickerOpen(open);
          if (!open) setPickerSearch("");
        }}
      >
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden p-0">
          <div className="border-b border-slate-100 px-6 pb-4 pt-6 pr-12">
            <DialogTitle>Message an employee</DialogTitle>
            <DialogDescription>Pick someone to start or continue an admin chat.</DialogDescription>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search by name, code, or job title…"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {colleagues.isLoading ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">Loading employees…</p>
            ) : employees.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">No employees found.</p>
            ) : (
              employees.map((peer) => (
                <ColleagueRow
                  key={peer.userId}
                  peer={peer}
                  busy={openAdmin.isPending}
                  onSelect={() => openAdmin.mutate(peer.userId)}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ColleagueRow({
  peer,
  busy,
  onSelect
}: {
  peer: ChatColleague;
  busy: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50 disabled:opacity-60"
    >
      <Avatar initial={peer.displayName} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{peer.displayName}</div>
        <div className="truncate text-xs text-slate-500">
          {[peer.jobTitle, peer.officeName].filter(Boolean).join(" · ") || peer.employeeCode}
        </div>
      </div>
    </button>
  );
}

function ConversationRow({
  conversation,
  active,
  onSelect
}: {
  conversation: ChatConversation;
  active: boolean;
  onSelect: () => void;
}) {
  const unread = conversation.unreadCount > 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left",
        active ? "bg-blue-50" : "hover:bg-slate-50",
        unread && !active && "bg-slate-50/80"
      )}
    >
      <Avatar initial={conversation.title} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("truncate text-sm", unread ? "font-bold text-slate-950" : "font-semibold text-slate-900")}>
            {conversation.title}
          </span>
          {conversation.lastMessage ? (
            <span className="shrink-0 text-[10px] text-slate-400">
              {formatDateTime(conversation.lastMessage.createdAt)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-slate-500">{conversation.lastMessage?.body ?? "No messages yet"}</p>
          {unread ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
              {conversation.unreadCount}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
          mine ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md bg-white text-slate-900 ring-1 ring-slate-200"
        )}
      >
        {!mine ? <div className="mb-0.5 text-[11px] font-semibold opacity-70">{message.senderName}</div> : null}
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <div className={cn("mt-1 text-[10px]", mine ? "text-blue-100" : "text-slate-400")}>
          {formatDateTime(message.createdAt)}
        </div>
      </div>
    </div>
  );
}

function Avatar({ initial }: { initial: string }) {
  const letter = initial.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
      {letter}
    </div>
  );
}
