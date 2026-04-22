"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Building2,
  CheckCheck,
  Circle,
  FileText,
  IdCard,
  Loader2,
  MessageSquareMore,
  Paperclip,
  Plus,
  Search,
  Send,
  UserPlus2,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createCommunityGroupThread,
  ensureCommunityDirectThread,
  getCommunityMessengerBootstrap,
  getCommunityThreadDetail,
  markCommunityThreadRead,
  sendCommunityMessage,
  type CommunityMessengerBootstrap,
  type CommunityMessengerMessage,
  type CommunityMessengerThread,
  type CommunityMessengerThreadDetail,
  type CommunityMessengerUser,
} from "@/lib/actions/community-messenger";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type CurrentUser = {
  id: string;
  department: string | null;
};

type AttachmentInput = {
  path: string;
  name: string;
  type: string;
  size?: number;
};

type ThreadSummaryUpdate = Pick<
  CommunityMessengerThread,
  "id" | "last_message_at" | "last_message_preview"
> &
  Partial<Pick<CommunityMessengerThread, "name" | "unread_count">>;

type RealtimeMemberChange = {
  thread_id: string;
  user_id: string;
  last_read_at: string | null;
};

type RealtimeMessageChange = {
  id: string;
  thread_id: string;
  sender_id: string;
};

type RealtimeNotificationChange = {
  action_type: string;
  route: string;
};

type RealtimeBroadcastMessage = {
  thread_id: string;
  sent_at?: string;
  message?: CommunityMessengerMessage;
  thread?: {
    id: string;
    name: string;
    last_message_at: string;
    last_message_preview: string;
  };
};

type RealtimeTypingPresence = {
  user_id?: string;
  typing?: boolean;
  updated_at?: string;
};

