"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type CommunityAttachment = {
  path: string;
  name: string;
  type: string;
};

type CommunityProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  department: string | null;
  unit: string | null;
  user_type:
    | "super_admin"
    | "college_coordinator"
    | "unit_coordinator"
    | "project_leader"
    | "extension_office";
};

type CommunityPostRow = {
  id: string;
  author_id: string;
  content: string;
  visibility: "public" | "department";
  department: string | null;
  attachment_files: CommunityAttachment[] | null;
  mentioned_user_ids: string[] | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
};

type CommunityCommentRow = {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
};

export type CommunityComment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  author: CommunityProfile;
  replies: CommunityComment[];
};

export type CommunityPost = {
  id: string;
  content: string;
  visibility: "public" | "department";
  department: string | null;
  attachments: CommunityAttachment[];
  mentioned_users: CommunityProfile[];
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  author: CommunityProfile;
  comments: CommunityComment[];
};

export type CommunityBootstrap = {
  publicPosts: CommunityPost[];
  departmentPosts: CommunityPost[];
  mentionableUsers: CommunityProfile[];
};

function normalizeAttachments(value: unknown): CommunityAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const path = typeof (item as { path?: unknown }).path === "string" ? (item as { path: string }).path : "";
      const name = typeof (item as { name?: unknown }).name === "string" ? (item as { name: string }).name : "";
      const type = typeof (item as { type?: unknown }).type === "string" ? (item as { type: string }).type : "application/octet-stream";
      if (!path || !name) return null;
      return { path, name, type };
    })
    .filter((item): item is CommunityAttachment => Boolean(item));
}

function profileName(profile: Pick<CommunityProfile, "first_name" | "last_name">) {
  return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "CQER User";
}

function excerpt(content: string) {
  const trimmed = content.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed || "Community post";
}

function buildCommentTree(
  comments: CommunityCommentRow[],
  profileMap: Map<string, CommunityProfile>
) {
  const byParent = new Map<string | null, CommunityComment[]>();

  comments.forEach((comment) => {
    const author = profileMap.get(comment.author_id);
    if (!author) return;

    const normalized: CommunityComment = {
      id: comment.id,
      post_id: comment.post_id,
      parent_id: comment.parent_id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      edited_at: comment.edited_at,
      author,
      replies: [],
    };

    const bucket = byParent.get(comment.parent_id) || [];
    bucket.push(normalized);
    byParent.set(comment.parent_id, bucket);
  });

  const attachReplies = (nodes: CommunityComment[]): CommunityComment[] =>
    nodes.map((node) => ({
      ...node,
      replies: attachReplies(byParent.get(node.id) || []),
    }));

  return attachReplies(byParent.get(null) || []);
}

function buildPosts(
  posts: CommunityPostRow[],
  comments: CommunityCommentRow[],
  profiles: CommunityProfile[]
) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const commentsByPost = new Map<string, CommunityCommentRow[]>();

  comments.forEach((comment) => {
    const bucket = commentsByPost.get(comment.post_id) || [];
    bucket.push(comment);
    commentsByPost.set(comment.post_id, bucket);
  });

  return posts
    .map((post) => {
      const author = profileMap.get(post.author_id);
      if (!author) return null;

      return {
        id: post.id,
        content: post.content,
        visibility: post.visibility,
        department: post.department,
        attachments: normalizeAttachments(post.attachment_files),
        mentioned_users: (post.mentioned_user_ids || [])
          .map((id) => profileMap.get(id))
          .filter((item): item is CommunityProfile => Boolean(item)),
        created_at: post.created_at,
        updated_at: post.updated_at,
        edited_at: post.edited_at,
        author,
        comments: buildCommentTree(commentsByPost.get(post.id) || [], profileMap),
      } satisfies CommunityPost;
    })
    .filter((post): post is CommunityPost => Boolean(post));
}

async function getCurrentActor() {
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

  if (!profile) {
    throw new Error("Profile not found.");
  }

  return {
    adminClient,
    user,
    profile: profile as CommunityProfile,
  };
}

