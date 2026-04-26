"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export const RECORDS_PER_PAGE = 10;

export function useRecordPagination<T>(items: T[], pageSize = RECORDS_PER_PAGE) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;

  const paginatedItems = React.useMemo(
    () => items.slice(startIndex, startIndex + pageSize),
    [items, pageSize, startIndex]
  );

  React.useEffect(() => {
    setCurrentPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  const resetPagination = React.useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    pageSize,
    paginatedItems,
    resetPagination,
    setCurrentPage,
    startIndex,
    totalPages,
  };
}

interface RecordPaginationProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  totalItems: number;
  pageSize?: number;
  itemLabel: string;
  align?: "between" | "right";
  onPageChange: (page: number | ((page: number) => number)) => void;
}

export function RecordPagination({
  currentPage,
  totalPages,
  startIndex,
  totalItems,
  pageSize = RECORDS_PER_PAGE,
  itemLabel,
  align = "between",
  onPageChange,
}: RecordPaginationProps) {
  if (totalItems <= pageSize) return null;

  return (
    <div className={`flex items-center gap-2 px-2 pt-2 ${align === "right" ? "justify-end" : "justify-between"}`}>
      {align !== "right" ? (
        <p className="text-[10px] text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(startIndex + pageSize, totalItems)} of {totalItems} {itemLabel}
        </p>
      ) : null}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 border-border/50"
          onClick={() => onPageChange((page) => Math.max(1, page - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <span className="px-2 text-[10px] font-medium">Page {currentPage} of {totalPages}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 border-border/50"
          onClick={() => onPageChange((page) => Math.min(totalPages, page + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
