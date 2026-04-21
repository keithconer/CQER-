"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  decryptCommunityMessage,
  encryptCommunityMessage,
} from "@/lib/community-messenger-crypto";

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

type MessengerThreadRow = {
  id: string;
  thread_type: "direct" | "group";
  direct_key: string | null;
  name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_message_at: string;
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
  updated_at: string;
};

export type CommunityMessengerUser = MessengerProfile & {
  display_name: string;
  position_label: string;
};

export type CommunityMessengerThread = {
  id: string;
  thread_type: "direct" | "group";
  name: string;
  direct_user: CommunityMessengerUser | null;
  members: CommunityMessengerUser[];
  unread_count: number;
  last_message_at: string;
  last_message_preview: string;
};

export type CommunityMessengerMessage = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  attachments: MessengerMessageAttachment[];
  created_at: string;
  sender: CommunityMessengerUser;
};

export type CommunityMessengerThreadDetail = {
  thread: CommunityMessengerThread;
  messages: CommunityMessengerMessage[];
  receipt: {
    other_user_id: string | null;
    last_read_at: string | null;
  };
};

export type CommunityMessengerBootstrap = {
  threads: CommunityMessengerThread[];
};

function previewFromContent(body: string, attachments: MessengerMessageAttachment[]) {
  const trimmed = body.trim();
  if (trimmed) {
    return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
  }

  const attachment = attachments[0];
  return attachment ? `PDF: ${attachment.name}` : "No messages yet";
}

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

function messagePreview(message: MessengerMessageRow | undefined) {
  if (!message) return "No messages yet";
  const body = decryptCommunityMessage(message.body_encrypted).trim();
  return previewFromContent(body, normalizeAttachments(message.attachment_files));
}

function directKeyFor(firstUserId: string, secondUserId: string) {
  return [firstUserId, secondUserId].sort().join(":");
}

function mapUser(profile: MessengerProfile): CommunityMessengerUser {
  return {
    ...profile,
    display_name: displayName(profile),
    position_label: positionLabel(profile.user_type),
  };
}

async function getMessengerActor() {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, email, avatar_url, department, unit, user_type")
    .eq("id", user.id)
    .single();

  if (!profile || !MESSENGER_USER_TYPES.includes(profile.user_type as MessengerUserType)) {
    throw new Error("Messenger is not available for this account.");
  }

  return {
    adminClient,
    profile: profile as MessengerProfile,
  };
}

async function getThreadMembershipOrThrow(
  adminClient: ReturnType<typeof createAdminClient>,
  threadId: string,
  userId: string
) {
  const { data: membership } = await adminClient
    .from("community_chat_members")
    .select("thread_id, user_id, role, joined_at, last_read_message_id, last_read_at")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    throw new Error("You do not have access to this conversation.");
  }

  return membership as MessengerMemberRow;
}

