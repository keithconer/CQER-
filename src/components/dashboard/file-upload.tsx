"use client";

import * as React from "react";
import { Upload, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface FileUploadProps {
  value?: { url: string; name: string } | null;
  onChange: (value: { url: string; name: string } | null) => void;
  disabled?: boolean;
}

export function FileUpload({ value, onChange, disabled }: FileUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const supabase = createClient();

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

    try {
      setUploading(true);
      setProgress(10);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Path: userId/uuid-filename.pdf
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("cqer-projects_pdfs")
        .upload(filePath, file, {
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      setProgress(90);

      const { data: { publicUrl } } = supabase.storage
        .from("cqer-projects_pdfs")
        .getPublicUrl(filePath);

      onChange({ url: filePath, name: file.name });
      setProgress(100);
      
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);

    } catch (error: any) {
      console.error("Error uploading:", error);
      alert(error.message || "Upload failed");
      setUploading(false);
      setProgress(0);
    }
  };

  const removeFile = async () => {
    if (!value?.url) return;
    
    // We don't delete from storage immediately to allow cancellation
    // But in a real app, we might want to cleanup orphaned files later
    onChange(null);
  };

  return (
    <div className="space-y-3">
      {!value ? (
        <div
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer",
            disabled || uploading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50 hover:bg-muted/50",
            "border-muted"
          )}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
            disabled={disabled || uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Uploading... {progress}%</p>
              <Progress value={progress} className="w-32 h-1" />
            </div>
          ) : (
            <>
              <div className="p-2 rounded-full bg-muted">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Click to upload copies</p>
                <p className="text-[10px] text-muted-foreground">PDF only (Max 5MB)</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium truncate max-w-[200px]">{value.name}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5 text-green-500" /> Uploaded
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={removeFile}
            disabled={disabled}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
