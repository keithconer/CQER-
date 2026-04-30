import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { signCloudinaryParams, getCloudinaryConfig } from "@/lib/cloudinary";
import {
  createCloudinaryPrivateReference,
  getFileExtension,
  isAcceptedDocumentFile,
} from "@/lib/document-uploads";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function sanitizeTag(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized upload request." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const bucket = String(formData.get("bucket") || "cqer-projects_pdfs");
    const maxSizeInMB = Number(formData.get("maxSizeInMB") || 5);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No upload file was received." }, { status: 400 });
    }

    if (!isAcceptedDocumentFile(file)) {
      return NextResponse.json({ error: "Only PDF, XLS, and XLSX files are allowed." }, { status: 400 });
    }

    if (!Number.isFinite(maxSizeInMB) || maxSizeInMB <= 0 || maxSizeInMB > 10) {
      return NextResponse.json({ error: "Invalid upload size limit." }, { status: 400 });
    }

    if (file.size > maxSizeInMB * 1024 * 1024) {
      return NextResponse.json({ error: `File size must be less than ${maxSizeInMB}MB.` }, { status: 400 });
    }

    const extension = getFileExtension(file.name);
    if (!extension) {
      return NextResponse.json({ error: "The file must include an extension." }, { status: 400 });
    }

    const cloudinary = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const publicId = `${crypto.randomUUID()}${extension}`;
    const safeDisplayName = file.name.replace(/[\\/]/g, "-");
    const tags = [
      "cqer",
      "backup-storage",
      sanitizeTag(bucket),
      sanitizeTag(user.id),
    ].join(",");

    const paramsToSign = {
      folder: cloudinary.uploadFolder,
      public_id: publicId,
      tags,
      timestamp,
      type: "private",
      use_filename_as_display_name: "true",
    };

    const signature = signCloudinaryParams(paramsToSign);
    const uploadPayload = new FormData();
    uploadPayload.append("file", new Blob([await file.arrayBuffer()], { type: file.type }), safeDisplayName);
    uploadPayload.append("api_key", cloudinary.apiKey);
    uploadPayload.append("folder", cloudinary.uploadFolder);
    uploadPayload.append("public_id", publicId);
    uploadPayload.append("resource_type", "raw");
    uploadPayload.append("signature", signature);
    uploadPayload.append("tags", tags);
    uploadPayload.append("timestamp", timestamp);
    uploadPayload.append("type", "private");
    uploadPayload.append("use_filename_as_display_name", "true");

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/raw/upload`, {
      method: "POST",
      body: uploadPayload,
      cache: "no-store",
    });

    const payload = await response.json() as {
      error?: { message?: string };
      secure_url?: string;
    };

    if (!response.ok || !payload.secure_url) {
      const message = payload.error?.message || "Cloudinary upload failed.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    return NextResponse.json({
      file: {
        name: safeDisplayName,
        url: createCloudinaryPrivateReference(publicId),
      },
      provider: "cloudinary",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cloudinary backup upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
