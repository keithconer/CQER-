"use client";

import * as React from "react";
import { Upload, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface FileUploadProps {
  value: { url: string; name: string }[];
  onChange: (value: { url: string; name: string }[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export function FileUpload({ value = [], onChange, disabled, maxFiles = 5 }: FileUploadProps) {
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
        .from("cqer-projects_pdfs")
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

    } catch (error: any) {
      console.error("Error uploading:", error);
      alert(error.message || "Upload failed");
      setUploading(false);
      setProgress(0);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const newDocs = [...value];
    newDocs.splice(index, 1);
    onChange(newDocs);
  };

  return (
    <div className="space-y-3">
      {/* List of uploaded files */}
      {value.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {value.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/30 group">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium truncate max-w-[200px]">{file.name}</span>
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
                disabled={disabled}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area - only show if under limit or uploading */}
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
            accept=".pdf"
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
