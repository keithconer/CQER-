"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";
import {
  fetchDepartmentDirectory,
  getFallbackDepartmentDirectory,
  type DepartmentOption,
} from "@/lib/departments";

export function useDepartmentDirectory(initialDirectory?: DepartmentOption[]) {
  const [directory, setDirectory] = React.useState<DepartmentOption[]>(
    initialDirectory && initialDirectory.length > 0
      ? initialDirectory
      : getFallbackDepartmentDirectory()
  );
  const [loading, setLoading] = React.useState(!initialDirectory?.length);

  React.useEffect(() => {
    let cancelled = false;

    async function loadDirectory() {
      setLoading(true);
      const supabase = createClient();
      const nextDirectory = await fetchDepartmentDirectory(
        supabase as unknown as Parameters<typeof fetchDepartmentDirectory>[0]
      );

      if (!cancelled) {
        setDirectory(nextDirectory);
        setLoading(false);
      }
    }

    void loadDirectory();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    directory,
    setDirectory,
    loading,
  };
}
