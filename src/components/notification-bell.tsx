"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookMarked, FileText, MessageSquareMore, UserPlus } from "lucide-react";
import {
  getCommunityUnreadDirectNotifications,
  markCommunityThreadRead,
  type CommunityUnreadDirectNotification,
} from "@/lib/actions/community-messenger";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type NotificationItem = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_avatar_url: string | null;
  entity_kind: "project" | "proposal" | "program" | "training" | "announcement" | "community_comment" | "chat";
  entity_title: string;
  action_type:
    | "created"
    | "updated"
    | "document_uploaded"
    | "assigned"
    | "community_post"
    | "mentioned"
    | "commented"
    | "replied"
    | "message_received"
    | "training_assigned"
    | "training_filled";
  route: string;
  created_at: string;
  read_at: string | null;
};

type NotificationDisplayItem = NotificationItem & {
  grouped_count: number;
  notification_ids: string[];
  source: "notifications" | "messenger_unread";
  thread_id: string | null;
};

interface NotificationBellProps {
  userId: string;
}

function parseChatThreadId(route: string) {
  try {
    return new URL(route, "https://cqer.local").searchParams.get("chat");
  } catch {
    return null;
  }
}

function formatTimeAgo(value: string) {
  const createdAt = new Date(value).getTime();
  const diffMs = Math.max(Date.now() - createdAt, 0);
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}wk ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}yr ago`;
}

function buildMessage(item: NotificationDisplayItem) {
  const actorName = item.actor_name.trim() || "A coordinator";
  const objectLabel =
    item.entity_kind === "proposal"
      ? "project proposal"
      : item.entity_kind === "program"
        ? "program"
        : item.entity_kind;

  if (item.action_type === "document_uploaded") {
    return `${actorName} uploaded document(s) to ${objectLabel} "${item.entity_title}"`;
  }

  if (item.action_type === "assigned") {
    return `${actorName} has assigned you on a project as a project leader`;
  }

  if (item.action_type === "training_assigned") {
    return `${actorName} has assigned you on a training.`;
  }

  if (item.action_type === "training_filled") {
    return `${actorName} has filled up on the training that they are assigned.`;
  }

  if (item.action_type === "mentioned") {
    return `${actorName} mentioned you in a CQER Community announcement`;
  }

  if (item.action_type === "commented") {
    return `${actorName} commented on your CQER Community announcement`;
  }

  if (item.action_type === "replied") {
    return `${actorName} replied to your CQER Community comment`;
  }

  if (item.action_type === "community_post") {
    return `${actorName} shared a new CQER Community post: "${item.entity_title}"`;
  }

  if (item.action_type === "message_received") {
    if (item.grouped_count > 1) {
      return `${actorName} has messaged you (${item.grouped_count}+) new messages`;
    }

    return `${actorName} has messaged you`;
  }

  if (item.action_type === "updated") {
    return `${actorName} updated ${objectLabel} "${item.entity_title}"`;
  }

  return `${actorName} has created a ${objectLabel} "${item.entity_title}"`;
}

function getNotificationIcon(item: NotificationDisplayItem) {
  if (item.action_type === "message_received") {
    return MessageSquareMore;
  }

  if (item.action_type === "document_uploaded") {
    return FileText;
  }

  if (item.action_type === "assigned" || item.action_type === "training_assigned" || item.action_type === "training_filled") {
    return item.action_type === "training_assigned" || item.action_type === "training_filled" ? BookMarked : UserPlus;
  }

  return Bell;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [messengerFallbackNotifications, setMessengerFallbackNotifications] = useState<
    CommunityUnreadDirectNotification[]
  >([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      const [notificationListResult, unreadDirectMessagesResult] = await Promise.all([
        supabase
          .from("notifications")
          .select(
            "id, actor_id, actor_name, actor_avatar_url, entity_kind, entity_title, action_type, route, created_at, read_at"
          )
          .eq("recipient_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        getCommunityUnreadDirectNotifications().catch(() => [] as CommunityUnreadDirectNotification[]),
      ]);

      if (!active) return;

      if (notificationListResult.error) {
        setNotifications([]);
        setMessengerFallbackNotifications([]);
        setLoading(false);
        return;
      }

      setNotifications((notificationListResult.data as NotificationItem[] | null) || []);
      setMessengerFallbackNotifications(unreadDirectMessagesResult);
      setLoading(false);
    };

    void loadNotifications();

    const notificationChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    const messengerChannel = supabase
      .channel(`notification-bell-messenger:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_chat_threads",
        },
        () => {
          void loadNotifications();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_chat_members",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadNotifications();
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(notificationChannel);
      void supabase.removeChannel(messengerChannel);
    };
  }, [supabase, userId]);

  const displayNotifications = useMemo<NotificationDisplayItem[]>(() => {
    const groupedMessageNotifications = new Map<string, NotificationDisplayItem>();
    const items: NotificationDisplayItem[] = [];

    notifications.forEach((item) => {
      if (item.action_type === "message_received" && !item.read_at) {
        const groupKey = `${item.route}:${item.actor_id ?? item.actor_name}`;
        const existing = groupedMessageNotifications.get(groupKey);

        if (existing) {
          existing.grouped_count += 1;
          existing.notification_ids.push(item.id);
          return;
        }

        const groupedItem: NotificationDisplayItem = {
          ...item,
          grouped_count: 1,
          notification_ids: [item.id],
          source: "notifications",
          thread_id: parseChatThreadId(item.route),
        };
        groupedMessageNotifications.set(groupKey, groupedItem);
        items.push(groupedItem);
        return;
      }

      items.push({
        ...item,
        grouped_count: 1,
        notification_ids: [item.id],
        source: "notifications",
        thread_id: parseChatThreadId(item.route),
      });
    });

    messengerFallbackNotifications.forEach((item) => {
      const groupKey = `${item.route}:${item.actor_id}`;
      if (groupedMessageNotifications.has(groupKey)) {
        return;
      }

      items.push({
        id: `messenger-unread:${item.thread_id}`,
        actor_id: item.actor_id,
        actor_name: item.actor_name,
        actor_avatar_url: item.actor_avatar_url,
        entity_kind: "chat",
        entity_title: "Direct message",
        action_type: "message_received",
        route: item.route,
        created_at: item.created_at,
        read_at: null,
        grouped_count: item.unread_count,
        notification_ids: [],
        source: "messenger_unread",
        thread_id: item.thread_id,
      });
    });

    return items.sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  }, [messengerFallbackNotifications, notifications]);

  const unreadCount = useMemo(
    () =>
      displayNotifications.reduce((count, item) => {
        if (item.read_at) {
          return count;
        }

        return count + (item.action_type === "message_received" ? item.grouped_count : 1);
      }, 0),
    [displayNotifications]
  );

  const hasMore = displayNotifications.length > 5;
  const visibleNotifications = showAll ? displayNotifications : displayNotifications.slice(0, 5);
  const scrollMaxHeight = showAll
    ? "max-h-[70vh]"
    : (hasMore ? "max-h-80" : "max-h-80");

  const handleNotificationClick = async (item: NotificationDisplayItem) => {
    // Show local loading state before routing
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200";
    overlay.innerHTML = `
      <div class="flex flex-col items-center justify-center p-6 bg-background rounded-xl border shadow-lg gap-4 animate-in zoom-in-95 duration-200">
        <div class="relative w-16 h-16 animate-pulse">
           <img src="/CQERFINAL.png" alt="CQER Logo" class="object-contain w-full h-full" />
        </div>
        <div class="flex items-center gap-2 text-muted-foreground">
           <svg class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
           <span class="text-[10px] font-medium">Loading...</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    if (item.action_type === "message_received" && item.thread_id) {
      const result = await markCommunityThreadRead(item.thread_id);
      if (!(result && "error" in result)) {
        const readAt = new Date().toISOString();
        if (item.notification_ids.length > 0) {
          setNotifications((current) =>
            current.map((notification) =>
              item.notification_ids.includes(notification.id)
                ? { ...notification, read_at: readAt }
                : notification
            )
          );

          await supabase
            .from("notifications")
            .update({ read_at: readAt })
            .eq("recipient_id", userId)
            .in("id", item.notification_ids);
        }

        setMessengerFallbackNotifications((current) =>
          current.filter((notification) => notification.thread_id !== item.thread_id)
        );
      }
    } else {
      const notificationIdsToMark = notifications
        .filter((notification) => item.notification_ids.includes(notification.id) && !notification.read_at)
        .map((notification) => notification.id);

      if (notificationIdsToMark.length > 0) {
        const readAt = new Date().toISOString();
        setNotifications((current) =>
          current.map((notification) =>
            notificationIdsToMark.includes(notification.id)
              ? { ...notification, read_at: readAt }
              : notification
          )
        );

        await supabase
          .from("notifications")
          .update({ read_at: readAt })
          .eq("recipient_id", userId)
          .in("id", notificationIdsToMark);
      }
    }

    setOpen(false);
    
    // Clean up local overlay after a short delay since routing might take a moment
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 1500);

    router.push(item.route);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setShowAll(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-md"
          aria-label="Open notifications"
        >
          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-green-600 px-1 py-0.5 text-center text-[8px] font-semibold leading-none text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0 flex flex-col max-h-[80vh] overflow-hidden">
        <div className="border-b border-border/40 px-3 py-2">
          <p className="text-[10px] font-semibold text-foreground">Notifications</p>
          <p className="text-[9px] text-muted-foreground">
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </p>
        </div>

        <ScrollArea className={`flex-1 min-h-0 overflow-y-auto ${scrollMaxHeight}`}>
          <div className="p-1.5 pr-2">
            {loading ? (
              <p className="px-2 py-3 text-[9px] text-muted-foreground">Loading notifications...</p>
            ) : displayNotifications.length === 0 ? (
              <p className="px-2 py-3 text-[9px] text-muted-foreground">No notifications yet.</p>
            ) : (
              visibleNotifications.map((item) => {
                const ItemIcon = getNotificationIcon(item);
                const initials = item.actor_name
                  .split(" ")
                  .map((part) => part[0] || "")
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleNotificationClick(item)}
                    className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60 ${
                      item.read_at ? "" : "bg-green-50/70 dark:bg-green-950/20"
                    }`}
                  >
                    <Avatar className="mt-0.5 h-7 w-7 border border-border/40">
                      <AvatarImage src={item.actor_avatar_url || undefined} alt={item.actor_name} />
                      <AvatarFallback className="text-[9px] font-medium">{initials}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5">
                        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <ItemIcon className="h-2.5 w-2.5" />
                        </span>
                        <p className="line-clamp-2 text-[9px] leading-4 text-foreground/90">
                          {buildMessage(item)}
                        </p>
                      </div>
                      <p className="mt-1 pl-5 text-[8px] text-muted-foreground">
                        {formatTimeAgo(item.created_at)}
                      </p>
                    </div>

                    {!item.read_at && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-600" />}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {!loading && hasMore && (
          <div className="border-t border-border/40 px-2 py-1.5 bg-background">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-center text-[9px] text-muted-foreground hover:text-foreground"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "Show latest only" : "See previous notifications"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
