"use client";

import * as React from "react";
import { Upload, FileText, X, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getSignedStorageUrl } from "@/lib/actions/storage";

interface FileUploadProps {
  value: { url: string; name: string }[];
  onChange: (value: { url: string; name: string }[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  bucket?: string;
  accept?: string;
}

export function FileUpload({ value = [], onChange, disabled, maxFiles = 5, bucket = "cqer-projects_pdfs", accept }: FileUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [openingIndex, setOpeningIndex] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const supabase = React.useMemo(() => createClient(), []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB.");
      return;
    }

    if (value.length >= maxFiles) {
      alert(`Maximum of ${maxFiles} files allowed.`);
      return;
    }

    try {
      setUploading(true);
      setProgress(10);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      setProgress(100);

      const newDocs = [...value, { url: filePath, name: file.name }];
      onChange(newDocs);

      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Upload failed";
      console.error("Error uploading:", error);
      alert(message);
      setUploading(false);
      setProgress(0);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newDocs = value.filter((_, i) => i !== index);
    onChange(newDocs);
  };

  const handleOpen = async (file: { url: string; name: string }, index: number) => {
    setOpeningIndex(index);
    try {
      // If the url is already a full http URL (legacy), open directly
      if (file.url.startsWith("http")) {
        window.open(file.url, "_blank", "noopener,noreferrer");
        return;
      }

      // Use server action with service role to reliably create signed URL
      const signedUrl = await getSignedStorageUrl(bucket, file.url);

      if (!signedUrl) {
        alert("Could not generate a link for this file. Please try again.");
        return;
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      alert("Something went wrong opening the file.");
    } finally {
      setOpeningIndex(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* List of uploaded files */}
      {value.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {value.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/30 group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col min-w-0">
                  <button
                    type="button"
                    onClick={() => void handleOpen(file, index)}
                    disabled={openingIndex === index}
                    className="flex items-center gap-1 text-left text-xs font-medium truncate max-w-[200px] hover:text-primary hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Open ${file.name}`}
                  >
                    <span className="truncate">{file.name}</span>
                    {openingIndex === index ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0 text-muted-foreground" />
                    ) : (
                      <ExternalLink className="h-2.5 w-2.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-2 w-2 text-green-500" /> Uploaded
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeFile(index)}
                disabled={disabled || uploading}
                className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {(value.length < maxFiles || uploading) && (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer",
            disabled || uploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 hover:bg-muted/50",
            "border-muted"
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={accept || ".pdf"}
            className="hidden"
            disabled={disabled || uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 w-full max-w-[200px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-[10px] font-medium text-muted-foreground text-center">Uploading... {progress}%</p>
              <Progress value={progress} className="h-1" />
            </div>
          ) : (
            <>
              <div className="p-1.5 rounded-full bg-muted">
                <Upload className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium">
                  {value.length > 0 ? "Add another copy" : "Click to upload copies"}
                </p>
                <p className="text-[9px] text-muted-foreground">PDF (Max 5MB each)</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
