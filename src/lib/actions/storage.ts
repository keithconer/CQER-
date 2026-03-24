"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generates a signed URL for a private storage file using the admin client.
 * This bypasses RLS and will always work as long as the bucket and path are valid.
 */
export async function getSignedStorageUrl(bucket: string, path: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      console.error("Error generating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error("Unexpected error generating signed URL:", err);
    return null;
  }
}