function formatName(user: Pick<CommunityMessengerUser, "display_name">) {
  return user.display_name;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatThreadTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(user: {
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string;
}) {
  const first = user.first_name?.[0] || user.display_name?.[0] || "";
  const last = user.last_name?.[0] || "";
  return `${first}${last}`.toUpperCase() || "CQ";
}

function threadSubtitle(thread: CommunityMessengerThread) {
  if (thread.thread_type === "direct" && thread.direct_user) {
    return `${thread.direct_user.department || "No department"} • ${thread.direct_user.position_label}`;
  }

  return `${thread.members.length} member${thread.members.length === 1 ? "" : "s"}`;
}

function sortThreadsByActivity(threads: CommunityMessengerThread[]) {
  return [...threads].sort(
    (left, right) =>
      new Date(right.last_message_at).getTime() - new Date(left.last_message_at).getTime()
  );
}

function upsertThreadSummary(
  threads: CommunityMessengerThread[],
  patch: ThreadSummaryUpdate,
  fallbackThread?: CommunityMessengerThread | null
) {
  let found = false;
  const nextThreads = threads.map((thread) => {
    if (thread.id !== patch.id) return thread;
    found = true;
    return {
      ...thread,
      ...(patch.name ? { name: patch.name } : {}),
      ...(typeof patch.unread_count === "number" ? { unread_count: patch.unread_count } : {}),
      last_message_at: patch.last_message_at,
      last_message_preview: patch.last_message_preview,
    };
  });

  if (!found && fallbackThread) {
    nextThreads.push({
      ...fallbackThread,
      ...(patch.name ? { name: patch.name } : {}),
      ...(typeof patch.unread_count === "number" ? { unread_count: patch.unread_count } : {}),
      last_message_at: patch.last_message_at,
      last_message_preview: patch.last_message_preview,
    });
  }

  return sortThreadsByActivity(nextThreads);
}

function getRealtimeRow<T extends Record<string, unknown>>(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as T;
}

function mergeMessages(
  currentMessages: CommunityMessengerThreadDetail["messages"],
  nextMessages: CommunityMessengerThreadDetail["messages"]
) {
  if (nextMessages.length === 0) {
    return currentMessages;
  }

  const messageMap = new Map(currentMessages.map((message) => [message.id, message]));
  nextMessages.forEach((message) => {
    messageMap.set(message.id, message);
  });

  return Array.from(messageMap.values()).sort(
    (left, right) =>
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
  );
}

function parseChatThreadId(route: string) {
  try {
    return new URL(route, "https://cqer.local").searchParams.get("chat");
  } catch {
    return null;
  }
}

function getBroadcastPayload<T extends Record<string, unknown>>(value: unknown) {
  const event = getRealtimeRow<{ payload?: unknown }>(value);
  if (!event?.payload || typeof event.payload !== "object") {
    return null;
  }

  return event.payload as T;
}

async function fetchRealtimeThreadState(threadId: string, afterCreatedAt?: string | null) {
  const params = new URLSearchParams({ threadId });
  if (afterCreatedAt) {
    params.set("afterCreatedAt", afterCreatedAt);
  }

  const response = await fetch(`/api/community-messenger/realtime?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Failed to sync conversation.");
  }

  return (await response.json()) as {
    thread: {
      id: string;
      name: string;
      last_message_at: string;
      last_message_preview: string | null;
    };
    messages: CommunityMessengerMessage[];
    receipt: {
      other_user_id: string | null;
      last_read_at: string | null;
    };
  };
}

function AccountHoverCard({
  user,
  isOnline,
  onMessage,
  onCreateGroup,
}: {
  user: CommunityMessengerUser;
  isOnline: boolean;
  onMessage: () => void;
  onCreateGroup: () => void;
}) {
  return (
    <div className="w-64 rounded-xl border border-border/50 bg-background p-3 shadow-md">
      <div className="flex items-start gap-2">
        <Avatar className="h-10 w-10 border border-border/50">
          <AvatarImage src={user.avatar_url || undefined} alt={user.display_name} />
          <AvatarFallback className="text-[10px]">{initials(user)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex h-2.5 w-2.5 rounded-full",
                isOnline ? "bg-green-500" : "bg-muted-foreground/40"
              )}
            />
            <p className="truncate text-[11px] font-semibold">{user.display_name}</p>
          </div>
          <div className="mt-1 space-y-1 text-[9px] text-muted-foreground">
            <div className="flex items-start gap-1.5">
              <Building2 className="mt-0.5 h-3 w-3 shrink-0" />
              <p className="min-w-0 whitespace-normal break-words leading-4">
                {user.department || "No department"}
              </p>
            </div>
            <div className="flex items-start gap-1.5">
              <IdCard className="mt-0.5 h-3 w-3 shrink-0" />
              <p className="min-w-0 whitespace-normal break-words leading-4">{user.position_label}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" className="h-7 flex-1 text-[10px]" onClick={onMessage}>
          <MessageSquareMore className="mr-1.5 h-3.5 w-3.5" />
          Send Message
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 flex-1 text-[10px]" onClick={onCreateGroup}>
          <Users className="mr-1.5 h-3.5 w-3.5" />
          Create Group
        </Button>
      </div>
    </div>
  );
}

export function CommunityMessenger({
  currentUser,
  users,
}: {
  currentUser: CurrentUser;
  users: CommunityMessengerUser[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = React.useMemo(() => createClient(), []);
  const [bootstrap, setBootstrap] = React.useState<CommunityMessengerBootstrap>({ threads: [] });
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMessengerOpen, setIsMessengerOpen] = React.useState(false);
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(null);
  const [threadDetail, setThreadDetail] = React.useState<CommunityMessengerThreadDetail | null>(null);
  const [isThreadLoading, setIsThreadLoading] = React.useState(false);
  const [composer, setComposer] = React.useState("");
  const [composerAttachments, setComposerAttachments] = React.useState<AttachmentInput[]>([]);
  const [accountFilter, setAccountFilter] = React.useState("");
  const [threadFilter, setThreadFilter] = React.useState("");
  const [hoveredUserId, setHoveredUserId] = React.useState<string | null>(null);
  const [onlineIds, setOnlineIds] = React.useState<Set<string>>(new Set());
  const [typingNames, setTypingNames] = React.useState<string[]>([]);
  const [isComposerFocused, setIsComposerFocused] = React.useState(false);
  const [isSending, startSendTransition] = React.useTransition();
  const [isBootstrappingThread, startDirectTransition] = React.useTransition();
  const [isGroupDialogOpen, setIsGroupDialogOpen] = React.useState(false);
  const [groupName, setGroupName] = React.useState("");
  const [groupMemberIds, setGroupMemberIds] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const selectedThreadIdRef = React.useRef<string | null>(null);
  const bootstrapRequestRef = React.useRef(0);
  const threadRequestRef = React.useRef(0);
  const activeThreadSyncRequestRef = React.useRef(0);
  const activeThreadChannelRef = React.useRef<RealtimeChannel | null>(null);
  const messageSoundRef = React.useRef<HTMLAudioElement | null>(null);
  const composerTypingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingTrackAtRef = React.useRef(0);
  const lastPlayedMessageIdRef = React.useRef<string | null>(null);
  const ownTypingStateRef = React.useRef(false);
  const bootstrapRefreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const threadRefreshTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeThreadSyncTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBootstrap = React.useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      const requestId = ++bootstrapRequestRef.current;
      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const nextBootstrap = await getCommunityMessengerBootstrap();
        if (bootstrapRequestRef.current !== requestId) {
          return;
        }

        setBootstrap(nextBootstrap);
        setSelectedThreadId((current) => {
          if (current && nextBootstrap.threads.some((thread) => thread.id === current)) {
            return current;
          }

          const chatFromQuery = searchParams.get("chat");
          if (chatFromQuery && nextBootstrap.threads.some((thread) => thread.id === chatFromQuery)) {
            return chatFromQuery;
          }

          return nextBootstrap.threads[0]?.id || null;
        });
      } finally {
        if (showLoading && bootstrapRequestRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [searchParams]
  );

  const loadThreadDetail = React.useCallback(
    async (threadId: string, { showLoading = false }: { showLoading?: boolean } = {}) => {
      const requestId = ++threadRequestRef.current;
      if (showLoading) {
        setIsThreadLoading(true);
      }

      try {
        const detail = await getCommunityThreadDetail(threadId);
        if (threadRequestRef.current !== requestId || selectedThreadIdRef.current !== threadId) {
          return;
        }

        setThreadDetail(detail);
        setBootstrap((current) => ({
          threads: upsertThreadSummary(
            current.threads,
            {
              id: detail.thread.id,
              name: detail.thread.name,
              unread_count: detail.thread.unread_count,
              last_message_at: detail.thread.last_message_at,
              last_message_preview: detail.thread.last_message_preview,
            },
            detail.thread
          ),
        }));
      } finally {
        if (showLoading && threadRequestRef.current === requestId && selectedThreadIdRef.current === threadId) {
          setIsThreadLoading(false);
        }
      }
    },
    []
  );

  const queueBootstrapRefresh = React.useCallback(
    (delay = 120) => {
      if (bootstrapRefreshTimeoutRef.current) {
        clearTimeout(bootstrapRefreshTimeoutRef.current);
      }

      bootstrapRefreshTimeoutRef.current = setTimeout(() => {
        bootstrapRefreshTimeoutRef.current = null;
        void loadBootstrap();
      }, delay);
    },
    [loadBootstrap]
  );

  const queueThreadRefresh = React.useCallback(
    (threadId: string, delay = 90) => {
      if (threadRefreshTimeoutRef.current) {
        clearTimeout(threadRefreshTimeoutRef.current);
      }

      threadRefreshTimeoutRef.current = setTimeout(() => {
        threadRefreshTimeoutRef.current = null;
        if (selectedThreadIdRef.current === threadId) {
          void loadThreadDetail(threadId);
        }
      }, delay);
    },
    [loadThreadDetail]
  );

  const syncActiveThreadState = React.useEffectEvent(async (threadId: string) => {
    const currentDetail = threadDetail;
    if (!currentDetail || currentDetail.thread.id !== threadId) {
      return;
    }

    const afterCreatedAt = currentDetail.messages[currentDetail.messages.length - 1]?.created_at || null;
    const requestId = ++activeThreadSyncRequestRef.current;
    let result: Awaited<ReturnType<typeof fetchRealtimeThreadState>>;

    try {
      result = await fetchRealtimeThreadState(threadId, afterCreatedAt);
    } catch {
      if (selectedThreadIdRef.current === threadId) {
        queueThreadRefresh(threadId, 40);
      }
      return;
    }

    if (activeThreadSyncRequestRef.current !== requestId || selectedThreadIdRef.current !== threadId) {
      return;
    }

    const incomingMessages = result.messages.filter(
      (message) => !currentDetail.messages.some((currentMessage) => currentMessage.id === message.id)
    );
    const hasIncomingFromOtherUser = incomingMessages.some(
      (message) => message.sender_id !== currentUser.id
    );
    const lastKnownMessage = currentDetail.messages[currentDetail.messages.length - 1] || null;
    const hasThreadMetaChanged =
      result.thread.last_message_at !== currentDetail.thread.last_message_at ||
      (result.thread.last_message_preview || currentDetail.thread.last_message_preview) !==
        currentDetail.thread.last_message_preview;
    const hasReceiptChanged = result.receipt.last_read_at !== currentDetail.receipt.last_read_at;

    if (
      incomingMessages.length === 0 &&
      !hasThreadMetaChanged &&
      !hasReceiptChanged &&
      lastKnownMessage?.created_at === result.thread.last_message_at
    ) {
      return;
    }

    setThreadDetail((current) => {
      if (!current || current.thread.id !== threadId) {
        return current;
      }

      const mergedMessages = mergeMessages(current.messages, result.messages);

      return {
        ...current,
        thread: {
          ...current.thread,
          name: current.thread.thread_type === "group" ? result.thread.name : current.thread.name,
          unread_count: 0,
          last_message_at: result.thread.last_message_at,
          last_message_preview: result.thread.last_message_preview || current.thread.last_message_preview,
        },
        messages: mergedMessages,
        receipt: result.receipt,
      };
    });

    setBootstrap((current) => {
      const existingThread = current.threads.find((thread) => thread.id === threadId) || null;
      const fallbackThread =
        currentDetail.thread.id === threadId
          ? {
              ...currentDetail.thread,
              unread_count: 0,
              last_message_at: result.thread.last_message_at,
              last_message_preview:
                result.thread.last_message_preview || currentDetail.thread.last_message_preview,
            }
          : null;

      return {
        threads: upsertThreadSummary(
          current.threads,
          {
            id: threadId,
            name: result.thread.name,
            unread_count: 0,
            last_message_at: result.thread.last_message_at,
            last_message_preview:
              result.thread.last_message_preview ||
              existingThread?.last_message_preview ||
              "No messages yet",
          },
          fallbackThread
        ),
      };
    });

    if (hasIncomingFromOtherUser) {
      const newestIncomingMessage = [...incomingMessages]
        .filter((message) => message.sender_id !== currentUser.id)
        .at(-1);
      playIncomingMessageSound(newestIncomingMessage?.id);
      const readResult = await markCommunityThreadRead(threadId);
      if (!(readResult && "error" in readResult)) {
        clearUnreadState(threadId);
      }
    }
  });

  const queueActiveThreadSync = React.useEffectEvent((threadId: string, delay = 50) => {
    if (activeThreadSyncTimeoutRef.current) {
      clearTimeout(activeThreadSyncTimeoutRef.current);
    }

    activeThreadSyncTimeoutRef.current = setTimeout(() => {
      activeThreadSyncTimeoutRef.current = null;
      if (selectedThreadIdRef.current === threadId) {
        void syncActiveThreadState(threadId);
      }
    }, delay);
  });

  const syncTypingPresence = React.useEffectEvent(() => {
    const channel = activeThreadChannelRef.current;
    if (!channel) {
      setTypingNames([]);
      return;
    }

    const presenceState = channel.presenceState() as Record<string, RealtimeTypingPresence[]>;
    const nextTypingNames = Array.from(
      new Set(
        Object.values(presenceState)
          .flat()
          .filter((presence) => Boolean(presence?.typing) && presence.user_id && presence.user_id !== currentUser.id)
          .map((presence) => {
            const userId = presence.user_id || "";
            return (
              threadDetail?.thread.members.find((member) => member.id === userId)?.display_name ||
              users.find((user) => user.id === userId)?.display_name ||
              "CQER User"
            );
          })
      )
    );

    setTypingNames(nextTypingNames);
  });

  const updateOwnTypingPresence = React.useEffectEvent(async (typing: boolean) => {
    const channel = activeThreadChannelRef.current;
    if (!channel || !selectedThreadIdRef.current) {
      ownTypingStateRef.current = false;
      return;
    }

    const now = Date.now();
    if (
      ownTypingStateRef.current === typing &&
      (typing ? now - lastTypingTrackAtRef.current < 1200 : true)
    ) {
      return;
    }

    ownTypingStateRef.current = typing;
    lastTypingTrackAtRef.current = now;

    await channel.track({
      user_id: currentUser.id,
      typing,
      updated_at: new Date().toISOString(),
    });
  });

  const clearUnreadState = React.useEffectEvent((threadId: string) => {
    setThreadDetail((current) =>
      current && current.thread.id === threadId
        ? {
            ...current,
            thread: {
              ...current.thread,
              unread_count: 0,
            },
          }
        : current
    );
    setBootstrap((current) => ({
      threads: current.threads.map((thread) =>
        thread.id === threadId ? { ...thread, unread_count: 0 } : thread
      ),
    }));
  });

  const playIncomingMessageSound = React.useEffectEvent((messageId?: string) => {
    if (!messageId || lastPlayedMessageIdRef.current === messageId) {
      return;
    }

    lastPlayedMessageIdRef.current = messageId;
    const sound = messageSoundRef.current;
    if (!sound) {
      return;
    }

    sound.currentTime = 0;
    void sound.play().catch(() => {
      // Ignore autoplay failures until the browser allows audio playback.
    });
  });

  const applyOptimisticMessage = React.useEffectEvent(
    (
      message: CommunityMessengerThreadDetail["messages"][number],
      thread: {
        id: string;
        name: string;
        last_message_at: string;
        last_message_preview: string;
      }
    ) => {
      setThreadDetail((current) => {
        if (!current || current.thread.id !== message.thread_id) {
          return current;
        }

        const nextMessages = current.messages.some((item) => item.id === message.id)
          ? current.messages
          : [...current.messages, message];

        return {
          ...current,
          thread: {
            ...current.thread,
            name: current.thread.thread_type === "group" ? thread.name : current.thread.name,
            unread_count: 0,
            last_message_at: thread.last_message_at,
            last_message_preview: thread.last_message_preview,
          },
          messages: nextMessages,
        };
      });

      setBootstrap((current) => ({
        threads: upsertThreadSummary(
          current.threads,
          {
            id: thread.id,
            name: thread.name,
            unread_count: 0,
            last_message_at: thread.last_message_at,
            last_message_preview: thread.last_message_preview,
          },
          threadDetail?.thread && threadDetail.thread.id === thread.id
            ? {
                ...threadDetail.thread,
                unread_count: 0,
                last_message_at: thread.last_message_at,
                last_message_preview: thread.last_message_preview,
              }
            : null
        ),
      }));
    }
  );

  const handleThreadRealtime = React.useEffectEvent(() => {
    queueBootstrapRefresh();
  });

  const handleOwnMembershipRealtime = React.useEffectEvent((payload: { eventType: string; new: unknown; old: unknown }) => {
    const row =
      getRealtimeRow<RealtimeMemberChange>(payload.new) || getRealtimeRow<RealtimeMemberChange>(payload.old);

    if (!row?.thread_id) {
      queueBootstrapRefresh();
      return;
    }

    if (payload.eventType !== "UPDATE") {
      queueBootstrapRefresh();
      if (selectedThreadIdRef.current === row.thread_id) {
        queueThreadRefresh(row.thread_id);
      }
    }
  });

  const handleActiveThreadMessageRealtime = React.useEffectEvent((payload: { new: unknown }) => {
    const row = getRealtimeRow<RealtimeMessageChange>(payload.new);

    if (!row?.thread_id || row.sender_id === currentUser.id) {
      return;
    }

    playIncomingMessageSound(row.id);
    queueActiveThreadSync(row.thread_id, 35);
  });

  const handleActiveThreadMemberRealtime = React.useEffectEvent((payload: { new: unknown; old: unknown }) => {
    const row =
      getRealtimeRow<RealtimeMemberChange>(payload.new) || getRealtimeRow<RealtimeMemberChange>(payload.old);

    if (!row?.thread_id || row.user_id === currentUser.id) {
      return;
    }

    queueActiveThreadSync(row.thread_id, 60);
  });

  const handleActiveThreadBroadcastMessage = React.useEffectEvent((payload: unknown) => {
    const row = getBroadcastPayload<RealtimeBroadcastMessage>(payload);

    if (!row?.thread_id || row.thread_id !== selectedThreadIdRef.current) {
      return;
    }

    if (row.message && row.thread && row.message.sender_id !== currentUser.id) {
      playIncomingMessageSound(row.message.id);
      applyOptimisticMessage(row.message, row.thread);
      void markCommunityThreadRead(row.thread_id);
      return;
    }

    queueActiveThreadSync(row.thread_id, 5);
  });

  const handleMessageNotificationRealtime = React.useEffectEvent((payload: { new: unknown }) => {
    const row = getRealtimeRow<RealtimeNotificationChange>(payload.new);

    if (!row || row.action_type !== "message_received") {
      return;
    }

    const threadId = parseChatThreadId(row.route);
    if (!threadId) {
      queueBootstrapRefresh(40);
      return;
    }

    if (selectedThreadIdRef.current === threadId) {
      queueActiveThreadSync(threadId, 20);
    }

    queueBootstrapRefresh(40);
  });

  React.useEffect(() => {
    void loadBootstrap({ showLoading: true });
  }, [loadBootstrap]);

  React.useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
    if (!selectedThreadId) {
      threadRequestRef.current += 1;
      setThreadDetail(null);
      setIsThreadLoading(false);
      return;
    }

    void loadThreadDetail(selectedThreadId, { showLoading: true });
  }, [loadThreadDetail, selectedThreadId]);

  React.useEffect(() => {
    return () => {
      if (composerTypingTimeoutRef.current) {
        clearTimeout(composerTypingTimeoutRef.current);
      }
      if (bootstrapRefreshTimeoutRef.current) {
        clearTimeout(bootstrapRefreshTimeoutRef.current);
      }
      if (threadRefreshTimeoutRef.current) {
        clearTimeout(threadRefreshTimeoutRef.current);
      }
      if (activeThreadSyncTimeoutRef.current) {
        clearTimeout(activeThreadSyncTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!threadDetail) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [threadDetail]);

  React.useEffect(() => {
    const audio = new Audio("/sounds/message-notification.mp3");
    audio.preload = "auto";
    messageSoundRef.current = audio;

    return () => {
      if (messageSoundRef.current) {
        messageSoundRef.current.pause();
        messageSoundRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (!isMessengerOpen || !selectedThreadId) {
      if (composerTypingTimeoutRef.current) {
        clearTimeout(composerTypingTimeoutRef.current);
        composerTypingTimeoutRef.current = null;
      }
      void updateOwnTypingPresence(false);
      return;
    }

    const shouldShowTyping = isComposerFocused && composer.trim().length > 0;

    if (!shouldShowTyping) {
      if (composerTypingTimeoutRef.current) {
        clearTimeout(composerTypingTimeoutRef.current);
        composerTypingTimeoutRef.current = null;
      }
      void updateOwnTypingPresence(false);
      return;
    }

    void updateOwnTypingPresence(true);

    if (composerTypingTimeoutRef.current) {
      clearTimeout(composerTypingTimeoutRef.current);
    }

    composerTypingTimeoutRef.current = setTimeout(() => {
      composerTypingTimeoutRef.current = null;
      void updateOwnTypingPresence(false);
    }, 1800);
  }, [composer, isComposerFocused, isMessengerOpen, selectedThreadId]);

  React.useEffect(() => {
    if (!selectedThreadId || !threadDetail || threadDetail.thread.id !== selectedThreadId) {
      return;
    }

    if (threadDetail.thread.unread_count === 0) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      const result = await markCommunityThreadRead(selectedThreadId);
      if (isCancelled || (result && "error" in result)) {
        return;
      }

      clearUnreadState(selectedThreadId);
    })();

    return () => {
      isCancelled = true;
    };
  }, [selectedThreadId, threadDetail]);

  React.useEffect(() => {
    const tracked = supabase.channel("community-messenger-presence", {
      config: { presence: { key: currentUser.id } },
    });

    const syncPresence = () => {
      const state = tracked.presenceState() as Record<string, Array<Record<string, unknown>>>;
      const nextIds = new Set<string>();
      Object.values(state).forEach((entries) => {
        entries.forEach((entry) => {
          const userId = typeof entry.user_id === "string" ? entry.user_id : null;
          if (userId) {
            nextIds.add(userId);
          }
        });
      });
      setOnlineIds(nextIds);
    };

    tracked
      .on("presence", { event: "sync" }, syncPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await tracked.track({
            user_id: currentUser.id,
            joined_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(tracked);
    };
  }, [currentUser.id, supabase]);

  React.useEffect(() => {
    const channel = supabase
      .channel(`community-messenger-updates:${currentUser.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_chat_threads" },
        handleThreadRealtime
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_chat_members",
          filter: `user_id=eq.${currentUser.id}`,
        },
        handleOwnMembershipRealtime
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, supabase]);

  React.useEffect(() => {
    const channel = supabase
      .channel(`community-messenger-notifications:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${currentUser.id}`,
        },
        handleMessageNotificationRealtime
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, supabase]);

  React.useEffect(() => {
    if (!selectedThreadId) {
      activeThreadChannelRef.current = null;
      setTypingNames([]);
      return;
    }

    const channel = supabase
      .channel(`community-messenger-thread:${selectedThreadId}`, {
        config: {
          broadcast: { ack: true },
          presence: { key: currentUser.id },
        },
      })
      .on("presence", { event: "sync" }, syncTypingPresence)
      .on("presence", { event: "join" }, syncTypingPresence)
      .on("presence", { event: "leave" }, syncTypingPresence)
      .on("broadcast", { event: "message-sent" }, handleActiveThreadBroadcastMessage)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_chat_messages",
          filter: `thread_id=eq.${selectedThreadId}`,
        },
        handleActiveThreadMessageRealtime
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "community_chat_members",
          filter: `thread_id=eq.${selectedThreadId}`,
        },
        handleActiveThreadMemberRealtime
      )
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") {
          return;
        }

        activeThreadChannelRef.current = channel;
        await channel.track({
          user_id: currentUser.id,
          typing: false,
          updated_at: new Date().toISOString(),
        });
        syncTypingPresence();
      });

    return () => {
      if (composerTypingTimeoutRef.current) {
        clearTimeout(composerTypingTimeoutRef.current);
        composerTypingTimeoutRef.current = null;
      }
      ownTypingStateRef.current = false;
      lastTypingTrackAtRef.current = 0;
      setTypingNames([]);
      if (activeThreadChannelRef.current === channel) {
        activeThreadChannelRef.current = null;
      }
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, selectedThreadId, supabase]);

  React.useEffect(() => {
    if (!isMessengerOpen || !selectedThreadId) {
      return;
    }

    const runSync = () => {
      if (document.visibilityState !== "visible" || selectedThreadIdRef.current !== selectedThreadId) {
        return;
      }

      void syncActiveThreadState(selectedThreadId);
    };

    const interval = window.setInterval(runSync, 1500);
    const handleFocus = () => runSync();
    const handleVisibilityChange = () => runSync();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isMessengerOpen, selectedThreadId]);

  React.useEffect(() => {
    const chatFromQuery = searchParams.get("chat");
    if (chatFromQuery) {
      setIsMessengerOpen(true);
      setSelectedThreadId(chatFromQuery);
    }
  }, [searchParams]);

  const filteredUsers = React.useMemo(() => {
    const query = accountFilter.trim().toLowerCase();
    const baseUsers = users.filter((user) => user.id !== currentUser.id);

    if (!query) return baseUsers;

    return baseUsers.filter((user) => {
      const haystack = [
        user.display_name,
        user.department || "",
        user.position_label,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [accountFilter, currentUser.id, users]);

  const filteredThreads = React.useMemo(() => {
    const query = threadFilter.trim().toLowerCase();
    if (!query) return bootstrap.threads;
    return bootstrap.threads.filter((thread) =>
      [thread.name, thread.last_message_preview, threadSubtitle(thread)]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [bootstrap.threads, threadFilter]);

  const latestOwnMessage = React.useMemo(() => {
    if (!threadDetail) return null;
    const ownMessages = threadDetail.messages.filter((message) => message.sender_id === currentUser.id);
    return ownMessages[ownMessages.length - 1] || null;
  }, [currentUser.id, threadDetail]);

  const latestOwnStatus = React.useMemo(() => {
    if (!threadDetail || threadDetail.thread.thread_type !== "direct" || !latestOwnMessage) {
      return null;
    }

    const readAt = threadDetail.receipt.last_read_at;
    if (readAt && new Date(readAt).getTime() >= new Date(latestOwnMessage.created_at).getTime()) {
      return `Seen • ${formatTime(latestOwnMessage.created_at)}`;
    }

    return `Delivered • ${formatTime(latestOwnMessage.created_at)}`;
  }, [latestOwnMessage, threadDetail]);

  const typingLabel = React.useMemo(() => {
    if (typingNames.length === 0) return null;
    if (typingNames.length === 1) return `${typingNames[0]} is typing...`;
    if (typingNames.length === 2) return `${typingNames[0]} and ${typingNames[1]} are typing...`;
    return "Several people are typing...";
  }, [typingNames]);

  const openDirectMessage = (userId: string) => {
    setIsMessengerOpen(true);
    startDirectTransition(async () => {
      const result = await ensureCommunityDirectThread(userId);
      if (result && "error" in result) {
        alert(result.error);
        return;
      }

      if (result?.threadId) {
        setSelectedThreadId(result.threadId);
        await loadBootstrap();
        router.replace(`/dashboard?panel=community&chat=${result.threadId}`);
      }
    });
  };

  const openGroupCreator = (seedUserId?: string) => {
    setGroupName("");
    setGroupMemberIds(seedUserId ? [seedUserId] : []);
    setIsGroupDialogOpen(true);
  };

  const submitGroup = () => {
    startDirectTransition(async () => {
      const result = await createCommunityGroupThread({
        name: groupName,
        memberIds: groupMemberIds,
      });

      if (result && "error" in result) {
        alert(result.error);
        return;
      }

      setIsGroupDialogOpen(false);
      setIsMessengerOpen(true);
      if (result?.threadId) {
        setSelectedThreadId(result.threadId);
        await loadBootstrap();
        router.replace(`/dashboard?panel=community&chat=${result.threadId}`);
      }
    });
  };

  const handleAttachmentPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Only PDF files are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("PDF files must be 5 MB or smaller.");
      return;
    }

    const threadId = selectedThreadId || "draft";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${currentUser.id}/${threadId}/${Date.now()}-${safeName}`;
    const { error } = await supabase.storage
      .from("cqer-community-messenger")
      .upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (error) {
      alert(error.message);
      return;
    }

    setComposerAttachments((current) => [
      ...current,
      {
        path,
        name: file.name,
        type: "application/pdf",
        size: file.size,
      },
    ]);
  };

  const openAttachment = async (attachment: AttachmentInput) => {
    const { data, error } = await supabase.storage
      .from("cqer-community-messenger")
      .createSignedUrl(attachment.path, 3600);

    if (error || !data?.signedUrl) {
      alert(error?.message || "Failed to open the file.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const sendMessage = () => {
    if (!selectedThreadId) return;

    startSendTransition(async () => {
      const result = await sendCommunityMessage({
        threadId: selectedThreadId,
        body: composer,
        attachments: composerAttachments,
      });

      if (result && "error" in result) {
        alert(result.error);
        return;
      }

      setComposer("");
      setComposerAttachments([]);
      setIsComposerFocused(false);
      void updateOwnTypingPresence(false);
      if (result?.message && result.thread) {
        applyOptimisticMessage(result.message, result.thread);
      }
      if (result?.thread) {
        void activeThreadChannelRef.current?.send({
          type: "broadcast",
          event: "message-sent",
          payload: {
            thread_id: result.thread.id,
            sent_at: result.thread.last_message_at,
            message: result.message,
            thread: result.thread,
          } satisfies RealtimeBroadcastMessage,
        });
      }
    });
  };

  return (
    <>
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="space-y-2 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xs font-semibold">Registered Accounts</CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Realtime online presence for CQER community members.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => setIsMessengerOpen(true)}>
              <MessageSquareMore className="mr-1.5 h-3.5 w-3.5" />
              Messenger
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={accountFilter}
              onChange={(event) => setAccountFilter(event.target.value)}
              placeholder="Search account"
              className="h-8 pl-7 text-[10px]"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[320px] pr-3">
            <div className="space-y-1.5">
              {filteredUsers.map((user) => {
                const isOnline = onlineIds.has(user.id);
                return (
                  <Popover
                    key={user.id}
                    open={hoveredUserId === user.id}
                    onOpenChange={(open) => setHoveredUserId(open ? user.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={() => openDirectMessage(user.id)}
                        onMouseEnter={() => setHoveredUserId(user.id)}
                        onMouseLeave={() => setHoveredUserId((current) => (current === user.id ? null : current))}
                        className="flex w-full items-center gap-2 rounded-xl border border-transparent px-2 py-2 text-left transition-colors hover:border-border/50 hover:bg-muted/30"
                      >
                        <div className="relative shrink-0">
                          <Avatar className="h-8 w-8 border border-border/50">
                            <AvatarImage src={user.avatar_url || undefined} alt={formatName(user)} />
                            <AvatarFallback className="text-[9px]">{initials(user)}</AvatarFallback>
                          </Avatar>
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                              isOnline ? "bg-green-500" : "bg-muted-foreground/30"
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-semibold">{formatName(user)}</p>
                          <div className="mt-1 space-y-1 text-[9px] text-muted-foreground">
                            <div className="flex items-start gap-1.5">
                              <Building2 className="mt-0.5 h-3 w-3 shrink-0" />
                              <p className="min-w-0 whitespace-normal break-words leading-4">
                                {user.department || "No department"}
                              </p>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <IdCard className="mt-0.5 h-3 w-3 shrink-0" />
                              <p className="min-w-0 whitespace-normal break-words leading-4">
                                {user.position_label}
                              </p>
                            </div>
                          </div>
                        </div>
                        {isOnline ? (
                          <Badge variant="outline" className="h-5 rounded-full px-1.5 text-[8px] text-green-600">
                            Online
                          </Badge>
                        ) : null}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-auto border-0 bg-transparent p-0 shadow-none"
                      onMouseEnter={() => setHoveredUserId(user.id)}
                      onMouseLeave={() => setHoveredUserId((current) => (current === user.id ? null : current))}
                    >
                      <AccountHoverCard
                        user={user}
                        isOnline={isOnline}
                        onMessage={() => openDirectMessage(user.id)}
                        onCreateGroup={() => openGroupCreator(user.id)}
                      />
                    </PopoverContent>
                  </Popover>
                );
              })}
              {filteredUsers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/50 px-3 py-4 text-center text-[10px] text-muted-foreground">
                  No accounts matched your search.
                </p>
              ) : null}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isMessengerOpen} onOpenChange={setIsMessengerOpen}>
        <DialogContent className="flex h-[85vh] max-h-[760px] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b border-border/50 px-4 py-3">
            <div>
              <DialogTitle className="text-sm">CQER Community Messenger</DialogTitle>
              <p className="text-[10px] text-muted-foreground">
                Realtime direct and group chat with PDF sharing.
              </p>
            </div>
          </DialogHeader>

          <div className="grid h-full min-h-0 flex-1 md:grid-cols-[260px_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col overflow-hidden border-b border-border/50 md:border-b-0 md:border-r">
              <div className="space-y-2 p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={threadFilter}
                    onChange={(event) => setThreadFilter(event.target.value)}
                    placeholder="Search chats"
                    className="h-8 pl-7 text-[10px]"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-full justify-center text-[10px]"
                  onClick={() => openGroupCreator()}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Group
                </Button>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-1 px-2 pb-3">
                  {isLoading ? (
                    <div className="flex items-center gap-2 px-2 py-4 text-[10px] text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading conversations...
                    </div>
                  ) : filteredThreads.length === 0 ? (
                    <p className="px-2 py-4 text-[10px] text-muted-foreground">No conversations yet.</p>
                  ) : (
                    filteredThreads.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        onClick={() => {
                          setSelectedThreadId(thread.id);
                          router.replace(`/dashboard?panel=community&chat=${thread.id}`);
                        }}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition-colors",
                          selectedThreadId === thread.id ? "bg-muted" : "hover:bg-muted/40"
                        )}
                      >
                        <Avatar className="h-9 w-9 border border-border/50">
                          <AvatarImage
                            src={thread.thread_type === "direct" ? thread.direct_user?.avatar_url || undefined : undefined}
                            alt={thread.name}
                          />
                          <AvatarFallback className="text-[9px]">
                            {thread.thread_type === "direct" && thread.direct_user ? initials(thread.direct_user) : "GC"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[10px] font-semibold">{thread.name}</p>
                            <span className="shrink-0 text-[8px] text-muted-foreground">
                              {formatThreadTime(thread.last_message_at)}
                            </span>
                          </div>
                          <p className="truncate text-[9px] text-muted-foreground">{threadSubtitle(thread)}</p>
                          <p className="truncate text-[9px] text-muted-foreground">{thread.last_message_preview}</p>
                        </div>
                        {thread.unread_count > 0 ? (
                          <span className="rounded-full bg-green-600 px-1.5 py-0.5 text-[8px] font-semibold text-white">
                            {thread.unread_count}
                          </span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
              {threadDetail ? (
                <>
                  <div className="shrink-0 border-b border-border/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border/50">
                        <AvatarImage
                          src={threadDetail.thread.thread_type === "direct" ? threadDetail.thread.direct_user?.avatar_url || undefined : undefined}
                          alt={threadDetail.thread.name}
                        />
                        <AvatarFallback className="text-[9px]">
                          {threadDetail.thread.thread_type === "direct" && threadDetail.thread.direct_user
                            ? initials(threadDetail.thread.direct_user)
                            : "GC"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold">{threadDetail.thread.name}</p>
                        <p className="truncate text-[9px] text-muted-foreground">{threadSubtitle(threadDetail.thread)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 overflow-hidden bg-muted/10">
                    <ScrollArea className="h-full">
                      <div className="space-y-3 px-4 py-3">
                        {isThreadLoading ? (
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading messages...
                          </div>
                        ) : threadDetail.messages.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground">No messages yet. Start the conversation.</p>
                        ) : (
                          threadDetail.messages.map((message) => {
                            const isMine = message.sender_id === currentUser.id;
                            return (
                              <div
                                key={message.id}
                                className={cn("flex gap-2", isMine ? "justify-end" : "justify-start")}
                              >
                                {!isMine ? (
                                  <Avatar className="mt-1 h-7 w-7 border border-border/50">
                                    <AvatarImage src={message.sender.avatar_url || undefined} alt={message.sender.display_name} />
                                    <AvatarFallback className="text-[8px]">{initials(message.sender)}</AvatarFallback>
                                  </Avatar>
                                ) : null}
                                <div
                                  className={cn(
                                    "max-w-[80%] rounded-2xl px-3 py-2 shadow-sm",
                                    isMine
                                      ? "bg-foreground text-background"
                                      : "border border-border/50 bg-background"
                                  )}
                                >
                                  {!isMine && threadDetail.thread.thread_type === "group" ? (
                                    <p className="mb-1 text-[8px] font-semibold text-muted-foreground">
                                      {message.sender.display_name}
                                    </p>
                                  ) : null}
                                  {message.body ? (
                                    <p className="whitespace-pre-wrap text-[10px] leading-5">{message.body}</p>
                                  ) : null}
                                  {message.attachments.length > 0 ? (
                                    <div className={cn("mt-2 space-y-1.5", !message.body ? "mt-0" : "")}>
                                      {message.attachments.map((attachment) => (
                                        <button
                                          key={attachment.path}
                                          type="button"
                                          onClick={() => void openAttachment(attachment)}
                                          className={cn(
                                            "flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left",
                                            isMine
                                              ? "border-white/15 bg-white/10 text-background"
                                              : "border-border/50 bg-muted/20"
                                          )}
                                        >
                                          <FileText className="h-4 w-4 shrink-0" />
                                          <div className="min-w-0">
                                            <p className="truncate text-[10px] font-medium">{attachment.name}</p>
                                            <p className="text-[8px] opacity-80">Open PDF</p>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                  <p
                                    className={cn(
                                      "mt-1 text-[8px]",
                                      isMine ? "text-background/70" : "text-muted-foreground"
                                    )}
                                  >
                                    {formatTime(message.created_at)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="shrink-0 border-t border-border/50 bg-background px-4 py-3">
                    {typingLabel || latestOwnStatus ? (
                      <div className="mb-2 flex items-center justify-between gap-2 text-[8px] text-muted-foreground">
                        <div className="min-w-0 truncate">{typingLabel ? <span>{typingLabel}</span> : <span />}</div>
                        {latestOwnStatus ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <CheckCheck className="h-3 w-3" />
                            <span>{latestOwnStatus}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {composerAttachments.length > 0 ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {composerAttachments.map((attachment) => (
                          <div key={attachment.path} className="flex items-center gap-2 rounded-full border border-border/50 px-2 py-1 text-[9px]">
                            <FileText className="h-3.5 w-3.5" />
                            <span className="max-w-[180px] truncate">{attachment.name}</span>
                            <button
                              type="button"
                              className="text-muted-foreground"
                              onClick={() =>
                                setComposerAttachments((current) =>
                                  current.filter((item) => item.path !== attachment.path)
                                )
                              }
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-background text-muted-foreground transition-colors hover:bg-muted"
                        aria-label="Attach PDF"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <Input
                        value={composer}
                        onChange={(event) => setComposer(event.target.value)}
                        onFocus={() => setIsComposerFocused(true)}
                        onBlur={() => setIsComposerFocused(false)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Write a message"
                        className="h-9 text-[10px]"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 text-[10px]"
                        disabled={isSending || (!composer.trim() && composerAttachments.length === 0)}
                        onClick={sendMessage}
                      >
                        {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <p className="mt-2 text-[8px] text-muted-foreground">
                      PDF only, 5 MB max. Messages are stored encrypted in the database.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={handleAttachmentPick}
                    />
                  </div>
                </>
              ) : (
                <div className="flex min-h-0 flex-col items-center justify-center gap-2 px-6 text-center">
                  <Circle className="h-7 w-7 text-muted-foreground/40" />
                  <p className="text-[11px] font-semibold">Select a conversation</p>
                  <p className="text-[10px] text-muted-foreground">
                    Open an account on the left or create a new group chat.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Create Group Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px]">Group Name</Label>
              <Input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Example: CEIT Coordinators"
                className="h-8 text-[10px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">Members</Label>
              <ScrollArea className="h-56 rounded-xl border border-border/50 p-2">
                <div className="space-y-1">
                  {users
                    .filter((user) => user.id !== currentUser.id)
                    .map((user) => {
                      const selected = groupMemberIds.includes(user.id);
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() =>
                            setGroupMemberIds((current) =>
                              current.includes(user.id)
                                ? current.filter((id) => id !== user.id)
                                : [...current, user.id]
                            )
                          }
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                            selected ? "bg-muted" : "hover:bg-muted/40"
                          )}
                        >
                          <Avatar className="h-7 w-7 border border-border/50">
                            <AvatarImage src={user.avatar_url || undefined} alt={user.display_name} />
                            <AvatarFallback className="text-[8px]">{initials(user)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-medium">{user.display_name}</p>
                            <p className="truncate text-[8px] text-muted-foreground">
                              {user.department || "No department"} • {user.position_label}
                            </p>
                          </div>
                          {selected ? <UserPlus2 className="h-3.5 w-3.5 text-foreground" /> : null}
                        </button>
                      );
                    })}
                </div>
              </ScrollArea>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => setIsGroupDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" className="h-8 text-[10px]" onClick={submitGroup} disabled={isBootstrappingThread}>
                {isBootstrappingThread ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
