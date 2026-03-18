"use client";

import * as React from "react";
import { FileText, Loader2, Paperclip, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CommunityAttachmentInput = {
  path: string;
  name: string;
  type: string;
};

const BUCKET = "cqer-community";
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function CommunityAttachmentUpload({
  value,
  onChange,
  disabled,
}: {
  value: CommunityAttachmentInput[];
  onChange: (next: CommunityAttachmentInput[]) => void;
  disabled?: boolean;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const invalid = files.find((file) => !ACCEPTED_TYPES.includes(file.type));
    if (invalid) {
      alert("Only PDF, DOC, and DOCX files are allowed.");
      return;
    }

    const oversized = files.find((file) => file.size > 8 * 1024 * 1024);
    if (oversized) {
      alert("Each file must be less than 8MB.");
      return;
    }

    try {
      setUploading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const uploaded: CommunityAttachmentInput[] = [];
      for (const file of files) {
        const extension = file.name.split(".").pop();
        const fileName = `${Math.random().toString(36).slice(2)}-${Date.now()}.${extension}`;
        const filePath = `${user.id}/${fileName}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (error) throw error;

        uploaded.push({
          path: filePath,
          name: file.name,
          type: file.type || "application/octet-stream",
        });
      }

      onChange([...value, ...uploaded]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      alert(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAttachment = (path: string) => {
    onChange(value.filter((attachment) => attachment.path !== path));
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx"
        onChange={handleUpload}
        disabled={disabled || uploading}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className={cn(
          "inline-flex w-auto items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-3 text-[10px] text-muted-foreground transition-colors",
          disabled || uploading ? "cursor-not-allowed opacity-60" : "hover:bg-muted/35"
        )}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? "Uploading attachments..." : "Attach PDF, DOC, or DOCX"}
      </button>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((attachment) => {
            return (
              <div
                key={attachment.path}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-background px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className="rounded-md bg-muted/40 p-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium">{attachment.name}</p>
                    <p className="text-[9px] text-muted-foreground">Document attachment</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeAttachment(attachment.path)}
                  disabled={disabled || uploading}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <Paperclip className="h-3 w-3" />
        Up to 8MB per file.
      </div>
    </div>
  );
}