async function sendPostNotifications(params: {
  adminClient: ReturnType<typeof createAdminClient>;
  actor: CommunityProfile;
  postId: string;
  content: string;
  visibility: "public" | "department";
  department: string | null;
  mentionedUserIds: string[];
}) {
  const { adminClient, actor, postId, content, visibility, department, mentionedUserIds } = params;
  const actorName = profileName(actor);
  const mentionedSet = new Set(mentionedUserIds.filter((id) => id !== actor.id));
  const route = "/dashboard?panel=community";
  const title = excerpt(content);

  let recipientQuery = adminClient
    .from("profiles")
    .select("id")
    .neq("id", actor.id)
    .in("user_type", ["super_admin", "college_coordinator", "unit_coordinator", "project_leader", "extension_office"]);

  if (visibility === "department" && department) {
    recipientQuery = recipientQuery.eq("department", department);
  }

  const { data: recipients } = await recipientQuery;
  const recipientIds = (recipients || []).map((entry) => entry.id as string);

  const rows = recipientIds
    .filter((recipientId) => !mentionedSet.has(recipientId))
    .map((recipientId) => ({
      recipient_id: recipientId,
      actor_id: actor.id,
      actor_name: actorName,
      actor_avatar_url: actor.avatar_url,
      entity_table: "community_posts",
      entity_id: postId,
      entity_kind: "announcement",
      entity_title: title,
      action_type: "community_post",
      route,
    }));

  const mentionRows = Array.from(mentionedSet).map((recipientId) => ({
    recipient_id: recipientId,
    actor_id: actor.id,
    actor_name: actorName,
    actor_avatar_url: actor.avatar_url,
    entity_table: "community_posts",
    entity_id: postId,
    entity_kind: "announcement",
    entity_title: title,
    action_type: "mentioned",
    route,
  }));

  const allRows = [...rows, ...mentionRows];
  if (allRows.length > 0) {
    await adminClient.from("notifications").insert(allRows);
  }
}

async function sendCommentNotifications(params: {
  adminClient: ReturnType<typeof createAdminClient>;
  actor: CommunityProfile;
  commentId: string;
  content: string;
  postAuthorId: string;
  parentAuthorId?: string | null;
}) {
  const { adminClient, actor, commentId, content, postAuthorId, parentAuthorId } = params;
  const actorName = profileName(actor);
  const route = "/dashboard?panel=community";
  const title = excerpt(content);
  const rows: {
    recipient_id: string;
    actor_id: string;
    actor_name: string;
    actor_avatar_url: string | null;
    entity_table: string;
    entity_id: string;
    entity_kind: string;
    entity_title: string;
    action_type: string;
    route: string;
  }[] = [];

  if (postAuthorId !== actor.id) {
    rows.push({
      recipient_id: postAuthorId,
      actor_id: actor.id,
      actor_name: actorName,
      actor_avatar_url: actor.avatar_url,
      entity_table: "community_comments",
      entity_id: commentId,
      entity_kind: "community_comment",
      entity_title: title,
      action_type: "commented",
      route,
    });
  }

  if (parentAuthorId && parentAuthorId !== actor.id && parentAuthorId !== postAuthorId) {
    rows.push({
      recipient_id: parentAuthorId,
      actor_id: actor.id,
      actor_name: actorName,
      actor_avatar_url: actor.avatar_url,
      entity_table: "community_comments",
      entity_id: commentId,
      entity_kind: "community_comment",
      entity_title: title,
      action_type: "replied",
      route,
    });
  }

  if (rows.length > 0) {
    await adminClient.from("notifications").insert(rows);
  }
}

