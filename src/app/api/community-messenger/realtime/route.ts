import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { decryptCommunityMessage } from "@/lib/community-messenger-crypto";

const MESSENGER_USER_TYPES = [
  "super_admin",
  "college_coordinator",
  "unit_coordinator",
  "project_leader",
] as const;

type MessengerUserType = (typeof MESSENGER_USER_TYPES)[number];

type MessengerProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  department: string | null;
  unit: string | null;
  user_type: MessengerUserType;
};

type MessengerMemberRow = {
  thread_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  last_read_message_id: string | null;
  last_read_at: string | null;
};

type MessengerMessageAttachment = {
  path: string;
  name: string;
  type: string;
  size?: number;
};

type MessengerMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body_encrypted: string | null;
  attachment_files: MessengerMessageAttachment[] | null;
  created_at: string;
};

function displayName(profile: Pick<MessengerProfile, "first_name" | "last_name" | "email">) {
  const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
  return name || profile.email || "CQER User";
}

function positionLabel(userType: MessengerUserType) {
  switch (userType) {
    case "super_admin":
      return "Super Admin";
    case "college_coordinator":
      return "College Coordinator";
    case "unit_coordinator":
      return "Unit Coordinator";
    default:
      return "Project Leader";
  }
}

function mapUser(profile: MessengerProfile) {
  return {
    ...profile,
    display_name: displayName(profile),
    position_label: positionLabel(profile.user_type),
  };
}

function previewFromContent(body: string, attachments: MessengerMessageAttachment[]) {
  const trimmed = body.trim();
  if (trimmed) {
    return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
  }

  const attachment = attachments[0];
  return attachment ? `PDF: ${attachment.name}` : "No messages yet";
}

function normalizeAttachment(value: unknown): MessengerMessageAttachment | null {
  if (!value || typeof value !== "object") return null;
  const path = typeof (value as { path?: unknown }).path === "string" ? (value as { path: string }).path : "";
  const name = typeof (value as { name?: unknown }).name === "string" ? (value as { name: string }).name : "";
  if (!path || !name) return null;

  return {
    path,
    name,
    type:
      typeof (value as { type?: unknown }).type === "string"
        ? (value as { type: string }).type
        : "application/pdf",
    size:
      typeof (value as { size?: unknown }).size === "number"
        ? (value as { size: number }).size
        : undefined,
  };
}

function normalizeAttachments(value: unknown) {
  if (!Array.isArray(value)) return [] as MessengerMessageAttachment[];
  return value.map(normalizeAttachment).filter((item): item is MessengerMessageAttachment => Boolean(item));
}

export async function GET(request: NextRequest) {
  const threadId = request.nextUrl.searchParams.get("threadId")?.trim();
  const afterCreatedAt = request.nextUrl.searchParams.get("afterCreatedAt")?.trim() || null;

  if (!threadId) {
    return NextResponse.json({ error: "Missing threadId." }, { status: 400 });
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, user_type")
    .eq("id", user.id)
    .single();

  if (!profile || !MESSENGER_USER_TYPES.includes(profile.user_type as MessengerUserType)) {
    return NextResponse.json({ error: "Messenger is not available for this account." }, { status: 403 });
  }

  const { data: membership } = await adminClient
    .from("community_chat_members")
    .select("thread_id, user_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "You do not have access to this conversation." }, { status: 403 });
  }

  let messagesQuery = adminClient
    .from("community_chat_messages")
    .select("id, thread_id, sender_id, body_encrypted, attachment_files, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(25);

  if (afterCreatedAt) {
    messagesQuery = messagesQuery.gte("created_at", afterCreatedAt);
  }

  const [{ data: thread }, { data: members }, { data: messages }] = await Promise.all([
    adminClient
      .from("community_chat_threads")
      .select("id, thread_type, name, last_message_at")
      .eq("id", threadId)
      .single(),
    adminClient
      .from("community_chat_members")
      .select("thread_id, user_id, role, joined_at, last_read_message_id, last_read_at")
      .eq("thread_id", threadId),
    messagesQuery,
  ]);

  if (!thread) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const memberRows = (members || []) as MessengerMemberRow[];
  const profileIds = memberRows.map((member) => member.user_id);
  const { data: profiles } = profileIds.length
    ? await adminClient
        .from("profiles")
        .select("id, first_name, last_name, email, avatar_url, department, unit, user_type")
        .in("id", profileIds)
    : { data: [] as MessengerProfile[] | null };

  const profileMap = new Map(
    ((profiles || []) as MessengerProfile[]).map((memberProfile) => [memberProfile.id, mapUser(memberProfile)])
  );

  const otherMember =
    thread.thread_type === "direct"
      ? memberRows.find((member) => member.user_id !== user.id) || null
      : null;

  const normalizedMessages = ((messages || []) as MessengerMessageRow[])
    .map((message) => {
      const sender = profileMap.get(message.sender_id);
      if (!sender) return null;

      return {
        id: message.id,
        thread_id: message.thread_id,
        sender_id: message.sender_id,
        body: decryptCommunityMessage(message.body_encrypted),
        attachments: normalizeAttachments(message.attachment_files),
        created_at: message.created_at,
        sender,
      };
    })
    .filter(Boolean);

  const lastMessage = normalizedMessages[normalizedMessages.length - 1] || null;

  return NextResponse.json(
    {
      thread: {
        id: thread.id,
        name:
          thread.thread_type === "direct"
            ? profileMap.get(otherMember?.user_id || "")?.display_name || "Direct message"
            : thread.name || "Group chat",
        last_message_at: lastMessage?.created_at || thread.last_message_at,
        last_message_preview: lastMessage
          ? previewFromContent(lastMessage.body, lastMessage.attachments)
          : null,
      },
      messages: normalizedMessages,
      receipt: {
        other_user_id: otherMember?.user_id || null,
        last_read_at:
          thread.thread_type === "direct"
            ? (memberRows.find((member) => member.user_id !== user.id)?.last_read_at || null)
            : null,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
