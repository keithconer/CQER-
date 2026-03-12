"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type NotificationItem = {
  id: string;
  actor_name: string;
  actor_avatar_url: string | null;
  entity_kind: "project" | "proposal" | "program" | "training";
  entity_title: string;
  action_type: "created" | "updated" | "document_uploaded";
  route: string;
  created_at: string;
  read_at: string | null;
};

interface NotificationBellProps {
  userId: string;
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

function buildMessage(item: NotificationItem) {
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

  if (item.action_type === "updated") {
    return `${actorName} updated ${objectLabel} "${item.entity_title}"`;
  }

  return `${actorName} has created a ${objectLabel} "${item.entity_title}"`;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!open) setShowAll(false);
  }, [open]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      const [{ data, error: listError }, { count, error: countError }] = await Promise.all([
        supabase
          .from("notifications")
          .select(
            "id, actor_name, actor_avatar_url, entity_kind, entity_title, action_type, route, created_at, read_at"
          )
          .eq("recipient_id", userId)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", userId)
          .is("read_at", null),
      ]);

      if (!active) return;

      if (listError || countError) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      setNotifications((data as NotificationItem[] | null) || []);
      setUnreadCount(count || 0);
      setLoading(false);
    };

    void loadNotifications();

    const channel = supabase
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

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const hasMore = notifications.length > 5;
  const visibleNotifications = showAll ? notifications : notifications.slice(0, 5);

  const handleNotificationClick = async (item: NotificationItem) => {
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

    if (!item.read_at) {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, read_at: new Date().toISOString() }
            : notification
        )
      );
      setUnreadCount((current) => Math.max(current - 1, 0));

      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", item.id);
    }

    setOpen(false);
    
    // Clean up local overlay after a short delay since routing might take a moment
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 1500);

    router.push(item.route);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent align="end" className="w-[22rem] p-0 flex flex-col">
        <div className="border-b border-border/40 px-3 py-2">
          <p className="text-[10px] font-semibold text-foreground">Notifications</p>
          <p className="text-[9px] text-muted-foreground">
            {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
          </p>
        </div>

        <ScrollArea className="max-h-80 flex-1 min-h-0">
          <div className="p-1.5">
            {loading ? (
              <p className="px-2 py-3 text-[9px] text-muted-foreground">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="px-2 py-3 text-[9px] text-muted-foreground">No notifications yet.</p>
            ) : (
              visibleNotifications.map((item) => {
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
                      <p className="line-clamp-2 text-[9px] leading-4 text-foreground/90">
                        {buildMessage(item)}
                      </p>
                      <p className="mt-1 text-[8px] text-muted-foreground">
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