export async function getCommunityBootstrap(viewerDepartment: string | null): Promise<CommunityBootstrap> {
  const adminClient = createAdminClient();

  const [publicPostsResult, departmentPostsResult, profilesResult] = await Promise.all([
    adminClient
      .from("community_posts")
      .select("id, author_id, content, visibility, department, attachment_files, mentioned_user_ids, created_at, updated_at, edited_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(40),
    viewerDepartment
      ? adminClient
          .from("community_posts")
          .select("id, author_id, content, visibility, department, attachment_files, mentioned_user_ids, created_at, updated_at, edited_at")
          .eq("visibility", "department")
          .eq("department", viewerDepartment)
          .order("created_at", { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as CommunityPostRow[] | null, error: null }),
    adminClient
      .from("profiles")
      .select("id, first_name, last_name, email, avatar_url, department, unit, user_type")
      .in("user_type", ["super_admin", "college_coordinator", "unit_coordinator", "project_leader", "extension_office"])
      .order("first_name", { ascending: true }),
  ]);

  const combinedPostIds = Array.from(
    new Set([
      ...((publicPostsResult.data || []).map((post) => post.id)),
      ...((departmentPostsResult.data || []).map((post) => post.id)),
    ])
  );

  const { data: commentsData } = combinedPostIds.length
    ? await adminClient
        .from("community_comments")
        .select("id, post_id, parent_id, author_id, content, created_at, updated_at, edited_at")
        .in("post_id", combinedPostIds)
        .order("created_at", { ascending: true })
    : { data: [] as CommunityCommentRow[] | null };

  const profiles = (profilesResult.data || []) as CommunityProfile[];

  return {
    publicPosts: buildPosts((publicPostsResult.data || []) as CommunityPostRow[], (commentsData || []) as CommunityCommentRow[], profiles),
    departmentPosts: buildPosts((departmentPostsResult.data || []) as CommunityPostRow[], (commentsData || []) as CommunityCommentRow[], profiles),
    mentionableUsers: profiles,
  };
}

export async function createCommunityPost(input: {
  content: string;
  visibility: "public" | "department";
  department?: string | null;
  attachments?: CommunityAttachment[];
  mentionedUserIds?: string[];
}) {
  const { adminClient, profile } = await getCurrentActor();
  const content = input.content.trim();
  const attachments = input.attachments || [];
  const mentionedUserIds = Array.from(new Set((input.mentionedUserIds || []).filter(Boolean)));

  if (!content && attachments.length === 0) {
    return { error: "Write an announcement or attach a file." };
  }

  const department = input.visibility === "department" ? (input.department || profile.department) : null;
  if (input.visibility === "department" && !department) {
    return { error: "Select a department for this announcement." };
  }

  const { data: post, error } = await adminClient
    .from("community_posts")
    .insert({
      author_id: profile.id,
      content,
      visibility: input.visibility,
      department,
      attachment_files: attachments,
      mentioned_user_ids: mentionedUserIds,
    })
    .select("id")
    .single();

  if (error || !post) {
    return { error: error?.message || "Failed to publish announcement." };
  }

  await sendPostNotifications({
    adminClient,
    actor: profile,
    postId: post.id,
    content,
    visibility: input.visibility,
    department,
    mentionedUserIds,
  });

  return { success: true };
}

export async function updateCommunityPost(input: {
  postId: string;
  content: string;
  visibility: "public" | "department";
  department?: string | null;
  attachments?: CommunityAttachment[];
  mentionedUserIds?: string[];
}) {
  const { adminClient, profile } = await getCurrentActor();
  const attachments = input.attachments || [];
  const content = input.content.trim();
  const department = input.visibility === "department" ? (input.department || profile.department) : null;

  const { data: existingPost } = await adminClient
    .from("community_posts")
    .select("author_id")
    .eq("id", input.postId)
    .single();

  if (!existingPost || existingPost.author_id !== profile.id) {
    return { error: "You can only edit your own post." };
  }

  const mentionedUserIds = Array.from(new Set((input.mentionedUserIds || []).filter(Boolean)));

  const { error } = await adminClient
    .from("community_posts")
    .update({
      content,
      visibility: input.visibility,
      department,
      attachment_files: attachments,
      mentioned_user_ids: mentionedUserIds,
    })
    .eq("id", input.postId);

  if (error) {
    return { error: error.message };
  }

  await sendPostNotifications({
    adminClient,
    actor: profile,
    postId: input.postId,
    content,
    visibility: input.visibility,
    department,
    mentionedUserIds,
  });

  return { success: true };
}

export async function deleteCommunityPost(postId: string) {
  const { adminClient, profile } = await getCurrentActor();

  const { data: existingPost } = await adminClient
    .from("community_posts")
    .select("author_id")
    .eq("id", postId)
    .single();

  if (!existingPost || existingPost.author_id !== profile.id) {
    return { error: "You can only delete your own post." };
  }

  const { error } = await adminClient
    .from("community_posts")
    .delete()
    .eq("id", postId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function addCommunityComment(input: {
  postId: string;
  parentId?: string | null;
  content: string;
}) {
  const { adminClient, profile } = await getCurrentActor();
  const content = input.content.trim();

  if (!content) {
    return { error: "Comment cannot be empty." };
  }

  const { data: post } = await adminClient
    .from("community_posts")
    .select("id, author_id")
    .eq("id", input.postId)
    .single();

  if (!post) {
    return { error: "Post not found." };
  }

  let parentAuthorId: string | null = null;
  if (input.parentId) {
    const { data: parentComment } = await adminClient
      .from("community_comments")
      .select("id, author_id")
      .eq("id", input.parentId)
      .single();
    parentAuthorId = parentComment?.author_id || null;
  }

  const { data: comment, error } = await adminClient
    .from("community_comments")
    .insert({
      post_id: input.postId,
      parent_id: input.parentId || null,
      author_id: profile.id,
      content,
    })
    .select("id")
    .single();

  if (error || !comment) {
    return { error: error?.message || "Failed to add comment." };
  }

  await sendCommentNotifications({
    adminClient,
    actor: profile,
    commentId: comment.id,
    content,
    postAuthorId: post.author_id,
    parentAuthorId,
  });

  return { success: true };
}
