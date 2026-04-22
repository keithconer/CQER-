"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AtSign, BellRing, MessageCircle, Reply } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const COMMUNITY_ACTION_TYPES = ["community_post", "mentioned", "commented", "replied"] as const;

type CommunityNotificationItem = {
  id: string;
  actor_name: string;
  actor_avatar_url: string | null;
  action_type: (typeof COMMUNITY_ACTION_TYPES)[number];
  entity_title: string;
  route: string;
  created_at: string;
  read_at: string | null;
};

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

  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function buildCommunityMessage(item: CommunityNotificationItem) {
  const actorName = item.actor_name.trim() || "A user";

  if (item.action_type === "mentioned") {
    return `${actorName} mentioned you in CQER Community`;
  }

  if (item.action_type === "commented") {
    return `${actorName} commented on your CQER Community post`;
  }

  if (item.action_type === "replied") {
    return `${actorName} replied to your CQER Community comment`;
  }

  return `${actorName} shared a CQER Community post`;
}

function getCommunityIcon(actionType: CommunityNotificationItem["action_type"]) {
  if (actionType === "mentioned") {
    return AtSign;
  }

  if (actionType === "commented") {
    return MessageCircle;
  }

  if (actionType === "replied") {
    return Reply;
  }

  return BellRing;
}

export function CommunityNotificationPanel({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [loading, setLoading] = React.useState(true);
  const [notifications, setNotifications] = React.useState<CommunityNotificationItem[]>([]);

  React.useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, actor_name, actor_avatar_url, action_type, entity_title, route, created_at, read_at")
        .eq("recipient_id", userId)
        .in("action_type", [...COMMUNITY_ACTION_TYPES])
        .order("created_at", { ascending: false })
        .limit(8);

      if (!active) {
        return;
      }

      if (error) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      setNotifications((data as CommunityNotificationItem[] | null) || []);
      setLoading(false);
    };

    void loadNotifications();

    const channel = supabase
      .channel(`community-notifications:${userId}`)
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

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  const handleOpenNotification = async (item: CommunityNotificationItem) => {
    if (!item.read_at) {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id ? { ...notification, read_at: readAt } : notification
        )
      );

      await supabase
        .from("notifications")
        .update({ read_at: readAt })
        .eq("recipient_id", userId)
        .eq("id", item.id);
    }

    router.push(item.route);
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="space-y-1 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BellRing className="h-3.5 w-3.5 text-muted-foreground" />
            <CardTitle className="text-xs font-semibold">Community Alerts</CardTitle>
          </div>
          {unreadCount > 0 ? (
            <Badge variant="outline" className="h-5 rounded-full px-1.5 text-[8px] text-green-600">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          ) : null}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Recent CQER Community notifications for your account.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[220px] pr-3">
          <div className="space-y-1.5">
            {loading ? (
              <p className="px-2 py-3 text-[9px] text-muted-foreground">Loading community alerts...</p>
            ) : notifications.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/50 px-3 py-4 text-center text-[9px] text-muted-foreground">
                No community notifications yet.
              </p>
            ) : (
              notifications.map((item) => {
                const ItemIcon = getCommunityIcon(item.action_type);
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
                    onClick={() => void handleOpenNotification(item)}
                    className={`flex w-full items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors hover:bg-muted/40 ${
                      item.read_at ? "border-transparent" : "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                    }`}
                  >
                    <Avatar className="mt-0.5 h-7 w-7 border border-border/40">
                      <AvatarImage src={item.actor_avatar_url || undefined} alt={item.actor_name} />
                      <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5">
                        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <ItemIcon className="h-2.5 w-2.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-[9px] leading-4 text-foreground/90">
                            {buildCommunityMessage(item)}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[8px] text-muted-foreground">
                            {item.entity_title}
                          </p>
                        </div>
                      </div>
                      <p className="mt-1 pl-5 text-[8px] text-muted-foreground">
                        {formatTimeAgo(item.created_at)}
                      </p>
                    </div>
                    {!item.read_at ? <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-green-600" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
