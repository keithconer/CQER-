"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCheck,
  Circle,
  FileText,
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
          <p className="truncate text-[9px] text-muted-foreground">
            {user.department || "No department"}
          </p>
          <p className="truncate text-[9px] text-muted-foreground">{user.position_label}</p>
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
  const [isSending, startSendTransition] = React.useTransition();
  const [isBootstrappingThread, startDirectTransition] = React.useTransition();
  const [isGroupDialogOpen, setIsGroupDialogOpen] = React.useState(false);
  const [groupName, setGroupName] = React.useState("");
  const [groupMemberIds, setGroupMemberIds] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  const loadBootstrap = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const nextBootstrap = await getCommunityMessengerBootstrap();
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
      setIsLoading(false);
    }
  }, [searchParams]);

  const loadThreadDetail = React.useCallback(
    async (threadId: string) => {
      setIsThreadLoading(true);
      try {
        const detail = await getCommunityThreadDetail(threadId);
        setThreadDetail(detail);
        setSelectedThreadId(threadId);
        await markCommunityThreadRead(threadId);
        setBootstrap((current) => ({
          threads: current.threads.map((thread) =>
            thread.id === threadId ? { ...thread, unread_count: 0 } : thread
          ),
        }));
      } finally {
        setIsThreadLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  React.useEffect(() => {
    if (!selectedThreadId) {
      setThreadDetail(null);
      return;
    }

    void loadThreadDetail(selectedThreadId);
  }, [loadThreadDetail, selectedThreadId]);

  React.useEffect(() => {
    if (!threadDetail) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [threadDetail]);

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
        () => {
          void loadBootstrap();
          if (selectedThreadId) {
            void loadThreadDetail(selectedThreadId);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_chat_members" },
        () => {
          void loadBootstrap();
          if (selectedThreadId) {
            void loadThreadDetail(selectedThreadId);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_chat_messages" },
        () => {
          void loadBootstrap();
          if (selectedThreadId) {
            void loadThreadDetail(selectedThreadId);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, loadBootstrap, loadThreadDetail, selectedThreadId, supabase]);

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
      await loadBootstrap();
      await loadThreadDetail(selectedThreadId);
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
                          <p className="truncate text-[9px] text-muted-foreground">
                            {user.department || "No department"}
                          </p>
                          <p className="truncate text-[9px] text-muted-foreground">{user.position_label}</p>
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
        <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b border-border/50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-sm">CQER Community Messenger</DialogTitle>
                <p className="text-[10px] text-muted-foreground">
                  Realtime direct and group chat with PDF sharing.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => openGroupCreator()}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Group
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="grid min-h-[70vh] md:grid-cols-[260px_minmax(0,1fr)]">
            <div className="border-b border-border/50 md:border-b-0 md:border-r">
              <div className="p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={threadFilter}
                    onChange={(event) => setThreadFilter(event.target.value)}
                    placeholder="Search chats"
                    className="h-8 pl-7 text-[10px]"
                  />
                </div>
              </div>
              <ScrollArea className="h-[calc(70vh-4.5rem)]">
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

            <div className="flex min-h-0 flex-col">
              {threadDetail ? (
                <>
                  <div className="border-b border-border/50 px-4 py-3">
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

                  <ScrollArea className="flex-1 bg-muted/10 px-4 py-3">
                    <div className="space-y-3">
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

                  <div className="border-t border-border/50 px-4 py-3">
                    {latestOwnStatus ? (
                      <div className="mb-2 flex items-center justify-end gap-1 text-[8px] text-muted-foreground">
                        <CheckCheck className="h-3 w-3" />
                        <span>{latestOwnStatus}</span>
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
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 px-6 text-center">
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
