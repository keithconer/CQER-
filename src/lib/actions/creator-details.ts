"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface CreatorProfileFields {
  created_by_name?: string | null;
  created_by_avatar_url?: string | null;
  creator_full_name?: string | null;
  creator_avatar_url?: string | null;
  creator_user_type?: string | null;
}

export async function attachCreatorProfiles<T extends { created_by?: string | null }>(
  adminClient: ReturnType<typeof createAdminClient>,
  records: T[]
): Promise<Array<T & CreatorProfileFields>> {
  if (records.length === 0) return [];

  const creatorIds = Array.from(
    new Set(records.map((record) => String(record.created_by || "")).filter(Boolean))
  );

  if (creatorIds.length === 0) {
    return records.map((record) => ({
      ...record,
      created_by_name: null,
      created_by_avatar_url: null,
      creator_full_name: null,
      creator_avatar_url: null,
      creator_user_type: null,
    }));
  }

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, user_type")
    .in("id", creatorIds);

  const profileMap = new Map(
    (profiles || []).map((profile) => {
      const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
      return [
        profile.id,
        {
          name: fullName || null,
          avatarUrl: profile.avatar_url || null,
          userType: profile.user_type || null,
        },
      ];
    })
  );

  return records.map((record) => {
    const creator = record.created_by ? profileMap.get(record.created_by) : null;
    return {
      ...record,
      created_by_name: creator?.name || null,
      created_by_avatar_url: creator?.avatarUrl || null,
      creator_full_name: creator?.name || null,
      creator_avatar_url: creator?.avatarUrl || null,
      creator_user_type: creator?.userType || null,
    };
  });
}
