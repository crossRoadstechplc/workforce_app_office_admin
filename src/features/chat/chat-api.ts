import { apiFetch } from "@/lib/api/api-client";

const d = <T>(v: unknown): T => ((v as { data?: T })?.data ?? v) as T;

export type ChatColleague = {
  userId: string;
  employeeId: string;
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  employeeCode: string;
  officeName: string | null;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  type: string;
  body: string | null;
  attachmentUrl: string | null;
  createdAt: string;
};

export type ChatParticipant = {
  userId: string;
  role: string;
  displayName: string;
  jobTitle: string | null;
};

export type ChatConversation = {
  id: string;
  type: "DIRECT" | "GROUP" | "ADMIN" | string;
  name: string | null;
  title: string;
  peer: ChatColleague | null;
  participants: ChatParticipant[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ChatConversationList = {
  items: ChatConversation[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  unreadTotal: number;
};

export type ChatMessageList = {
  items: ChatMessage[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export type ChatColleagueList = {
  items: ChatColleague[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

export const chatApi = {
  colleagues: async (params?: { q?: string; page?: number; pageSize?: number }) => {
    const p = new URLSearchParams({
      page: String(params?.page ?? 1),
      pageSize: String(params?.pageSize ?? 50)
    });
    if (params?.q?.trim()) p.set("q", params.q.trim());
    return d<ChatColleagueList>(await apiFetch<unknown>(`/chat/colleagues?${p}`));
  },
  conversations: async (params?: { type?: string; page?: number; pageSize?: number }) => {
    const p = new URLSearchParams({
      page: String(params?.page ?? 1),
      pageSize: String(params?.pageSize ?? 50)
    });
    if (params?.type) p.set("type", params.type);
    return d<ChatConversationList>(await apiFetch<unknown>(`/chat/conversations?${p}`));
  },
  openAdmin: async (userId: string) =>
    d<ChatConversation>(
      await apiFetch<unknown>("/chat/admin/conversations", {
        method: "POST",
        body: JSON.stringify({ userId })
      })
    ),
  get: async (id: string) => d<ChatConversation>(await apiFetch<unknown>(`/chat/conversations/${id}`)),
  messages: async (id: string, params?: { page?: number; pageSize?: number }) => {
    const p = new URLSearchParams({
      page: String(params?.page ?? 1),
      pageSize: String(params?.pageSize ?? 100)
    });
    return d<ChatMessageList>(await apiFetch<unknown>(`/chat/conversations/${id}/messages?${p}`));
  },
  send: async (id: string, body: string) =>
    d<ChatMessage>(
      await apiFetch<unknown>(`/chat/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body })
      })
    ),
  markRead: async (id: string) =>
    d<{ success: boolean }>(
      await apiFetch<unknown>(`/chat/conversations/${id}/read`, {
        method: "POST",
        body: "{}"
      })
    )
};
