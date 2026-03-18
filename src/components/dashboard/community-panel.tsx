"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  BellRing,
  Globe2,
  MessageCircle,
  Pencil,
  Send,
  Share2,
  Trash2,
  Users2,
  Building2,
  Paperclip,
  FileText,
  ImageIcon,
  UserPlus2,
  MessagesSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addCommunityComment,
  createCommunityPost,
  deleteCommunityPost,
  type CommunityBootstrap,
  type CommunityComment,
  type CommunityPost,
  updateCommunityPost,
} from "@/lib/actions/community";
import { CommunityAttachmentUpload, type CommunityAttachmentInput } from "./community-attachment-upload";
import { DEPARTMENTS } from "@/lib/departments";
import { cn } from "@/lib/utils";

type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  department: string | null;
  userType: string;
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MentionSelector({
  users,
  selectedIds,
  onChange,
}: {
  users: CommunityBootstrap["mentionableUsers"];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((value) => value !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]">
          <UserPlus2 className="mr-1.5 h-3.5 w-3.5" />
          Tag Users
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command shouldFilter={false}>
          <CommandList className="max-h-64">
            <CommandEmpty className="py-4 text-[10px] text-muted-foreground">
              No users available.
            </CommandEmpty>
            <CommandGroup heading="Mention Users" className="[&_[cmdk-group-heading]]:text-[9px]">
              {users.map((user) => {
                const label = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "User";
                const selected = selectedIds.includes(user.id);
                return (
                  <CommandItem
                    key={user.id}
                    value={`${label} ${user.department || ""}`}
                    onSelect={() => toggle(user.id)}
                    className="px-2 py-2"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Avatar className="h-6 w-6 border border-border/40 shrink-0">
                        <AvatarImage src={user.avatar_url || undefined} alt={label} />
                        <AvatarFallback className="text-[8px]">
                          {`${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-medium">{label}</p>
                        <p className="truncate text-[9px] text-muted-foreground">
                          {user.department || "No department"}
                        </p>
                      </div>
                      {selected ? (
                        <Badge variant="outline" className="text-[8px]">
                          Tagged
                        </Badge>
                      ) : null}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AttachmentPreview({
  attachment,
}: {
  attachment: CommunityAttachmentInput;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const isImage = attachment.type.startsWith("image/");

  React.useEffect(() => {
    let active = true;
    if (!isImage) return;

    const loadPreview = async () => {
      const { data } = await supabase.storage
        .from("cqer-community")
        .createSignedUrl(attachment.path, 3600);
      if (active) {
        setPreviewUrl(data?.signedUrl || null);
      }
    };

    void loadPreview();

    return () => {
      active = false;
    };
  }, [attachment.path, isImage, supabase]);

  const openAttachment = async () => {
    const { data } = await supabase.storage
      .from("cqer-community")
      .createSignedUrl(attachment.path, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (isImage && previewUrl) {
    return (
      <button
        type="button"
        onClick={() => void openAttachment()}
        className="overflow-hidden rounded-xl border border-border/50 bg-muted/10 text-left w-fit max-w-[240px]"
      >
        <Image
          src={previewUrl}
          alt={attachment.name}
          width={240}
          height={240}
          unoptimized
          className="h-32 w-full object-cover"
        />
        <div className="flex items-center gap-2 px-3 py-2">
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate text-[10px] font-medium">{attachment.name}</span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void openAttachment()}
      className="flex w-fit max-w-[240px] items-center gap-2 rounded-xl border border-border/50 bg-muted/10 px-3 py-2 text-left"
    >
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium">{attachment.name}</p>
        <p className="text-[9px] text-muted-foreground">Open attachment</p>
      </div>
    </button>
  );
}

function CommentThread({
  comments,
  postId,
  onSubmit,
}: {
  comments: CommunityComment[];
  postId: string;
  onSubmit: (postId: string, content: string, parentId?: string) => void;
}) {
  const [replyDrafts, setReplyDrafts] = React.useState<Record<string, string>>({});
  const [openReplyId, setOpenReplyId] = React.useState<string | null>(null);

  if (comments.length === 0) {
    return <p className="text-[9px] text-muted-foreground">No comments yet.</p>;
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="space-y-2">
          <div className="flex gap-2">
            <Avatar className="h-7 w-7 border border-border/40">
              <AvatarImage src={comment.author.avatar_url || undefined} alt={comment.author.first_name || "User"} />
              <AvatarFallback className="text-[9px]">
                {`${comment.author.first_name?.[0] || ""}${comment.author.last_name?.[0] || ""}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 rounded-2xl bg-muted/35 px-3 py-2">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold">
                  {`${comment.author.first_name || ""} ${comment.author.last_name || ""}`.trim()}
                </p>
                <span className="text-[8px] text-muted-foreground">{formatTimestamp(comment.created_at)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[10px] leading-4">{comment.content}</p>
              <button
                type="button"
                className="mt-2 text-[9px] font-medium text-foreground hover:underline"
                onClick={() => setOpenReplyId((current) => (current === comment.id ? null : comment.id))}
              >
                Reply
              </button>
            </div>
          </div>

          {openReplyId === comment.id ? (
            <div className="ml-9 flex gap-2">
              <Input
                value={replyDrafts[comment.id] || ""}
                onChange={(event) =>
                  setReplyDrafts((current) => ({
                    ...current,
                    [comment.id]: event.target.value,
                  }))
                }
                placeholder="Write a reply..."
                className="h-8 text-[10px]"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 text-[10px]"
                onClick={() => {
                  onSubmit(postId, replyDrafts[comment.id] || "", comment.id);
                  setReplyDrafts((current) => ({ ...current, [comment.id]: "" }));
                  setOpenReplyId(null);
                }}
              >
                Send
              </Button>
            </div>
          ) : null}

          {comment.replies.length > 0 ? (
            <div className="ml-9 space-y-2">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-2">
                  <Avatar className="h-6 w-6 border border-border/40">
                    <AvatarImage src={reply.author.avatar_url || undefined} alt={reply.author.first_name || "User"} />
                    <AvatarFallback className="text-[8px]">
                      {`${reply.author.first_name?.[0] || ""}${reply.author.last_name?.[0] || ""}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 rounded-2xl bg-background px-3 py-2 shadow-sm ring-1 ring-border/40">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-semibold">
                        {`${reply.author.first_name || ""} ${reply.author.last_name || ""}`.trim()}
                      </p>
                      <span className="text-[8px] text-muted-foreground">{formatTimestamp(reply.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[10px] leading-4">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function CommunityPanel({
  currentUser,
  publicPosts,
  departmentPosts,
  mentionableUsers,
}: {
  currentUser: CurrentUser;
  publicPosts: CommunityPost[];
  departmentPosts: CommunityPost[];
  mentionableUsers: CommunityBootstrap["mentionableUsers"];
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [activeScope, setActiveScope] = React.useState<"ceit" | "department">("ceit");
  const [content, setContent] = React.useState("");
  const [visibility, setVisibility] = React.useState<"public" | "department">("public");
  const [targetDepartment, setTargetDepartment] = React.useState(currentUser.department || "");
  const [attachments, setAttachments] = React.useState<CommunityAttachmentInput[]>([]);
  const [mentionedUserIds, setMentionedUserIds] = React.useState<string[]>([]);
  const [editingPostId, setEditingPostId] = React.useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = React.useState<Record<string, string>>({});
  const [isComposerOpen, setIsComposerOpen] = React.useState(false);

  const visiblePosts = activeScope === "department" ? departmentPosts : publicPosts;

  const resetComposer = () => {
    setContent("");
    setVisibility("public");
    setTargetDepartment(currentUser.department || "");
    setAttachments([]);
    setMentionedUserIds([]);
    setEditingPostId(null);
    setIsComposerOpen(false);
  };

  const submitPost = () => {
    startTransition(async () => {
      const payload = {
        content,
        visibility,
        department: visibility === "department" ? targetDepartment : null,
        attachments,
        mentionedUserIds,
      };

      const response = editingPostId
        ? await updateCommunityPost({ postId: editingPostId, ...payload })
        : await createCommunityPost(payload);

      if (response && "error" in response) {
        alert(response.error);
        return;
      }

      resetComposer();
      router.refresh();
    });
  };

  const handleEdit = (post: CommunityPost) => {
    setEditingPostId(post.id);
    setContent(post.content);
    setVisibility(post.visibility);
    setTargetDepartment(post.department || currentUser.department || "");
    setAttachments(post.attachments);
    setMentionedUserIds(post.mentioned_users.map((user) => user.id));
    setIsComposerOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (postId: string) => {
    startTransition(async () => {
      const response = await deleteCommunityPost(postId);
      if (response && "error" in response) {
        alert(response.error);
        return;
      }
      if (editingPostId === postId) {
        resetComposer();
      }
      router.refresh();
    });
  };

  const handleComment = (postId: string, draft: string, parentId?: string) => {
    if (!draft.trim()) return;
    startTransition(async () => {
      const response = await addCommunityComment({
        postId,
        content: draft,
        parentId,
      });

      if (response && "error" in response) {
        alert(response.error);
        return;
      }

      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      router.refresh();
    });
  };

  const selectedMentionUsers = mentionableUsers.filter((user) => mentionedUserIds.includes(user.id));

  return (
    <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
      <Card className="border-border/50 bg-gradient-to-b from-[#0a421c] via-[#0f682c] to-[#159e44] text-white shadow-sm xl:sticky xl:top-4 xl:h-fit">
        <CardHeader className="space-y-1 pb-3">
          <CardTitle className="text-xs font-semibold">CQER Community</CardTitle>
          <p className="text-[10px] text-white/80">
            Share announcements, files, and updates with the CQER community.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <button
            type="button"
            onClick={() => setActiveScope("ceit")}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] transition-colors",
              activeScope === "ceit" ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Globe2 className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold truncate">CEIT</p>
              <p className="text-[9px] opacity-80 truncate">Public community announcements</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setActiveScope("department")}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[10px] transition-colors",
              activeScope === "department" ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold truncate">{currentUser.department || "Department"}</p>
              <p className="text-[9px] opacity-80 truncate">Department-only announcements</p>
            </div>
          </button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border border-border/40 shrink-0">
                <AvatarImage src={currentUser.avatarUrl || undefined} alt={currentUser.firstName} />
                <AvatarFallback className="text-[10px]">
                  {`${currentUser.firstName?.[0] || ""}${currentUser.lastName?.[0] || ""}`.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">What do you want to announce, {currentUser.firstName}?</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Publish to everyone or target a specific department.
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-0 pb-3">
            {!isComposerOpen ? (
              <button
                type="button"
                onClick={() => setIsComposerOpen(true)}
                className="flex min-h-[50px] w-full items-start rounded-md border border-border/50 bg-muted/20 p-3 text-[10px] text-muted-foreground transition-colors hover:bg-muted/30 text-left"
              >
                Share an update with the CQER community...
              </button>
            ) : (
             <div className="space-y-3">
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={`What do you want to announce, ${currentUser.firstName}?`}
                className="min-h-[80px] text-[10px] resize-none"
                autoFocus
              />

            <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold">Visibility</Label>
                <Select value={visibility} onValueChange={(val) => setVisibility(val as "public" | "department")}>
                  <SelectTrigger className="h-8 w-full text-[10px]">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public" className="text-[10px]"><span className="flex items-center gap-2"><Globe2 className="h-3 w-3" /> All (Public)</span></SelectItem>
                    <SelectItem value="department" className="text-[10px]"><span className="flex items-center gap-2"><Building2 className="h-3 w-3" /> Specific Department</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {visibility === "department" ? (
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold">Department</Label>
                  <Select value={targetDepartment} onValueChange={setTargetDepartment}>
                    <SelectTrigger className="h-8 w-full text-[10px]">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((department) => (
                        <SelectItem key={department} value={department} className="text-[10px]">
                          {department}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <MentionSelector
                users={mentionableUsers}
                selectedIds={mentionedUserIds}
                onChange={setMentionedUserIds}
              />
              <Badge variant="outline" className="text-[9px]">
                <BellRing className="mr-1 h-3 w-3" />
                Public posts notify all users
              </Badge>
            </div>

            {selectedMentionUsers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedMentionUsers.map((user) => (
                  <Badge key={user.id} variant="secondary" className="text-[9px]">
                    @{`${user.first_name || ""} ${user.last_name || ""}`.trim()}
                  </Badge>
                ))}
              </div>
            ) : null}

            <CommunityAttachmentUpload
              value={attachments}
              onChange={setAttachments}
              disabled={isPending}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                <MessagesSquare className="h-3.5 w-3.5" />
                Comments and replies are enabled on every announcement.
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[10px]"
                  onClick={resetComposer}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-[10px]"
                  onClick={submitPost}
                  disabled={isPending || (content.trim().length === 0 && attachments.length === 0)}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  {editingPostId ? "Save" : "Post"}
                </Button>
              </div>
            </div>
          </div>
          )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {visiblePosts.length === 0 ? (
            <Card className="border-border/50 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Users2 className="h-8 w-8 text-muted-foreground/60" />
                <p className="text-[11px] font-semibold">No announcements yet</p>
                <p className="max-w-md text-[10px] text-muted-foreground">
                  Start the conversation by posting the first update in CQER Community.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {visiblePosts.map((post) => {
            const canManage = post.author.id === currentUser.id;
            const departmentBadge =
              post.visibility === "public" ? "Public" : post.department || "Department";

            return (
              <Card key={post.id} className="border-border/50 shadow-sm">
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border/40">
                        <AvatarImage src={post.author.avatar_url || undefined} alt={post.author.first_name || "User"} />
                        <AvatarFallback className="text-[10px]">
                          {`${post.author.first_name?.[0] || ""}${post.author.last_name?.[0] || ""}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-[11px] font-semibold">
                            {`${post.author.first_name || ""} ${post.author.last_name || ""}`.trim()}
                          </p>
                          <Badge variant="outline" className="text-[8px]">
                            {departmentBadge}
                          </Badge>
                        </div>
                        <p className="text-[9px] text-muted-foreground">
                          {formatTimestamp(post.created_at)}
                          {post.edited_at ? " • edited" : ""}
                        </p>
                      </div>
                    </div>

                    {canManage ? (
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(post)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(post.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <p className="whitespace-pre-wrap text-[10px] leading-5 text-foreground/90">
                    {post.content}
                  </p>

                  {post.mentioned_users.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {post.mentioned_users.map((user) => (
                        <Badge key={user.id} variant="secondary" className="text-[9px]">
                          @{`${user.first_name || ""} ${user.last_name || ""}`.trim()}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {post.attachments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {post.attachments.map((attachment) => (
                        <AttachmentPreview key={attachment.path} attachment={attachment} />
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-center gap-4 border-y border-border/40 py-2 text-[9px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {post.comments.length} comments
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Share2 className="h-3.5 w-3.5" />
                      {post.visibility === "public" ? "Shared publicly" : "Department feed"}
                    </span>
                    {post.attachments.length > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Paperclip className="h-3.5 w-3.5" />
                        {post.attachments.length} attachment{post.attachments.length > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={commentDrafts[post.id] || ""}
                        onChange={(event) =>
                          setCommentDrafts((current) => ({
                            ...current,
                            [post.id]: event.target.value,
                          }))
                        }
                        placeholder="Write a comment..."
                        className="h-8 text-[10px]"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-[10px]"
                        onClick={() => handleComment(post.id, commentDrafts[post.id] || "")}
                        disabled={isPending}
                      >
                        Comment
                      </Button>
                    </div>

                    <CommentThread comments={post.comments} postId={post.id} onSubmit={handleComment} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
