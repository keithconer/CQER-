"use client";

import * as React from "react";
import {
  CheckCircle2,
  Cloud,
  Database,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { HttpResponseErrorDialog } from "@/components/http-response-error-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  buildHttpResponseErrorPayload,
  HttpResponseError,
  isHttpResponseErrorPayload,
  type HttpResponseErrorPayload,
  type HttpResponseStatus,
} from "@/lib/http-response-error";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getCloudinaryDownloadUrl } from "@/lib/actions/cloudinary";
import { getSignedStorageUrl } from "@/lib/actions/storage";
import {
  DEFAULT_DOCUMENT_ACCEPT,
  DEFAULT_DOCUMENT_LABEL,
  getDocumentTypeLabel,
  isAcceptedDocumentFile,
  isCloudinaryDocumentUrl,
  isCloudinaryPrivateReference,
  type UploadedDocument,
  type UploadGuidance,
} from "@/lib/document-uploads";

interface FileUploadProps {
  value: UploadedDocument[];
  onChange: (value: UploadedDocument[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  bucket?: string;
  accept?: string;
  maxSizeInMB?: number;
  guidance?: UploadGuidance;
}

export function FileUpload({
  value = [],
  onChange,
  disabled,
  maxFiles = 5,
  bucket = "cqer-projects_pdfs",
  accept,
  maxSizeInMB = 5,
  guidance,
}: FileUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [openingIndex, setOpeningIndex] = React.useState<number | null>(null);
  const [httpError, setHttpError] = React.useState<HttpResponseErrorPayload | null>(null);
  const [errorRetryAction, setErrorRetryAction] = React.useState<(() => void) | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const supabase = React.useMemo(() => createClient(), []);

  const retryFileSelection = React.useCallback(() => {
    setHttpError(null);
    setErrorRetryAction(null);
    fileInputRef.current?.click();
  }, []);

  const showHttpError = React.useCallback(
    (payload: HttpResponseErrorPayload, retryAction?: (() => void) | null) => {
      setHttpError(payload);
      setErrorRetryAction(() => retryAction || null);
    },
    []
  );

  const showMappedError = React.useCallback(
    (status: HttpResponseStatus, error: string, retryAction?: (() => void) | null) => {
      showHttpError(buildHttpResponseErrorPayload(status, error), retryAction);
    },
    [showHttpError]
  );

  const uploadViaCloudinaryFallback = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", bucket);
    formData.append("maxSizeInMB", String(maxSizeInMB));

    const response = await fetch("/api/uploads/cloudinary", {
      method: "POST",
      body: formData,
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (
      !response.ok ||
      !payload ||
      typeof payload !== "object" ||
      !("file" in payload) ||
      !(payload as { file?: UploadedDocument }).file
    ) {
      if (isHttpResponseErrorPayload(payload)) {
        throw new HttpResponseError(payload);
      }

      const fallbackStatus = [400, 401, 403, 404, 408, 500, 501, 502, 503, 504].includes(response.status)
        ? (response.status as HttpResponseStatus)
        : 500;
      const fallbackMessage =
        payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : "Cloudinary fallback upload failed.";

      throw new HttpResponseError(buildHttpResponseErrorPayload(fallbackStatus, fallbackMessage));
    }

    return (payload as { file: UploadedDocument }).file;
  };

  const uploadSingleFile = async (file: File, userId: string) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert: false,
        cacheControl: "3600",
      });

    if (!uploadError) {
      return { file: { url: filePath, name: file.name }, provider: "supabase" as const };
    }

    console.warn(`Supabase upload failed for ${file.name}. Falling back to Cloudinary.`, uploadError);
    const cloudinaryFile = await uploadViaCloudinaryFallback(file);
    return { file: cloudinaryFile, provider: "cloudinary" as const };
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const availableSlots = Math.max(maxFiles - value.length, 0);
    if (availableSlots <= 0) {
      showMappedError(400, `Maximum of ${maxFiles} files allowed.`, retryFileSelection);
      return;
    }

    const files = selectedFiles.slice(0, availableSlots);
    if (selectedFiles.length > availableSlots) {
      showMappedError(
        400,
        `Only ${availableSlots} more file${availableSlots === 1 ? "" : "s"} can be added right now.`,
        retryFileSelection
      );
    }

    const invalidType = files.find((file) => !isAcceptedDocumentFile(file));
    if (invalidType) {
      showMappedError(
        400,
        `"${invalidType.name}" is not supported. Please upload ${DEFAULT_DOCUMENT_LABEL} files only.`,
        retryFileSelection
      );
      return;
    }

    const oversizedFile = files.find((file) => file.size > maxSizeInMB * 1024 * 1024);
    if (oversizedFile) {
      showMappedError(
        400,
        `"${oversizedFile.name}" is too large. File size must be less than ${maxSizeInMB}MB.`,
        retryFileSelection
      );
      return;
    }

    try {
      setUploading(true);
      setProgress(5);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadedFiles: UploadedDocument[] = [];
      const failedFiles: string[] = [];
      let firstHttpError: HttpResponseErrorPayload | null = null;

      for (const [index, file] of files.entries()) {
        try {
          const result = await uploadSingleFile(file, user.id);
          uploadedFiles.push(result.file);
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          failedFiles.push(file.name);
          if (error instanceof HttpResponseError && !firstHttpError) {
            firstHttpError = {
              error: error.message,
              status: error.status,
              title: error.title,
              description: error.description,
              imageSrc: error.imageSrc,
              tone: error.tone,
            };
          }
        } finally {
          setProgress(Math.round(((index + 1) / files.length) * 100));
        }
      }

      if (uploadedFiles.length > 0) {
        onChange([...value, ...uploadedFiles]);
      }

      if (failedFiles.length > 0) {
        const failureLabel = failedFiles.length === 1 ? "file" : "files";
        if (firstHttpError) {
          throw new HttpResponseError({
            ...firstHttpError,
            error:
              failedFiles.length === 1
                ? firstHttpError.error
                : `${firstHttpError.error} Failed files: ${failedFiles.join(", ")}`,
          });
        }

        throw new HttpResponseError(
          buildHttpResponseErrorPayload(
            500,
            `The following ${failureLabel} could not be uploaded: ${failedFiles.join(", ")}`
          )
        );
      }

      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    } catch (error: unknown) {
      console.error("Error uploading:", error);
      if (error instanceof HttpResponseError) {
        showHttpError({
          error: error.message,
          status: error.status,
          title: error.title,
          description: error.description,
          imageSrc: error.imageSrc,
          tone: error.tone,
        }, retryFileSelection);
      } else {
        showMappedError(500, error instanceof Error ? error.message : "Upload failed.", retryFileSelection);
      }
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

  const handleOpen = async (file: UploadedDocument, index: number) => {
    setOpeningIndex(index);
    try {
      if (isCloudinaryPrivateReference(file.url)) {
        const downloadUrl = await getCloudinaryDownloadUrl(file.url);
        if (!downloadUrl) {
          showMappedError(404, "Could not generate a link for this backup file. Please try again.");
          return;
        }

        window.open(downloadUrl, "_blank", "noopener,noreferrer");
        return;
      }

      if (file.url.startsWith("http")) {
        window.open(file.url, "_blank", "noopener,noreferrer");
        return;
      }

      const signedUrl = await getSignedStorageUrl(bucket, file.url);

      if (!signedUrl) {
        showMappedError(404, "Could not generate a link for this file. Please try again.");
        return;
      }

      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      showMappedError(500, error instanceof Error ? error.message : "Something went wrong opening the file.");
    } finally {
      setOpeningIndex(null);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {value.length > 0 && (
          <div className="grid grid-cols-1 gap-2">
            {value.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 border rounded-lg bg-muted/30 group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                    {getDocumentTypeLabel(file.name) === "Excel" ? (
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
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
                    <div className="flex flex-wrap items-center gap-2 text-[9px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-2 w-2 text-green-500" />
                        Uploaded
                      </span>
                      <span className="flex items-center gap-1">
                        {isCloudinaryDocumentUrl(file.url) ? (
                          <>
                            <Cloud className="h-2.5 w-2.5" />
                            Backup storage
                          </>
                        ) : (
                          <>
                            <Database className="h-2.5 w-2.5" />
                            Primary storage
                          </>
                        )}
                      </span>
                    </div>
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
              accept={accept || DEFAULT_DOCUMENT_ACCEPT}
              className="hidden"
              disabled={disabled || uploading}
              multiple={maxFiles > 1}
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
                    {value.length > 0 ? "Add another file" : "Click to upload files"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{DEFAULT_DOCUMENT_LABEL} (Max {maxSizeInMB}MB each)</p>
                </div>
              </>
            )}
          </div>
        )}

        {guidance ? (
          <Card className="border-border/50 bg-muted/15 shadow-none">
            <CardContent className="space-y-3 p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">{guidance.title || "Upload guidance"}</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {guidance.description || "Upload PDF or Excel records. Supabase is used first, and Cloudinary becomes the backup if primary storage cannot accept the file."}
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Accepted formats: {DEFAULT_DOCUMENT_LABEL}. Files already stored in Supabase will stay there, while overflow or failed storage uploads can continue through secured backup storage.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {guidance.sections.map((section, sectionIndex) => (
                  <div key={`${section.title || "section"}-${sectionIndex}`} className="rounded-lg border border-border/50 bg-background/80 p-3">
                    {section.title ? (
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.title}
                      </p>
                    ) : null}
                    <ul className="space-y-1.5">
                      {section.items.map((item, itemIndex) => (
                        <li key={`${item}-${itemIndex}`} className="flex items-start gap-2 text-xs text-foreground">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/70" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <HttpResponseErrorDialog
        error={httpError}
        open={Boolean(httpError)}
        onOpenChange={(open) => {
          if (!open) {
            setHttpError(null);
            setErrorRetryAction(null);
          }
        }}
        onRetry={httpError && errorRetryAction ? errorRetryAction : undefined}
      />
    </>
  );
}