async function buildThreadSummaries(
  adminClient: ReturnType<typeof createAdminClient>,
  actorId: string
) {
  const { data: memberships } = await adminClient
    .from("community_chat_members")
    .select("thread_id, user_id, role, joined_at, last_read_message_id, last_read_at")
    .eq("user_id", actorId);

  const membershipRows = (memberships || []) as MessengerMemberRow[];
  const threadIds = membershipRows.map((row) => row.thread_id);

  if (threadIds.length === 0) {
    return [] as CommunityMessengerThread[];
  }

  const [{ data: threads }, { data: allMembers }, { data: allMessages }] = await Promise.all([
    adminClient
      .from("community_chat_threads")
      .select("id, thread_type, direct_key, name, created_by, created_at, updated_at, last_message_at")
      .in("id", threadIds)
      .order("last_message_at", { ascending: false }),
    adminClient
      .from("community_chat_members")
      .select("thread_id, user_id, role, joined_at, last_read_message_id, last_read_at")
      .in("thread_id", threadIds),
    adminClient
      .from("community_chat_messages")
      .select("id, thread_id, sender_id, body_encrypted, attachment_files, created_at, updated_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false })
      .limit(800),
  ]);

  const threadRows = (threads || []) as MessengerThreadRow[];
  const memberRows = (allMembers || []) as MessengerMemberRow[];
  const messageRows = (allMessages || []) as MessengerMessageRow[];

  const profileIds = Array.from(new Set(memberRows.map((row) => row.user_id)));
  const { data: profiles } = profileIds.length
    ? await adminClient
        .from("profiles")
        .select("id, first_name, last_name, email, avatar_url, department, unit, user_type")
        .in("id", profileIds)
    : { data: [] as MessengerProfile[] | null };

  const profileMap = new Map(
    ((profiles || []) as MessengerProfile[]).map((profile) => [profile.id, mapUser(profile)])
  );

  const membersByThread = new Map<string, MessengerMemberRow[]>();
  memberRows.forEach((member) => {
    const bucket = membersByThread.get(member.thread_id) || [];
    bucket.push(member);
    membersByThread.set(member.thread_id, bucket);
  });

  const messagesByThread = new Map<string, MessengerMessageRow[]>();
  messageRows.forEach((message) => {
    const bucket = messagesByThread.get(message.thread_id) || [];
    bucket.push(message);
    messagesByThread.set(message.thread_id, bucket);
  });

  return threadRows.map((thread) => {
    const threadMembers = membersByThread.get(thread.id) || [];
    const memberProfiles = threadMembers
      .map((member) => profileMap.get(member.user_id))
      .filter((item): item is CommunityMessengerUser => Boolean(item));
    const lastMessage = (messagesByThread.get(thread.id) || [])[0];
    const actorMembership = threadMembers.find((member) => member.user_id === actorId);
    const unreadCount = (messagesByThread.get(thread.id) || []).filter((message) => {
      if (message.sender_id === actorId) return false;
      if (!actorMembership?.last_read_at) return true;
      return new Date(message.created_at).getTime() > new Date(actorMembership.last_read_at).getTime();
    }).length;

    const directUser =
      thread.thread_type === "direct"
        ? memberProfiles.find((member) => member.id !== actorId) || null
        : null;

    return {
      id: thread.id,
      thread_type: thread.thread_type,
      name: thread.thread_type === "direct" ? directUser?.display_name || "Direct message" : thread.name || "Group chat",
      direct_user: directUser,
      members: memberProfiles,
      unread_count: unreadCount,
      last_message_at: thread.last_message_at,
      last_message_preview: messagePreview(lastMessage),
    } satisfies CommunityMessengerThread;
  });
}

export async function getCommunityMessengerBootstrap(): Promise<CommunityMessengerBootstrap> {
  const { adminClient, profile } = await getMessengerActor();
  const threads = await buildThreadSummaries(adminClient, profile.id);
  return { threads };
}

export async function ensureCommunityDirectThread(otherUserId: string) {
  const { adminClient, profile } = await getMessengerActor();

  if (!otherUserId || otherUserId === profile.id) {
    return { error: "Select another account to start a message." };
  }

  const { data: otherProfile } = await adminClient
    .from("profiles")
    .select("id, user_type")
    .eq("id", otherUserId)
    .single();

  if (!otherProfile || !MESSENGER_USER_TYPES.includes(otherProfile.user_type as MessengerUserType)) {
    return { error: "That account cannot be messaged from CQER Community." };
  }

  const directKey = directKeyFor(profile.id, otherUserId);

  const { data: existingThread } = await adminClient
    .from("community_chat_threads")
    .select("id")
    .eq("thread_type", "direct")
    .eq("direct_key", directKey)
    .maybeSingle();

  if (existingThread) {
    return { threadId: existingThread.id };
  }

  const { data: thread, error: threadError } = await adminClient
    .from("community_chat_threads")
    .insert({
      thread_type: "direct",
      direct_key: directKey,
      created_by: profile.id,
      name: null,
    })
    .select("id")
    .single();

  if (threadError || !thread) {
    return { error: threadError?.message || "Failed to start the conversation." };
  }

  const { error: membersError } = await adminClient.from("community_chat_members").insert([
    { thread_id: thread.id, user_id: profile.id, role: "owner", last_read_at: new Date().toISOString() },
    { thread_id: thread.id, user_id: otherUserId, role: "member" },
  ]);

  if (membersError) {
    return { error: membersError.message };
  }

  return { threadId: thread.id };
}

export async function createCommunityGroupThread(input: {
  name: string;
  memberIds: string[];
}) {
  const { adminClient, profile } = await getMessengerActor();
  const name = input.name.trim();
  const memberIds = Array.from(new Set([profile.id, ...(input.memberIds || []).filter(Boolean)]));

  if (!name) {
    return { error: "Enter a group name." };
  }

  if (memberIds.length < 3) {
    return { error: "Choose at least two other users for a group chat." };
  }

  const { data: validProfiles } = await adminClient
    .from("profiles")
    .select("id, user_type")
    .in("id", memberIds);

  const validMemberIds = new Set(
    ((validProfiles || []) as { id: string; user_type: string }[])
      .filter((item) => MESSENGER_USER_TYPES.includes(item.user_type as MessengerUserType))
      .map((item) => item.id)
  );

  if (!validMemberIds.has(profile.id) || validMemberIds.size !== memberIds.length) {
    return { error: "One or more selected users are not allowed in CQER Community messenger." };
  }

  const { data: thread, error: threadError } = await adminClient
    .from("community_chat_threads")
    .insert({
      thread_type: "group",
      direct_key: null,
      name,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (threadError || !thread) {
    return { error: threadError?.message || "Failed to create the group chat." };
  }

  const { error: membersError } = await adminClient.from("community_chat_members").insert(
    memberIds.map((memberId) => ({
      thread_id: thread.id,
      user_id: memberId,
      role: memberId === profile.id ? "owner" : "member",
      last_read_at: memberId === profile.id ? new Date().toISOString() : null,
    }))
  );

  if (membersError) {
    return { error: membersError.message };
  }

  return { threadId: thread.id };
}

export async function getCommunityThreadDetail(threadId: string): Promise<CommunityMessengerThreadDetail> {
  const { adminClient, profile } = await getMessengerActor();
  await getThreadMembershipOrThrow(adminClient, threadId, profile.id);

  const [{ data: thread }, { data: members }, { data: messages }] = await Promise.all([
    adminClient
      .from("community_chat_threads")
      .select("id, thread_type, direct_key, name, created_by, created_at, updated_at, last_message_at")
      .eq("id", threadId)
      .single(),
    adminClient
      .from("community_chat_members")
      .select("thread_id, user_id, role, joined_at, last_read_message_id, last_read_at")
      .eq("thread_id", threadId),
    adminClient
      .from("community_chat_messages")
      .select("id, thread_id, sender_id, body_encrypted, attachment_files, created_at, updated_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(150),
  ]);

  if (!thread) {
    throw new Error("Conversation not found.");
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
      ? memberRows.find((member) => member.user_id !== profile.id) || null
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
      } satisfies CommunityMessengerMessage;
    })
    .filter((item): item is CommunityMessengerMessage => Boolean(item));

  const lastMessage = normalizedMessages[normalizedMessages.length - 1] || null;
  const actorMembership = memberRows.find((member) => member.user_id === profile.id);
  const unreadCount = normalizedMessages.filter((message) => {
    if (message.sender_id === profile.id) return false;
    if (!actorMembership?.last_read_at) return true;
    return new Date(message.created_at).getTime() > new Date(actorMembership.last_read_at).getTime();
  }).length;

  const memberProfiles = memberRows
    .map((member) => profileMap.get(member.user_id))
    .filter((item): item is CommunityMessengerUser => Boolean(item));

  return {
    thread: {
      id: thread.id,
      thread_type: thread.thread_type,
      name:
        thread.thread_type === "direct"
          ? profileMap.get(otherMember?.user_id || "")?.display_name || "Direct message"
          : thread.name || "Group chat",
      direct_user: otherMember ? profileMap.get(otherMember.user_id) || null : null,
      members: memberProfiles,
      unread_count: unreadCount,
      last_message_at: lastMessage?.created_at || thread.last_message_at,
      last_message_preview: lastMessage
        ? previewFromContent(lastMessage.body, lastMessage.attachments)
        : "No messages yet",
    },
    messages: normalizedMessages,
    receipt: {
      other_user_id: otherMember?.user_id || null,
      last_read_at:
        thread.thread_type === "direct"
          ? (memberRows.find((member) => member.user_id !== profile.id)?.last_read_at || null)
          : null,
    },
  };
}

export async function markCommunityThreadRead(threadId: string) {
  const { adminClient, profile } = await getMessengerActor();
  const membership = await getThreadMembershipOrThrow(adminClient, threadId, profile.id);

  const { data: latestMessage } = await adminClient
    .from("community_chat_messages")
    .select("id, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestMessage || membership.last_read_message_id === latestMessage.id) {
    return { success: true };
  }

  const payload = {
    last_read_at: latestMessage.created_at,
    last_read_message_id: latestMessage?.id || null,
  };

  const { error } = await adminClient
    .from("community_chat_members")
    .update(payload)
    .eq("thread_id", threadId)
    .eq("user_id", profile.id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function sendCommunityMessage(input: {
  threadId: string;
  body?: string;
  attachments?: MessengerMessageAttachment[];
}) {
  const { adminClient, profile } = await getMessengerActor();
  await getThreadMembershipOrThrow(adminClient, input.threadId, profile.id);

  const body = (input.body || "").trim();
  const attachments = normalizeAttachments(input.attachments || []);

  if (!body && attachments.length === 0) {
    return { error: "Write a message or attach a PDF." };
  }

  const { data: message, error } = await adminClient
    .from("community_chat_messages")
    .insert({
      thread_id: input.threadId,
      sender_id: profile.id,
      body_encrypted: body ? encryptCommunityMessage(body) : null,
      attachment_files: attachments,
    })
    .select("id, created_at")
    .single();

  if (error || !message) {
    return { error: error?.message || "Failed to send the message." };
  }

  const [, { data: thread }, { data: members }] = await Promise.all([
    adminClient
      .from("community_chat_members")
      .update({
        last_read_at: message.created_at,
        last_read_message_id: message.id,
      })
      .eq("thread_id", input.threadId)
      .eq("user_id", profile.id),
    adminClient
      .from("community_chat_threads")
      .select("id, thread_type, name")
      .eq("id", input.threadId)
      .single(),
    adminClient
      .from("community_chat_members")
      .select("user_id")
      .eq("thread_id", input.threadId),
  ]);

  const recipientIds = ((members || []) as { user_id: string }[])
    .map((member) => member.user_id)
    .filter((memberId) => memberId !== profile.id);

  if (thread && recipientIds.length > 0) {
    const actorName = displayName(profile);
    await adminClient.from("notifications").insert(
      recipientIds.map((recipientId) => ({
        recipient_id: recipientId,
        actor_id: profile.id,
        actor_name: actorName,
        actor_avatar_url: profile.avatar_url,
        entity_table: "community_chat_messages",
        entity_id: message.id,
        entity_kind: "chat",
        entity_title:
          thread.thread_type === "group"
            ? thread.name || "Group chat"
            : "Direct message",
        action_type: "message_received",
        route: `/dashboard?panel=community&chat=${input.threadId}`,
      }))
    );
  }

  return {
    success: true,
    message: {
      id: message.id,
      thread_id: input.threadId,
      sender_id: profile.id,
      body,
      attachments,
      created_at: message.created_at,
      sender: mapUser(profile),
    } satisfies CommunityMessengerMessage,
    thread: {
      id: input.threadId,
      last_message_at: message.created_at,
      last_message_preview: previewFromContent(body, attachments),
      name:
        thread?.thread_type === "group"
          ? thread.name || "Group chat"
          : "Direct message",
    },
  };
}
