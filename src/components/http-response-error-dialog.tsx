"use client";

import Image from "next/image";
import { AlertTriangle, ServerCrash, Wrench } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HttpResponseErrorPayload } from "@/lib/http-response-error";

const toneConfig = {
  client: {
    label: "Client Response",
    icon: AlertTriangle,
  },
  development: {
    label: "Under Development",
    icon: Wrench,
  },
  server: {
    label: "Server Response",
    icon: ServerCrash,
  },
} as const;

export function HttpResponseErrorDialog({
  error,
  open,
  onOpenChange,
  onRetry,
}: {
  error: HttpResponseErrorPayload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry?: () => void;
}) {
  const tone = error ? toneConfig[error.tone] : null;
  const ToneIcon = tone?.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden border-border/60 p-0 sm:max-w-3xl">
        {error ? (
          <div className="grid gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
            <div className="relative min-h-56 border-b border-border/50 bg-muted/20 md:min-h-full md:border-b-0 md:border-r">
              <Image
                src={error.imageSrc}
                alt={error.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 280px"
                priority={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
            </div>

            <div className="flex flex-col">
              <DialogHeader className="space-y-3 border-b border-border/50 px-6 py-6 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "gap-1 rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-[10px] font-medium"
                    )}
                  >
                    {ToneIcon ? <ToneIcon className="h-3 w-3" /> : null}
                    {tone?.label}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-[10px] font-medium"
                  >
                    HTTP {error.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-base font-semibold">{error.title}</DialogTitle>
                  <DialogDescription className="text-xs leading-5 text-muted-foreground">
                    {error.description}
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="space-y-4 px-6 py-6">
                <Card className="border-border/60 bg-muted/15 shadow-none">
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Response
                    </p>
                    <p className="text-sm leading-6 text-foreground">{error.error}</p>
                  </CardContent>
                </Card>

                <p className="text-[11px] leading-5 text-muted-foreground">
                  Review the response above, then retry once the request details or service state have been corrected.
                </p>
              </div>

              <DialogFooter className="border-t border-border/50 px-6 py-4 sm:justify-between">
                {onRetry ? (
                  <Button type="button" variant="outline" onClick={onRetry}>
                    Retry
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="button" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
