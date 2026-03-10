"use client";

import * as React from "react";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface DocumentPreviewProps {
  documents: { url: string; name: string }[] | null | undefined;
}

const BUCKET = "cqer-projects_pdfs";

export function DocumentPreview({ documents }: DocumentPreviewProps) {
  const [loadingUrl, setLoadingUrl] = React.useState<string | null>(null);

  const handleOpen = async (url: string) => {
    if (!url) return;
    setLoadingUrl(url);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(url, 3600);

      if (error) {
        console.error("Error creating signed URL:", error);
        alert("Error opening document.");
        return;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoadingUrl(null);
    }
  };

  if (!documents || documents.length === 0) return <span className="text-muted-foreground">-</span>;

  return (
    <div className="flex flex-col gap-1 max-w-[200px]">
      {documents.map((doc, idx) => (
        <button
          key={`${doc.url}-${idx}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpen(doc.url);
          }}
          disabled={loadingUrl === doc.url}
          className="flex items-center gap-1.5 text-[10px] text-primary hover:text-primary/80 transition-colors group text-left disabled:opacity-50"
        >
          <FileText className="h-3 w-3 shrink-0" />
          <span className="truncate group-hover:underline" title={doc.name}>
            {doc.name}
          </span>
          {loadingUrl === doc.url ? (
            <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />
          ) : (
            <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}
