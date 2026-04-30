"use server";

import { getCloudinaryConfig, signCloudinaryParams } from "@/lib/cloudinary";
import {
  getCloudinaryPublicId,
  getFileExtension,
  isCloudinaryPrivateReference,
} from "@/lib/document-uploads";

export async function getCloudinaryDownloadUrl(reference: string): Promise<string | null> {
  try {
    const publicId = getCloudinaryPublicId(reference);
    if (!publicId) return null;

    const extension = getFileExtension(publicId);
    if (!extension) return null;

    const basename = publicId.slice(0, -extension.length);
    const format = extension.slice(1);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const expiresAt = String(Math.floor(Date.now() / 1000) + 3600);
    const params = {
      expires_at: expiresAt,
      format,
      public_id: basename,
      timestamp,
      type: isCloudinaryPrivateReference(reference) ? "private" : "upload",
    };

    const signature = signCloudinaryParams(params);
    const { apiKey, cloudName } = getCloudinaryConfig();
    const url = new URL(`https://api.cloudinary.com/v1_1/${cloudName}/raw/download`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("expires_at", expiresAt);
    url.searchParams.set("format", format);
    url.searchParams.set("public_id", basename);
    url.searchParams.set("resource_type", "raw");
    url.searchParams.set("signature", signature);
    url.searchParams.set("timestamp", timestamp);
    url.searchParams.set("type", params.type);
    return url.toString();
  } catch (error) {
    console.error("Error generating Cloudinary download URL:", error);
    return null;
  }
}
